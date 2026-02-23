import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateId } from '../utils/crypto';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// ============ PUBLIC ROUTES ============

// GET /public/menu/:store_slug
app.get('/public/:store_slug/menu', async (c) => {
	const storeSlug = c.req.param('store_slug');
	const env = c.env;

	const store = await env.DB.prepare('SELECT * FROM stores WHERE slug = ?').bind(storeSlug).first();
	if (!store) return c.json({ detail: 'Store not found' }, 404);

	const categories = await env.DB.prepare(
		'SELECT * FROM categories WHERE store_id = ? ORDER BY display_order ASC'
	).bind(store.id).all();

	const menuItems = await env.DB.prepare(
		'SELECT * FROM menu_items WHERE store_id = ? AND is_available = 1'
	).bind(store.id).all();

	// Apply active promotions
	const now = new Date().toISOString();
	const promotions = await env.DB.prepare(
		'SELECT * FROM promotions WHERE store_id = ? AND is_active = 1 AND start_date <= ? AND end_date >= ?'
	).bind(store.id, now, now).all();

	const items = (menuItems.results || []).map((item: any) => {
		if (!promotions.results || promotions.results.length === 0) {
			item.original_price = null;
			item.discounted_price = null;
			item.has_promotion = false;
			item.promotion_label = null;
			return item;
		}

		let bestDiscount = 0;
		let bestPromotion: any = null;

		for (const promo of promotions.results as any[]) {
			let applies = false;
			const applicableItems = promo.applicable_items ? JSON.parse(promo.applicable_items) : {};

			if (applicableItems.apply_to === 'all') {
				applies = true;
			} else if (applicableItems.apply_to === 'category' && (applicableItems.category_ids || []).includes(item.category_id)) {
				applies = true;
			} else if (applicableItems.apply_to === 'items' && (applicableItems.item_ids || []).includes(item.id)) {
				applies = true;
			}

			if (applies) {
				let discount = 0;
				if (promo.discount_type === 'percentage') {
					discount = (item.price as number) * (promo.discount_value as number) / 100;
					if (promo.max_discount && discount > (promo.max_discount as number)) {
						discount = promo.max_discount as number;
					}
				} else if (promo.discount_type === 'fixed_amount') {
					discount = promo.discount_value as number;
				}

				if (discount > bestDiscount) {
					bestDiscount = discount;
					bestPromotion = promo;
				}
			}
		}

		if (bestPromotion) {
			item.original_price = item.price;
			item.discounted_price = Math.max(0, (item.price as number) - bestDiscount);
			item.has_promotion = true;
			if (bestPromotion.discount_type === 'percentage') {
				item.promotion_label = `Giảm ${Math.floor(bestPromotion.discount_value)}%`;
			} else {
				item.promotion_label = `Giảm ${Math.floor(bestDiscount).toLocaleString()}đ`;
			}
		} else {
			item.original_price = null;
			item.discounted_price = null;
			item.has_promotion = false;
			item.promotion_label = null;
		}

		return item;
	});

	return c.json({
		store,
		categories: categories.results || [],
		menu_items: items,
	});
});

