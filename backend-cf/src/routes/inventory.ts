import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateId } from '../utils/crypto';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();


// GET /inventory-dishes/stats/summary
app.get('/stats/summary', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const storeId = user.store_id;

		const [totalResult, lowStockResult, outOfStockResult, items] = await Promise.all([
			c.env.DB.prepare('SELECT COUNT(*) as count FROM dishes_inventory WHERE store_id = ?').bind(storeId).first<{ count: number }>(),
			c.env.DB.prepare('SELECT COUNT(*) as count FROM dishes_inventory WHERE store_id = ? AND is_low_stock = 1').bind(storeId).first<{ count: number }>(),
			c.env.DB.prepare('SELECT COUNT(*) as count FROM dishes_inventory WHERE store_id = ? AND quantity_in_stock = 0').bind(storeId).first<{ count: number }>(),
			c.env.DB.prepare('SELECT category_name, COUNT(*) as item_count, SUM(quantity_in_stock) as total_quantity, SUM(CASE WHEN is_low_stock = 1 THEN 1 ELSE 0 END) as low_stock_count FROM dishes_inventory WHERE store_id = ? GROUP BY category_name ORDER BY item_count DESC').bind(storeId).all(),
		]);

		const totalQuantity = await c.env.DB.prepare('SELECT COALESCE(SUM(quantity_in_stock), 0) as total FROM dishes_inventory WHERE store_id = ?').bind(storeId).first<{ total: number }>();

		return c.json({
			total_items: totalResult?.count ?? 0,
			total_quantity: totalQuantity?.total ?? 0,
			low_stock_count: lowStockResult?.count ?? 0,
			out_of_stock_count: outOfStockResult?.count ?? 0,
			categories: (items?.results ?? []).map((s: any) => ({
				category_name: s.category_name,
				item_count: s.item_count,
				total_quantity: s.total_quantity,
				low_stock_count: s.low_stock_count,
			})),
		});
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

// GET /inventory-dishes/low-stock
app.get('/low-stock', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const items = await c.env.DB.prepare('SELECT * FROM dishes_inventory WHERE store_id = ? AND is_low_stock = 1').bind(user.store_id).all();
		return c.json(items.results ?? []);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

// GET /inventory-dishes
app.get('/', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const items = await c.env.DB.prepare('SELECT * FROM dishes_inventory WHERE store_id = ? ORDER BY dish_name ASC').bind(user.store_id).all();
		return c.json(items.results ?? []);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

// GET /inventory-dishes/:item_id
app.get('/:item_id', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const item = await c.env.DB.prepare('SELECT * FROM dishes_inventory WHERE id = ? AND store_id = ?').bind(c.req.param('item_id'), user.store_id).first();
		if (!item) return c.json({ detail: 'Inventory item not found' }, 404);
		return c.json(item);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

// POST /inventory-dishes
app.post('/', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const body = await c.req.json();
		const storeId = user.store_id;

		const existing = await c.env.DB.prepare('SELECT id FROM dishes_inventory WHERE store_id = ? AND dish_name = ?').bind(storeId, body.dish_name).first();
		if (existing) return c.json({ detail: `Món '${body.dish_name}' đã tồn tại trong kho` }, 400);

		const id = generateId();
		const now = new Date().toISOString();
		const isLowStock = body.quantity_in_stock <= body.reorder_threshold ? 1 : 0;

		await c.env.DB.prepare(
			'INSERT INTO dishes_inventory (id, store_id, dish_name, category_name, quantity_in_stock, reorder_threshold, unit, is_low_stock, last_updated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
		).bind(id, storeId, body.dish_name, body.category_name, body.quantity_in_stock, body.reorder_threshold, body.unit, isLowStock, now, now).run();

		const item = await c.env.DB.prepare('SELECT * FROM dishes_inventory WHERE id = ?').bind(id).first();
		return c.json(item);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

// PUT /inventory-dishes/:item_id
app.put('/:item_id', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const itemId = c.req.param('item_id');
		const body = await c.req.json();

		const existing = await c.env.DB.prepare('SELECT * FROM dishes_inventory WHERE id = ? AND store_id = ?').bind(itemId, user.store_id).first<any>();
		if (!existing) return c.json({ detail: 'Inventory item not found' }, 404);

		const fields: string[] = [];
		const values: any[] = [];

		for (const key of ['dish_name', 'category_name', 'quantity_in_stock', 'reorder_threshold', 'unit']) {
			if (body[key] !== undefined && body[key] !== null) {
				fields.push(`${key} = ?`);
				values.push(body[key]);
			}
		}

		if (fields.length === 0) return c.json({ detail: 'No data to update' }, 400);

		const newQty = body.quantity_in_stock ?? existing.quantity_in_stock;
		const newThreshold = body.reorder_threshold ?? existing.reorder_threshold;
		fields.push('is_low_stock = ?');
		values.push(newQty <= newThreshold ? 1 : 0);
		fields.push('last_updated = ?');
		values.push(new Date().toISOString());

		values.push(itemId);
		await c.env.DB.prepare(`UPDATE dishes_inventory SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

		const updated = await c.env.DB.prepare('SELECT * FROM dishes_inventory WHERE id = ?').bind(itemId).first();
		return c.json(updated);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

// POST /inventory-dishes/:item_id/adjust
app.post('/:item_id/adjust', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const itemId = c.req.param('item_id');
		const body = await c.req.json();

		const item = await c.env.DB.prepare('SELECT * FROM dishes_inventory WHERE id = ? AND store_id = ?').bind(itemId, user.store_id).first<any>();
		if (!item) return c.json({ detail: 'Inventory item not found' }, 404);

		const qtyBefore = item.quantity_in_stock;
		let newQty: number;

		if (body.adjustment_type === 'add') {
			newQty = qtyBefore + body.quantity;
		} else if (body.adjustment_type === 'subtract') {
			newQty = Math.max(0, qtyBefore - body.quantity);
		} else if (body.adjustment_type === 'set') {
			newQty = body.quantity;
		} else {
			return c.json({ detail: "Invalid adjustment type. Must be 'add', 'subtract', or 'set'" }, 400);
		}

		const now = new Date().toISOString();
		const isLowStock = newQty <= item.reorder_threshold ? 1 : 0;

		await c.env.DB.prepare('UPDATE dishes_inventory SET quantity_in_stock = ?, is_low_stock = ?, last_updated = ? WHERE id = ?').bind(newQty, isLowStock, now, itemId).run();

		const historyId = generateId();
		await c.env.DB.prepare(
			'INSERT INTO inventory_history (id, inventory_id, adjustment_type, quantity_before, quantity_after, quantity_changed, reason, reference_order_id, adjusted_by, adjusted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
		).bind(historyId, itemId, body.adjustment_type, qtyBefore, newQty, newQty - qtyBefore, body.reason || '', body.reference_order_id || '', user.id, now).run();

		const updated = await c.env.DB.prepare('SELECT * FROM dishes_inventory WHERE id = ?').bind(itemId).first();
		return c.json(updated);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

// GET /inventory-dishes/:item_id/history
app.get('/:item_id/history', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const itemId = c.req.param('item_id');
		const limit = parseInt(c.req.query('limit') || '50');

		const item = await c.env.DB.prepare('SELECT id FROM dishes_inventory WHERE id = ? AND store_id = ?').bind(itemId, user.store_id).first();
		if (!item) return c.json({ detail: 'Inventory item not found' }, 404);

		const history = await c.env.DB.prepare('SELECT * FROM inventory_history WHERE inventory_id = ? ORDER BY adjusted_at DESC LIMIT ?').bind(itemId, limit).all();
		return c.json(history.results ?? []);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

// DELETE /inventory-dishes/:item_id
app.delete('/:item_id', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const result = await c.env.DB.prepare('DELETE FROM dishes_inventory WHERE id = ? AND store_id = ?').bind(c.req.param('item_id'), user.store_id).run();
		if (!result.meta.changes) return c.json({ detail: 'Inventory item not found' }, 404);
		return c.json({ message: 'Inventory item deleted successfully' });
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

// POST /inventory-dishes/bulk-import
app.post('/bulk-import', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const body = await c.req.json();
		const createdItems: any[] = [];
		const errors: any[] = [];

		for (let idx = 0; idx < body.items.length; idx++) {
			const itemData = body.items[idx];
			const existing = await c.env.DB.prepare('SELECT id FROM dishes_inventory WHERE store_id = ? AND dish_name = ?').bind(user.store_id, itemData.dish_name).first();
			if (existing) {
				errors.push({ index: idx, dish_name: itemData.dish_name, error: 'Món đã tồn tại trong kho' });
				continue;
			}

			const id = generateId();
			const now = new Date().toISOString();
			const isLowStock = itemData.quantity_in_stock <= itemData.reorder_threshold ? 1 : 0;

			try {
				await c.env.DB.prepare(
					'INSERT INTO dishes_inventory (id, store_id, dish_name, category_name, quantity_in_stock, reorder_threshold, unit, is_low_stock, last_updated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
				).bind(id, user.store_id, itemData.dish_name, itemData.category_name, itemData.quantity_in_stock, itemData.reorder_threshold, itemData.unit, isLowStock, now, now).run();

				const created = await c.env.DB.prepare('SELECT * FROM dishes_inventory WHERE id = ?').bind(id).first();
				createdItems.push(created);
			} catch (e: any) {
				errors.push({ index: idx, dish_name: itemData.dish_name, error: e.message });
			}
		}

		return c.json({ items_success: createdItems.length, items_failed: errors.length, created_items: createdItems, errors });
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

export default app;
