import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateId } from '../utils/crypto';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /promotions
app.get('/', authMiddleware, async (c) => {
	const user = c.get('user');

	const { results } = await c.env.DB.prepare(
		'SELECT * FROM promotions WHERE store_id = ? ORDER BY created_at DESC'
	).bind(user.store_id).all();

	const promotions = (results || []).map((p: any) => ({
		...p,
		applicable_items: p.applicable_items ? JSON.parse(p.applicable_items) : [],
		is_active: !!p.is_active,
	}));

	return c.json(promotions);
});

// GET /promotions/active
app.get('/active', authMiddleware, async (c) => {
	const user = c.get('user');
	const now = new Date().toISOString();

	const { results } = await c.env.DB.prepare(
		'SELECT * FROM promotions WHERE store_id = ? AND is_active = 1 AND start_date <= ? AND end_date >= ? ORDER BY created_at DESC'
	).bind(user.store_id, now, now).all();

	const promotions = (results || []).map((p: any) => ({
		...p,
		applicable_items: p.applicable_items ? JSON.parse(p.applicable_items) : [],
		is_active: !!p.is_active,
	}));

	return c.json(promotions);
});

// POST /promotions
app.post('/', authMiddleware, async (c) => {
	const user = c.get('user');
	const body = await c.req.json();

	const id = generateId();
	const now = new Date().toISOString();

	await c.env.DB.prepare(
		`INSERT INTO promotions (id, store_id, name, description, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, is_active, applicable_items, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(
		id,
		user.store_id,
		body.name || '',
		body.description || '',
		body.discount_type || 'percentage',
		body.discount_value || 0,
		body.min_order_value || 0,
		body.max_discount || 0,
		body.start_date || now,
		body.end_date || now,
		body.is_active !== false ? 1 : 0,
		JSON.stringify(body.applicable_items || []),
		now
	).run();

	const promotion = await c.env.DB.prepare('SELECT * FROM promotions WHERE id = ?').bind(id).first();

	return c.json({
		...promotion,
		applicable_items: promotion?.applicable_items ? JSON.parse(promotion.applicable_items as string) : [],
		is_active: !!promotion?.is_active,
	}, 201);
});

// PUT /promotions/:promotion_id
app.put('/:promotion_id', authMiddleware, async (c) => {
	const user = c.get('user');
	const promotion_id = c.req.param('promotion_id');
	const body = await c.req.json();

	const existing = await c.env.DB.prepare(
		'SELECT * FROM promotions WHERE id = ? AND store_id = ?'
	).bind(promotion_id, user.store_id).first();

	if (!existing) return c.json({ detail: 'Promotion not found' }, 404);

	const updates: string[] = [];
	const values: any[] = [];

	const fields: Record<string, string> = {
		name: 'name', description: 'description', discount_type: 'discount_type',
		discount_value: 'discount_value', min_order_value: 'min_order_value',
		max_discount: 'max_discount', start_date: 'start_date', end_date: 'end_date',
	};

	for (const [key, col] of Object.entries(fields)) {
		if (body[key] !== undefined) { updates.push(`${col} = ?`); values.push(body[key]); }
	}
	if (body.is_active !== undefined) { updates.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }
	if (body.applicable_items !== undefined) { updates.push('applicable_items = ?'); values.push(JSON.stringify(body.applicable_items)); }

	if (updates.length === 0) return c.json({ detail: 'No data to update' }, 400);

	values.push(promotion_id, user.store_id);
	await c.env.DB.prepare(
		`UPDATE promotions SET ${updates.join(', ')} WHERE id = ? AND store_id = ?`
	).bind(...values).run();

	const updated = await c.env.DB.prepare('SELECT * FROM promotions WHERE id = ?').bind(promotion_id).first();

	return c.json({
		...updated,
		applicable_items: updated?.applicable_items ? JSON.parse(updated.applicable_items as string) : [],
		is_active: !!updated?.is_active,
	});
});

// DELETE /promotions/:promotion_id
app.delete('/:promotion_id', authMiddleware, async (c) => {
	const user = c.get('user');
	const promotion_id = c.req.param('promotion_id');

	const result = await c.env.DB.prepare(
		'DELETE FROM promotions WHERE id = ? AND store_id = ?'
	).bind(promotion_id, user.store_id).run();

	if (!result.meta.changes) return c.json({ detail: 'Promotion not found' }, 404);

	return c.json({ message: 'Promotion deleted' });
});

export default app;
