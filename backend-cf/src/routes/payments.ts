import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateId } from '../utils/crypto';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// POST /payments/initiate
app.post('/initiate', async (c) => {
	const body = await c.req.json();
	const { order_id, payment_method, customer_info } = body;

	if (!order_id || !payment_method) {
		return c.json({ detail: 'order_id and payment_method are required' }, 400);
	}

	try {
		const order = await c.env.DB.prepare(
			'SELECT * FROM orders WHERE id = ?'
		).bind(order_id).first();

		if (!order) return c.json({ detail: 'Order not found' }, 404);
		if (order.payment_status === 'paid') return c.json({ detail: 'Order already paid' }, 400);

		const payment_id = generateId();
		const now = new Date().toISOString();
		const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

		let response: any;

		if (payment_method === 'cash') {
			await c.env.DB.prepare(
				'INSERT INTO payments (id, store_id, order_id, amount, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
			).bind(payment_id, order.store_id, order_id, order.total, 'cash', 'pending', now).run();

			response = {
				payment_id,
				order_id,
				status: 'pending',
				amount: order.total,
				payment_method: 'cash',
				requires_confirmation: true,
				message: 'Vui lòng thanh toán tiền mặt tại quầy. Nhân viên sẽ xác nhận thanh toán.',
			};
		} else if (payment_method === 'bank_qr') {
			const pm = await c.env.DB.prepare(
				"SELECT * FROM payment_methods WHERE store_id = ? AND type = 'bank_qr' AND is_active = 1"
			).bind(order.store_id).first();

			if (!pm) return c.json({ detail: 'Bank QR payment method not configured or disabled' }, 400);

			const config = JSON.parse(pm.config as string || '{}');
			if (!config.bank_name || !config.bank_bin || !config.account_number || !config.account_name) {
				return c.json({ detail: 'Bank QR payment method not fully configured' }, 400);
			}

			const payment_content = `MINITAKE ${payment_id.slice(0, 8).toUpperCase()}`;
			const amount = Math.floor(order.total as number);
			const qr_code_url = `https://img.vietqr.io/image/${config.bank_bin}-${config.account_number}-compact2.jpg?amount=${amount}&addInfo=${payment_content}&accountName=${config.account_name}`;

			await c.env.DB.prepare(
				'INSERT INTO payments (id, store_id, order_id, amount, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
			).bind(payment_id, order.store_id, order_id, order.total, 'bank_qr', 'pending', now).run();

			response = {
				payment_id,
				order_id,
				status: 'pending',
				amount: order.total,
				payment_method: 'bank_qr',
				qr_code_url,
				expires_at,
				bank_info: {
					bank_name: config.bank_name,
					account_number: config.account_number,
					account_name: config.account_name,
					content: payment_content,
				},
				message: 'Quét mã QR bằng ứng dụng ngân hàng để thanh toán',
			};
		} else {
			return c.json({ detail: `Payment method ${payment_method} not supported` }, 400);
		}

		await c.env.DB.prepare(
			"UPDATE orders SET payment_status = 'processing' WHERE id = ?"
		).bind(order_id).run();

		return c.json(response);
	} catch (e: any) {
		return c.json({ detail: e.message || 'Payment initiation failed' }, 500);
	}
});

// GET /payments/:payment_id
app.get('/:payment_id', authMiddleware, async (c) => {
	const user = c.get('user');
	const payment_id = c.req.param('payment_id');

	const payment = await c.env.DB.prepare(
		'SELECT * FROM payments WHERE id = ? AND store_id = ?'
	).bind(payment_id, user.store_id).first();

	if (!payment) return c.json({ detail: 'Payment not found' }, 404);
	return c.json(payment);
});

// GET /payments/:payment_id/poll
app.get('/:payment_id/poll', async (c) => {
	const payment_id = c.req.param('payment_id');

	const payment = await c.env.DB.prepare(
		'SELECT * FROM payments WHERE id = ?'
	).bind(payment_id).first();

	if (!payment) return c.json({ detail: 'Payment not found' }, 404);

	let status = payment.status as string;

	if (status === 'pending') {
		const expires_at = payment.created_at ? new Date(new Date(payment.created_at as string).getTime() + 15 * 60 * 1000) : null;
		if (expires_at && new Date() > expires_at) {
			await c.env.DB.prepare("UPDATE payments SET status = 'expired' WHERE id = ?").bind(payment_id).run();
			status = 'expired';
		} else {
			const order = await c.env.DB.prepare('SELECT payment_status FROM orders WHERE id = ?').bind(payment.order_id).first();
			if (order && order.payment_status === 'paid') {
				const now = new Date().toISOString();
				await c.env.DB.prepare("UPDATE payments SET status = 'paid', transaction_id = ? WHERE id = ?").bind(now, payment_id).run();
				status = 'paid';
			}
		}
	}

	return c.json({ status, paid_at: status === 'paid' ? payment.transaction_id : null });
});

