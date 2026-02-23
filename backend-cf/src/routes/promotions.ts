import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateId } from '../utils/crypto';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

function formatPromotion(p: any) {
	return {
		...p,
		category_ids: p.category_ids ? JSON.parse(p.category_ids) : [],
		item_ids: p.item_ids ? JSON.parse(p.item_ids) : [],
		is_active: !!p.is_active,
	};
}

// GET /promotions
app.get('/', authMiddleware, async (c) => {
	const user = c.get('user');
	const { results } = await c.env.DB.prepare(
		'SELECT * FROM promotions WHERE store_id = ? ORDER BY created_at DESC'
	).bind(user.store_id).all();
	return c.json((results || []).map(formatPromotion));
});

// GET /promotions/active
app.get('/active', authMiddleware, async (c) => {
	const user = c.get('user');
	const now = new Date().toISOString();
	const { results } = await c.env.DB.prepare(
		'SELECT * FROM promotions WHERE store_id = ? AND is_active = 1 AND start_date <= ? AND end_date >= ? ORDER BY created_at DESC'
	).bind(user.store_id, now, now).all();
	return c.json((results || []).map(formatPromotion));
});

// POST /promotions
app.post('/', authMiddleware, async (c) => {
	const user = c.get('user');
	const body = await c.req.json();
	const id = generateId();
	const now = new Date().toISOString();

	await c.env.DB.prepare(
		`INSERT INTO promotions (id, store_id, name, promotion_type, discount_value, max_discount_amount, apply_to, category_ids, item_ids, start_date, end_date, is_active, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(
		id, user.store_id,
		body.name || '',
		body.promotion_type || 'percentage',
		body.discount_value || 0,
		body.max_discount_amount || null,
		body.apply_to || 'all',
		JSON.stringify(body.category_ids || []),
		JSON.stringify(body.item_ids || []),
		body.start_date || now,
		body.end_date || now,
		body.is_active !== false ? 1 : 0,
		now
	).run();

	const promo = await c.env.DB.prepare('SELECT * FROM promotions WHERE id = ?').bind(id).first();
	return c.json(formatPromotion(promo), 201);
});

// PUT /promotions/:promotion_id
app.put('/:promotion_id', authMiddleware, async (c) => {
	const user = c.get('user');
	const promoId = c.req.param('promotion_id');
	const body = await c.req.json();

	const existing = await c.env.DB.prepare(
		'SELECT * FROM promotions WHERE id = ? AND store_id = ?'
	).bind(promoId, user.store_id).first();
	if (!existing) return c.json({ detail: 'Promotion not found' }, 404);

	const updates: string[] = [];
	const values: any[] = [];

	for (const col of ['name', 'promotion_type', 'discount_value', 'max_discount_amount', 'apply_to', 'start_date', 'end_date']) {
		if (body[col] !== undefined) { updates.push(`${col} = ?`); values.push(body[col]); }
	}
	if (body.is_active !== undefined) { updates.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }
	if (body.category_ids !== undefined) { updates.push('category_ids = ?'); values.push(JSON.stringify(body.category_ids)); }
	if (body.item_ids !== undefined) { updates.push('item_ids = ?'); values.push(JSON.stringify(body.item_ids)); }

	if (updates.length === 0) return c.json(formatPromotion(existing));

	values.push(promoId);
	await c.env.DB.prepare(`UPDATE promotions SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
	const updated = await c.env.DB.prepare('SELECT * FROM promotions WHERE id = ?').bind(promoId).first();
	return c.json(formatPromotion(updated));
});

// DELETE /promotions/:promotion_id
app.delete('/:promotion_id', authMiddleware, async (c) => {
	const user = c.get('user');
	const promoId = c.req.param('promotion_id');
	const result = await c.env.DB.prepare('DELETE FROM promotions WHERE id = ? AND store_id = ?').bind(promoId, user.store_id).run();
	if (!result.meta.changes) return c.json({ detail: 'Promotion not found' }, 404);
	return c.json({ message: 'Promotion deleted' });
});

export default app;