// POST /public/orders
app.post('/public/orders', async (c) => {
	const body = await c.req.json();
	const { store_slug, table_number, customer_name, customer_phone, items, note } = body;
	const env = c.env;

	if (!store_slug) return c.json({ detail: 'store_slug is required' }, 400);

	const store = await env.DB.prepare('SELECT * FROM stores WHERE slug = ?').bind(store_slug).first();
	if (!store) return c.json({ detail: 'Store not found' }, 404);

	if (!items || !Array.isArray(items) || items.length === 0) {
		return c.json({ detail: 'Order must have at least one item' }, 400);
	}

	const total = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
	const orderId = generateId();
	const now = new Date().toISOString();

	await env.DB.prepare(
		`INSERT INTO orders (id, store_id, table_number, customer_name, customer_phone, items, total, status, payment_status, note, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(
		orderId,
		store.id,
		table_number || '',
		customer_name || '',
		customer_phone || '',
		JSON.stringify(items),
		total,
		'pending',
		'pending',
		note || '',
		now,
		now
	).run();

	// Auto-deduct inventory (best effort)
	try {
		for (const orderItem of items) {
			const inventory = await env.DB.prepare(
				'SELECT * FROM dish_inventory WHERE store_id = ? AND menu_item_id = (SELECT id FROM menu_items WHERE store_id = ? AND name = ? LIMIT 1)'
			).bind(store.id, store.id, orderItem.name).first();

			if (!inventory) continue;

			const currentStock = inventory.quantity as number;
			const qtyToDeduct = Math.min(orderItem.quantity, currentStock);
			const newStock = Math.max(0, currentStock - qtyToDeduct);

			await env.DB.prepare(
				'UPDATE dish_inventory SET quantity = ?, updated_at = ? WHERE id = ?'
			).bind(newStock, now, inventory.id).run();

			await env.DB.prepare(
				'INSERT INTO inventory_history (id, store_id, menu_item_id, change_amount, reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
			).bind(
				generateId(),
				store.id as string,
				inventory.menu_item_id as string,
				-qtyToDeduct,
				`Bán hàng - Đơn hàng #${orderId.slice(0, 8)}`,
				'customer',
				now
			).run();
		}
	} catch (_e) {
		// Don't fail order creation on inventory error
	}

	const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
	return c.json(order, 201);
});

// GET /public/orders/:order_id
app.get('/public/orders/:order_id', async (c) => {
	const orderId = c.req.param('order_id');
	const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
	if (!order) return c.json({ detail: 'Order not found' }, 404);
	return c.json(order);
});

// ============ AUTHENTICATED ROUTES ============

// GET /orders
app.get('/orders', authMiddleware, async (c) => {
	const user = c.get('user');
	const status = c.req.query('status');
	const limit = parseInt(c.req.query('limit') || '50');
	const offset = parseInt(c.req.query('offset') || '0');

	let sql = 'SELECT * FROM orders WHERE store_id = ?';
	const params: any[] = [user.store_id];

	if (status) {
		sql += ' AND status = ?';
		params.push(status);
	}

	sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
	params.push(limit, offset);

	const orders = await c.env.DB.prepare(sql).bind(...params).all();
	return c.json(orders.results || []);
});

// PUT /orders/:id/status
app.put('/orders/:id/status', authMiddleware, async (c) => {
	const user = c.get('user');
	const orderId = c.req.param('id');
	const body = await c.req.json();
	const { status, payment_status } = body;

	const order = await c.env.DB.prepare(
		'SELECT * FROM orders WHERE id = ? AND store_id = ?'
	).bind(orderId, user.store_id).first();

	if (!order) return c.json({ detail: 'Order not found' }, 404);

	const updates: string[] = [];
	const values: any[] = [];

	if (status) {
		updates.push('status = ?');
		values.push(status);
	}
	if (payment_status) {
		updates.push('payment_status = ?');
		values.push(payment_status);
	}

	if (updates.length === 0) {
		return c.json({ detail: 'No fields to update' }, 400);
	}

	updates.push('updated_at = ?');
	values.push(new Date().toISOString());
	values.push(orderId, user.store_id);

	await c.env.DB.prepare(
		`UPDATE orders SET ${updates.join(', ')} WHERE id = ? AND store_id = ?`
	).bind(...values).run();

	const updated = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
	return c.json(updated);
});

// ============ TABLE ROUTES ============

// GET /tables
app.get('/tables', authMiddleware, async (c) => {
	const user = c.get('user');
	const store = await c.env.DB.prepare('SELECT slug FROM stores WHERE id = ?').bind(user.store_id).first();
	const frontendUrl = c.req.header('x-frontend-url') || c.env.FRONTEND_URL;

	const tables = await c.env.DB.prepare(
		'SELECT * FROM tables WHERE store_id = ? ORDER BY table_number ASC'
	).bind(user.store_id).all();

	// Ensure qr_code_url is set for all tables
	const results = (tables.results || []).map((t: any) => ({
		...t,
		qr_code_url: t.qr_code_url || `${frontendUrl}/menu/${store?.slug || ''}?table=${t.id}`,
	}));

	return c.json(results);
});