// POST /payments/:payment_id/confirm
app.post('/:payment_id/confirm', authMiddleware, async (c) => {
	const user = c.get('user');
	const payment_id = c.req.param('payment_id');
	const body = await c.req.json().catch(() => ({}));

	const payment = await c.env.DB.prepare(
		'SELECT * FROM payments WHERE id = ? AND store_id = ?'
	).bind(payment_id, user.store_id).first();

	if (!payment) return c.json({ detail: 'Payment not found' }, 404);
	if (payment.status !== 'pending') return c.json({ detail: 'Payment already processed' }, 400);

	const now = new Date().toISOString();

	await c.env.DB.prepare(
		"UPDATE payments SET status = 'paid', transaction_id = ? WHERE id = ?"
	).bind(now, payment_id).run();

	await c.env.DB.prepare(
		"UPDATE orders SET payment_status = 'paid', status = 'completed' WHERE id = ?"
	).bind(payment.order_id).run();

	return c.json({ payment_id, status: 'paid', confirmed_by: user.id });
});

// GET /payments
app.get('/', authMiddleware, async (c) => {
	const user = c.get('user');

	const { results } = await c.env.DB.prepare(
		'SELECT * FROM payments WHERE store_id = ? ORDER BY created_at DESC'
	).bind(user.store_id).all();

	return c.json(results || []);
});

// POST /webhooks/bank-transfer
app.post('/webhooks/bank-transfer', async (c) => {
	try {
		const webhook_data = await c.req.json();
		const transaction_id = webhook_data.id;
		const amount = webhook_data.amount;
		const description = (webhook_data.description || '').toUpperCase();

		const match = description.match(/MINITAKE\s+([A-Z0-9]{8})/);
		if (!match) return c.json({ status: 'ignored', reason: 'No payment ID found in description' });

		const prefix = match[1].toLowerCase();

		const { results } = await c.env.DB.prepare(
			"SELECT * FROM payments WHERE id LIKE ? AND method = 'bank_qr' AND status = 'pending'"
		).bind(`${prefix}%`).all();

		const payment = results?.[0];
		if (!payment) return c.json({ status: 'ignored', reason: 'No matching pending payment found' });

		if (Math.floor(amount) !== Math.floor(payment.amount as number)) {
			return c.json({ status: 'failed', reason: `Amount mismatch. Expected ${payment.amount}, got ${amount}` });
		}

		const now = new Date().toISOString();
		await c.env.DB.prepare(
			"UPDATE payments SET status = 'paid', transaction_id = ? WHERE id = ?"
		).bind(transaction_id || now, payment.id).run();

		await c.env.DB.prepare(
			"UPDATE orders SET payment_status = 'paid', status = 'completed' WHERE id = ?"
		).bind(payment.order_id).run();

		return c.json({ status: 'success', payment_id: payment.id, order_id: payment.order_id });
	} catch (e: any) {
		return c.json({ detail: e.message || 'Webhook processing failed' }, 500);
	}
});

// POST /webhooks/test-payment
app.post('/webhooks/test-payment', authMiddleware, async (c) => {
	const user = c.get('user');
	const body = await c.req.json();
	const { payment_id } = body;

	if (!payment_id) return c.json({ detail: 'payment_id is required' }, 400);

	const payment = await c.env.DB.prepare(
		'SELECT * FROM payments WHERE id = ? AND store_id = ?'
	).bind(payment_id, user.store_id).first();

	if (!payment) return c.json({ detail: 'Payment not found' }, 404);

	const now = new Date().toISOString();
	await c.env.DB.prepare(
		"UPDATE payments SET status = 'paid', transaction_id = ? WHERE id = ?"
	).bind(now, payment_id).run();

	await c.env.DB.prepare(
		"UPDATE orders SET payment_status = 'paid', status = 'completed' WHERE id = ?"
	).bind(payment.order_id).run();

	return c.json({ status: 'success', payment_id, order_id: payment.order_id });
});

// GET /payment-methods
app.get('/methods', authMiddleware, async (c) => {
	const user = c.get('user');

	const { results } = await c.env.DB.prepare(
		'SELECT * FROM payment_methods WHERE store_id = ? ORDER BY created_at DESC'
	).bind(user.store_id).all();

	const methods = (results || []).map((m: any) => ({
		...m,
		config: m.config ? JSON.parse(m.config) : {},
		is_active: !!m.is_active,
	}));

	return c.json(methods);
});

// PUT /payment-methods/:method_id
app.put('/methods/:method_id', authMiddleware, async (c) => {
	const user = c.get('user');
	const method_id = c.req.param('method_id');
	const body = await c.req.json();

	const existing = await c.env.DB.prepare(
		'SELECT * FROM payment_methods WHERE id = ? AND store_id = ?'
	).bind(method_id, user.store_id).first();

	if (!existing) return c.json({ detail: 'Payment method not found' }, 404);

	const updates: string[] = [];
	const values: any[] = [];

	if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
	if (body.config !== undefined) { updates.push('config = ?'); values.push(JSON.stringify(body.config)); }
	if (body.is_active !== undefined) { updates.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }

	if (updates.length === 0) return c.json({ detail: 'No data to update' }, 400);

	values.push(method_id, user.store_id);
	await c.env.DB.prepare(
		`UPDATE payment_methods SET ${updates.join(', ')} WHERE id = ? AND store_id = ?`
	).bind(...values).run();

	const updated = await c.env.DB.prepare(
		'SELECT * FROM payment_methods WHERE id = ?'
	).bind(method_id).first();

	return c.json({
		...updated,
		config: updated?.config ? JSON.parse(updated.config as string) : {},
		is_active: !!updated?.is_active,
	});
});

export default app;
