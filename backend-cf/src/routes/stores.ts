import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateId } from '../utils/crypto';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('/*', authMiddleware);

// GET /stores/me
app.get('/stores/me', async (c) => {
	const user = c.get('user');
	const store = await c.env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(user.store_id).first();
	if (!store) return c.json({ detail: 'Store not found' }, 404);
	return c.json(store);
});

// PUT /stores/me
app.put('/stores/me', async (c) => {
	const user = c.get('user');
	const body = await c.req.json();

	const allowedFields = ['name', 'logo', 'address', 'phone'];
	const updates: string[] = [];
	const values: any[] = [];

	for (const field of allowedFields) {
		if (body[field] !== undefined && body[field] !== null) {
			updates.push(`${field} = ?`);
			values.push(body[field]);
		}
	}

	if (updates.length === 0) {
		return c.json({ detail: 'No data to update' }, 400);
	}

	updates.push('updated_at = ?');
	values.push(new Date().toISOString());
	values.push(user.store_id);

	await c.env.DB.prepare(`UPDATE stores SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

	const store = await c.env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(user.store_id).first();
	return c.json(store);
});

// GET /categories
app.get('/categories', async (c) => {
	const user = c.get('user');
	const { results } = await c.env.DB.prepare(
		'SELECT * FROM categories WHERE store_id = ? ORDER BY display_order ASC'
	).bind(user.store_id).all();
	return c.json(results);
});

// POST /categories
app.post('/categories', async (c) => {
	const user = c.get('user');
	const body = await c.req.json();
	const id = generateId();
	const now = new Date().toISOString();

	await c.env.DB.prepare(
		'INSERT INTO categories (id, name, store_id, display_order, created_at) VALUES (?, ?, ?, ?, ?)'
	).bind(id, body.name, user.store_id, body.display_order || 0, now).run();

	const category = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first();
	return c.json(category, 201);
});

// PUT /categories/:id
app.put('/categories/:id', async (c) => {
	const user = c.get('user');
	const categoryId = c.req.param('id');
	const body = await c.req.json();

	const result = await c.env.DB.prepare(
		'UPDATE categories SET name = ?, display_order = ? WHERE id = ? AND store_id = ?'
	).bind(body.name, body.display_order || 0, categoryId, user.store_id).run();

	if (!result.meta.changes) return c.json({ detail: 'Category not found' }, 404);

	const category = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(categoryId).first();
	return c.json(category);
});

// DELETE /categories/:id
app.delete('/categories/:id', async (c) => {
	const user = c.get('user');
	const categoryId = c.req.param('id');

	const result = await c.env.DB.prepare(
		'DELETE FROM categories WHERE id = ? AND store_id = ?'
	).bind(categoryId, user.store_id).run();

	if (!result.meta.changes) return c.json({ detail: 'Category not found' }, 404);
	return c.json({ message: 'Category deleted' });
});

// GET /menu-items
app.get('/menu-items', async (c) => {
	const user = c.get('user');
	const { results } = await c.env.DB.prepare(
		'SELECT * FROM menu_items WHERE store_id = ?'
	).bind(user.store_id).all();

	const now = new Date().toISOString();
	const { results: promotions } = await c.env.DB.prepare(
		'SELECT * FROM promotions WHERE store_id = ? AND is_active = 1 AND start_date <= ? AND end_date >= ?'
	).bind(user.store_id, now, now).all();

	const items = applyPromotions(results, promotions);
	return c.json(items);
});

// POST /menu-items
app.post('/menu-items', async (c) => {
	const user = c.get('user');
	const body = await c.req.json();

	const category = await c.env.DB.prepare(
		'SELECT id FROM categories WHERE id = ? AND store_id = ?'
	).bind(body.category_id, user.store_id).first();
	if (!category) return c.json({ detail: 'Category not found' }, 404);

	const id = generateId();
	const now = new Date().toISOString();

	await c.env.DB.prepare(
		'INSERT INTO menu_items (id, name, description, price, category_id, store_id, image_url, is_available, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
	).bind(id, body.name, body.description || '', body.price, body.category_id, user.store_id, body.image_url || '', body.is_available !== undefined ? (body.is_available ? 1 : 0) : 1, now).run();

	const item = await c.env.DB.prepare('SELECT * FROM menu_items WHERE id = ?').bind(id).first();
	return c.json(item, 201);
});

// PUT /menu-items/:id
app.put('/menu-items/:id', async (c) => {
	const user = c.get('user');
	const itemId = c.req.param('id');
	const body = await c.req.json();

	const result = await c.env.DB.prepare(
		'UPDATE menu_items SET name = ?, description = ?, price = ?, category_id = ?, image_url = ?, is_available = ? WHERE id = ? AND store_id = ?'
	).bind(body.name, body.description || '', body.price, body.category_id, body.image_url || '', body.is_available !== undefined ? (body.is_available ? 1 : 0) : 1, itemId, user.store_id).run();

	if (!result.meta.changes) return c.json({ detail: 'Menu item not found' }, 404);

	const item = await c.env.DB.prepare('SELECT * FROM menu_items WHERE id = ?').bind(itemId).first();
	return c.json(item);
});

// DELETE /menu-items/:id
app.delete('/menu-items/:id', async (c) => {
	const user = c.get('user');
	const itemId = c.req.param('id');

	const result = await c.env.DB.prepare(
		'DELETE FROM menu_items WHERE id = ? AND store_id = ?'
	).bind(itemId, user.store_id).run();

	if (!result.meta.changes) return c.json({ detail: 'Menu item not found' }, 404);
	return c.json({ message: 'Menu item deleted' });
});

function applyPromotions(items: any[], promotions: any[]): any[] {
	if (!promotions.length) return items;

	return items.map((item) => {
		let bestDiscount = 0;
		let bestPromotion: any = null;

		for (const promo of promotions) {
			const applicableItems = promo.applicable_items ? JSON.parse(promo.applicable_items as string) : {};
			let applies = false;

			const applyTo = applicableItems.apply_to || 'all';
			if (applyTo === 'all') applies = true;
			else if (applyTo === 'category' && (applicableItems.category_ids || []).includes(item.category_id)) applies = true;
			else if (applyTo === 'items' && (applicableItems.item_ids || []).includes(item.id)) applies = true;

			if (applies) {
				let discount = 0;
				if (promo.discount_type === 'percentage') {
					discount = (item.price as number) * ((promo.discount_value as number) / 100);
					if (promo.max_discount && discount > (promo.max_discount as number)) discount = promo.max_discount as number;
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
			item.promotion_label = bestPromotion.discount_type === 'percentage'
				? `Giảm ${Math.floor(bestPromotion.discount_value as number)}%`
				: `Giảm ${Math.floor(bestDiscount).toLocaleString()}đ`;
		} else {
			item.original_price = null;
			item.discounted_price = null;
			item.has_promotion = false;
			item.promotion_label = null;
		}

		return item;
	});
}

export default app;