// GET /tables/:id - Public table info (for QR code scanning)
app.get('/tables/:id', async (c) => {
	const tableId = c.req.param('id');
	const table = await c.env.DB.prepare('SELECT * FROM tables WHERE id = ?').bind(tableId).first();
	if (!table) return c.json({ detail: 'Table not found' }, 404);

	const store = await c.env.DB.prepare('SELECT slug FROM stores WHERE id = ?').bind(table.store_id).first();
	const frontendUrl = c.req.header('x-frontend-url') || c.env.FRONTEND_URL;
	return c.json({
		...table,
		qr_code_url: table.qr_code_url || `${frontendUrl}/menu/${store?.slug || ''}?table=${table.id}`,
	});
});

// POST /tables
app.post('/tables', authMiddleware, async (c) => {
	const user = c.get('user');
	const body = await c.req.json();
	const { table_number, capacity, qr_code_url } = body;

	if (!table_number) {
		return c.json({ detail: 'table_number is required' }, 400);
	}

	// Check max tables limit
	const store = await c.env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(user.store_id).first();
	if (store && store.max_tables) {
		const countResult = await c.env.DB.prepare(
			'SELECT COUNT(*) as cnt FROM tables WHERE store_id = ?'
		).bind(user.store_id).first();
		if (countResult && (countResult.cnt as number) >= (store.max_tables as number)) {
			return c.json({ detail: `Maximum number of tables (${store.max_tables}) reached for your plan` }, 400);
		}
	}

	// Check duplicate table number
	const existing = await c.env.DB.prepare(
		'SELECT id FROM tables WHERE store_id = ? AND table_number = ?'
	).bind(user.store_id, table_number).first();
	if (existing) {
		return c.json({ detail: 'Table number already exists' }, 400);
	}

	const tableId = generateId();
	const now = new Date().toISOString();

	// Generate QR code URL using store slug
	const frontendUrl = c.req.header('x-frontend-url') || c.env.FRONTEND_URL;
	const storeSlug = store?.slug || '';
	const generatedQrUrl = qr_code_url || `${frontendUrl}/menu/${storeSlug}?table=${tableId}`;

	await c.env.DB.prepare(
		`INSERT INTO tables (id, store_id, table_number, capacity, qr_code_url, status, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).bind(
		tableId,
		user.store_id,
		table_number,
		capacity || 4,
		generatedQrUrl,
		'available',
		now
	).run();

	const table = await c.env.DB.prepare('SELECT * FROM tables WHERE id = ?').bind(tableId).first();
	return c.json(table, 201);
});

// PUT /tables/:id
app.put('/tables/:id', authMiddleware, async (c) => {
	const user = c.get('user');
	const tableId = c.req.param('id');
	const body = await c.req.json();

	const existing = await c.env.DB.prepare(
		'SELECT * FROM tables WHERE id = ? AND store_id = ?'
	).bind(tableId, user.store_id).first();
	if (!existing) return c.json({ detail: 'Table not found' }, 404);

	const updates: string[] = [];
	const values: any[] = [];

	for (const field of ['table_number', 'capacity', 'qr_code_url', 'status']) {
		if (body[field] !== undefined) {
			updates.push(`${field} = ?`);
			values.push(body[field]);
		}
	}

	if (updates.length === 0) {
		return c.json({ detail: 'No fields to update' }, 400);
	}

	values.push(tableId, user.store_id);

	await c.env.DB.prepare(
		`UPDATE tables SET ${updates.join(', ')} WHERE id = ? AND store_id = ?`
	).bind(...values).run();

	const table = await c.env.DB.prepare('SELECT * FROM tables WHERE id = ?').bind(tableId).first();
	return c.json(table);
});

// DELETE /tables/:id
app.delete('/tables/:id', authMiddleware, async (c) => {
	const user = c.get('user');
	const tableId = c.req.param('id');

	const result = await c.env.DB.prepare(
		'DELETE FROM tables WHERE id = ? AND store_id = ?'
	).bind(tableId, user.store_id).run();

	if (!result.meta.changes) {
		return c.json({ detail: 'Table not found' }, 404);
	}

	return c.json({ message: 'Table deleted' });
});

export default app;
