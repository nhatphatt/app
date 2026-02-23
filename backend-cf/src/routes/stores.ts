import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateId } from '../utils/crypto';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();


// GET /stores/me
app.get('/stores/me', authMiddleware, async (c) => {
	const user = c.get('user');
	const store = await c.env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(user.store_id).first();
	if (!store) return c.json({ detail: 'Store not found' }, 404);
	return c.json(store);
});

// PUT /stores/me
app.put('/stores/me', authMiddleware, async (c) => {
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
app.get('/categories', authMiddleware, async (c) => {
	const user = c.get('user');
	const { results } = await c.env.DB.prepare(
		'SELECT * FROM categories WHERE store_id = ? ORDER BY display_order ASC'
	).bind(user.store_id).all();
	return c.json(results);
});

// POST /categories
app.post('/categories', authMiddleware, async (c) => {
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
app.put('/categories/:id', authMiddleware, async (c) => {
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
app.delete('/categories/:id', authMiddleware, async (c) => {
	const user = c.get('user');
	const categoryId = c.req.param('id');

	const result = await c.env.DB.prepare(
		'DELETE FROM categories WHERE id = ? AND store_id = ?'
	).bind(categoryId, user.store_id).run();

	if (!result.meta.changes) return c.json({ detail: 'Category not found' }, 404);
	return c.json({ message: 'Category deleted' });
});

// GET /menu-items
app.get('/menu-items', authMiddleware, async (c) => {
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
app.post('/menu-items', authMiddleware, async (c) => {
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
app.put('/menu-items/:id', authMiddleware, async (c) => {
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
app.delete('/menu-items/:id', authMiddleware, async (c) => {
	const user = c.get('user');
	const itemId = c.req.param('id');

	const result = await c.env.DB.prepare(
		'DELETE FROM menu_items WHERE id = ? AND store_id = ?'
	).bind(itemId, user.store_id).run();

	if (!result.meta.changes) return c.json({ detail: 'Menu item not found' }, 404);
	return c.json({ message: 'Menu item deleted' });
});

// DELETE /menu-items (delete all)
app.delete('/menu-items', authMiddleware, async (c) => {
	const user = c.get('user');
	const result = await c.env.DB.prepare('DELETE FROM menu_items WHERE store_id = ?').bind(user.store_id).run();
	return c.json({ message: `Deleted ${result.meta.changes} menu items`, deleted_count: result.meta.changes });
});

// POST /menu-items/bulk-import
app.post('/menu-items/bulk-import', authMiddleware, async (c) => {
	const user = c.get('user');
	const body = await c.req.json();
	const { categories = [], items = [] } = body;
	const now = new Date().toISOString();
	let categories_created = 0;
	let items_success = 0;
	let items_failed = 0;
	const errors: string[] = [];

	// Step 1: Create categories
	for (const cat of categories) {
		try {
			const existing = await c.env.DB.prepare(
				'SELECT id FROM categories WHERE store_id = ? AND LOWER(name) = LOWER(?)'
			).bind(user.store_id, cat.name).first();
			if (!existing) {
				const catId = generateId();
				await c.env.DB.prepare(
					'INSERT INTO categories (id, name, store_id, display_order, created_at) VALUES (?,?,?,?,?)'
				).bind(catId, cat.name, user.store_id, cat.display_order || 0, now).run();
				categories_created++;
			}
		} catch (e: any) { errors.push(`Category '${cat.name}': ${e.message}`); }
	}

	// Step 2: Import items
	for (const item of items) {
		try {
			let categoryId = '';
			if (item.category_name) {
				const cat = await c.env.DB.prepare(
					'SELECT id FROM categories WHERE store_id = ? AND LOWER(name) = LOWER(?)'
				).bind(user.store_id, item.category_name).first();
				categoryId = (cat?.id as string) || '';
			}
			const itemId = generateId();
			await c.env.DB.prepare(
				`INSERT INTO menu_items (id, name, description, price, category_id, store_id, image_url, is_available, created_at)
				 VALUES (?,?,?,?,?,?,?,?,?)`
			).bind(
				itemId, item.name, item.description || '', item.price || 0,
				categoryId, user.store_id, item.image_url || '',
				item.is_available !== false ? 1 : 0, now
			).run();
			items_success++;
		} catch (e: any) {
			items_failed++;
			errors.push(`Item '${item.name}': ${e.message}`);
		}
	}

	return c.json({ categories_created, items_success, items_failed, errors });
});

function applyPromotions(items: any[], promotions: any[]): any[] {
	if (!promotions.length) return items;

	return items.map((item) => {
		let bestDiscount = 0;
		let bestPromotion: any = null;

		for (const promo of promotions) {
			const applyTo = promo.apply_to || 'all';
			const categoryIds = promo.category_ids ? (typeof promo.category_ids === 'string' ? JSON.parse(promo.category_ids as string) : promo.category_ids) : [];
			const itemIds = promo.item_ids ? (typeof promo.item_ids === 'string' ? JSON.parse(promo.item_ids as string) : promo.item_ids) : [];
			let applies = false;

			if (applyTo === 'all') applies = true;
			else if (applyTo === 'category' && categoryIds.includes(item.category_id)) applies = true;
			else if (applyTo === 'items' && itemIds.includes(item.id)) applies = true;

			if (applies) {
				let discount = 0;
				if (promo.promotion_type === 'percentage') {
					discount = (item.price as number) * ((promo.discount_value as number) / 100);
					if (promo.max_discount_amount && discount > (promo.max_discount_amount as number)) discount = promo.max_discount_amount as number;
				} else if (promo.promotion_type === 'fixed_amount') {
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
			item.promotion_label = bestPromotion.promotion_type === 'percentage'
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

// GET /payment-methods (alias for /payments/methods)
app.get('/payment-methods', authMiddleware, async (c) => {
	const user = c.get('user');
	const { results } = await c.env.DB.prepare(
		'SELECT * FROM payment_methods WHERE store_id = ? ORDER BY created_at DESC'
	).bind(user.store_id).all();
	const methods = (results || []).map((m: any) => ({
		...m,
		config: m.config ? JSON.parse(m.config) : {},
		is_active: !!m.is_active,
		is_enabled: !!m.is_active,
	}));
	return c.json(methods);
});

// PUT /payment-methods/:id
app.put('/payment-methods/:id', authMiddleware, async (c) => {
	const user = c.get('user');
	const id = c.req.param('id');
	const body = await c.req.json();
	const existing = await c.env.DB.prepare(
		'SELECT * FROM payment_methods WHERE id = ? AND store_id = ?'
	).bind(id, user.store_id).first();
	if (!existing) return c.json({ detail: 'Payment method not found' }, 404);

	const updates: string[] = [];
	const values: any[] = [];

	// Handle is_active / is_enabled
	if (body.is_active !== undefined) { updates.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }
	if (body.is_enabled !== undefined) { updates.push('is_active = ?'); values.push(body.is_enabled ? 1 : 0); }
	if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }

	// Build config from individual fields or from config object
	const existingConfig = existing.config ? JSON.parse(existing.config as string) : {};
	let configChanged = false;
	for (const key of ['bank_name', 'bank_bin', 'account_number', 'account_name', 'phone']) {
		if (body[key] !== undefined) { existingConfig[key] = body[key]; configChanged = true; }
	}
	if (body.config !== undefined) { Object.assign(existingConfig, body.config); configChanged = true; }
	if (configChanged) { updates.push('config = ?'); values.push(JSON.stringify(existingConfig)); }

	if (updates.length === 0) return c.json({ ...existing, config: existingConfig, is_active: !!existing.is_active });

	values.push(id);
	await c.env.DB.prepare(`UPDATE payment_methods SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
	const updated = await c.env.DB.prepare('SELECT * FROM payment_methods WHERE id = ?').bind(id).first() as any;
	return c.json({
		...updated,
		config: updated?.config ? JSON.parse(updated.config) : {},
		is_active: !!updated?.is_active,
		is_enabled: !!updated?.is_active,
	});
});

export default app;
