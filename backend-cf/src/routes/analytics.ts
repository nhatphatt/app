import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /analytics/dashboard
app.get('/dashboard', authMiddleware, async (c) => {
	const user = c.get('user');
	const store_id = user.store_id;

	const now = new Date();
	const todayStart = new Date(now);
	todayStart.setUTCHours(0, 0, 0, 0);
	const todayStartISO = todayStart.toISOString();

	const monthStart = new Date(now);
	monthStart.setUTCDate(1);
	monthStart.setUTCHours(0, 0, 0, 0);
	const monthStartISO = monthStart.toISOString();

	const nowISO = now.toISOString();

	const [
		todayRevenue,
		todayOrders,
		monthRevenue,
		monthOrders,
		pendingOrders,
		totalItems,
		totalCustomers,
		totalTables,
		occupiedTables,
		unpaidOrders,
		activePromotions,
		unavailableItems,
	] = await Promise.all([
		c.env.DB.prepare(
			"SELECT COALESCE(SUM(total), 0) as val FROM orders WHERE store_id = ? AND created_at >= ? AND status = 'completed'"
		).bind(store_id, todayStartISO).first<{ val: number }>(),
		c.env.DB.prepare(
			'SELECT COUNT(*) as val FROM orders WHERE store_id = ? AND created_at >= ?'
		).bind(store_id, todayStartISO).first<{ val: number }>(),
		c.env.DB.prepare(
			"SELECT COALESCE(SUM(total), 0) as val FROM orders WHERE store_id = ? AND created_at >= ? AND status = 'completed'"
		).bind(store_id, monthStartISO).first<{ val: number }>(),
		c.env.DB.prepare(
			'SELECT COUNT(*) as val FROM orders WHERE store_id = ? AND created_at >= ?'
		).bind(store_id, monthStartISO).first<{ val: number }>(),
		c.env.DB.prepare(
			"SELECT COUNT(*) as val FROM orders WHERE store_id = ? AND status IN ('pending', 'preparing')"
		).bind(store_id).first<{ val: number }>(),
		c.env.DB.prepare(
			'SELECT COUNT(*) as val FROM menu_items WHERE store_id = ?'
		).bind(store_id).first<{ val: number }>(),
		c.env.DB.prepare(
			"SELECT COUNT(DISTINCT customer_phone) as val FROM orders WHERE store_id = ? AND customer_phone != ''"
		).bind(store_id).first<{ val: number }>(),
		c.env.DB.prepare(
			'SELECT COUNT(*) as val FROM tables WHERE store_id = ?'
		).bind(store_id).first<{ val: number }>(),
		c.env.DB.prepare(
			"SELECT COUNT(*) as val FROM tables WHERE store_id = ? AND status = 'occupied'"
		).bind(store_id).first<{ val: number }>(),
		c.env.DB.prepare(
			"SELECT COUNT(*) as val FROM orders WHERE store_id = ? AND payment_status = 'pending'"
		).bind(store_id).first<{ val: number }>(),
		c.env.DB.prepare(
			'SELECT COUNT(*) as val FROM promotions WHERE store_id = ? AND is_active = 1 AND start_date <= ? AND end_date >= ?'
		).bind(store_id, nowISO, nowISO).first<{ val: number }>(),
		c.env.DB.prepare(
			'SELECT COUNT(*) as val FROM menu_items WHERE store_id = ? AND is_available = 0'
		).bind(store_id).first<{ val: number }>(),
	]);

	const monthOrdersCount = monthOrders?.val || 0;
	const monthRevenueVal = monthRevenue?.val || 0;

	// New customers this month approximation
	const newCustomersResult = await c.env.DB.prepare(
		"SELECT COUNT(DISTINCT customer_phone) as val FROM orders WHERE store_id = ? AND customer_phone != '' AND created_at >= ? AND customer_phone NOT IN (SELECT DISTINCT customer_phone FROM orders WHERE store_id = ? AND customer_phone != '' AND created_at < ?)"
	).bind(store_id, monthStartISO, store_id, monthStartISO).first<{ val: number }>();

	return c.json({
		today_revenue: todayRevenue?.val || 0,
		today_orders: todayOrders?.val || 0,
		month_revenue: monthRevenueVal,
		month_orders: monthOrdersCount,
		pending_orders: pendingOrders?.val || 0,
		total_menu_items: totalItems?.val || 0,
		avg_order_value: monthOrdersCount > 0 ? monthRevenueVal / monthOrdersCount : 0,
		total_customers: totalCustomers?.val || 0,
		new_customers_month: newCustomersResult?.val || 0,
		total_tables: totalTables?.val || 0,
		occupied_tables: occupiedTables?.val || 0,
		unpaid_orders: unpaidOrders?.val || 0,
		active_promotions: activePromotions?.val || 0,
		unavailable_items: unavailableItems?.val || 0,
	});
});

// GET /analytics/revenue-chart
app.get('/revenue-chart', authMiddleware, async (c) => {
	const user = c.get('user');
	const days = parseInt(c.req.query('days') || '7');
	const result: any[] = [];

	for (let i = days - 1; i >= 0; i--) {
		const dayStart = new Date();
		dayStart.setUTCHours(0, 0, 0, 0);
		dayStart.setUTCDate(dayStart.getUTCDate() - i);
		const dayEnd = new Date(dayStart);
		dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

		const dayStartISO = dayStart.toISOString();
		const dayEndISO = dayEnd.toISOString();

		const [revenueRow, ordersRow] = await Promise.all([
			c.env.DB.prepare(
				"SELECT COALESCE(SUM(total), 0) as val FROM orders WHERE store_id = ? AND created_at >= ? AND created_at < ? AND status = 'completed'"
			).bind(user.store_id, dayStartISO, dayEndISO).first<{ val: number }>(),
			c.env.DB.prepare(
				'SELECT COUNT(*) as val FROM orders WHERE store_id = ? AND created_at >= ? AND created_at < ?'
			).bind(user.store_id, dayStartISO, dayEndISO).first<{ val: number }>(),
		]);

		const dd = String(dayStart.getUTCDate()).padStart(2, '0');
		const mm = String(dayStart.getUTCMonth() + 1).padStart(2, '0');

		result.push({
			date: `${dd}/${mm}`,
			revenue: revenueRow?.val || 0,
			orders: ordersRow?.val || 0,
		});
	}

	return c.json(result);
});

// GET /analytics/top-items
app.get('/top-items', authMiddleware, async (c) => {
	const user = c.get('user');
	const limit = parseInt(c.req.query('limit') || '5');

	const { results: orders } = await c.env.DB.prepare(
		"SELECT items FROM orders WHERE store_id = ? AND status = 'completed'"
	).bind(user.store_id).all();

	const itemStats: Record<string, { name: string; quantity: number; revenue: number }> = {};

	for (const order of orders || []) {
		const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
		for (const item of items) {
			const id = item.menu_item_id || item.name;
			if (!id) continue;
			if (!itemStats[id]) {
				itemStats[id] = { name: item.name || id, quantity: 0, revenue: 0 };
			}
			itemStats[id].quantity += item.quantity || 0;
			itemStats[id].revenue += (item.price || 0) * (item.quantity || 0);
		}
	}

	const sorted = Object.entries(itemStats)
		.sort((a, b) => b[1].quantity - a[1].quantity)
		.map(([id, stats]) => ({ menu_item_id: id, ...stats }));

	const topSelling = sorted.slice(0, limit);
	const leastSelling = Object.entries(itemStats)
		.sort((a, b) => a[1].quantity - b[1].quantity)
		.slice(0, limit)
		.map(([id, stats]) => ({ menu_item_id: id, ...stats }));

	return c.json({ top_selling: topSelling, least_selling: leastSelling });
});

// GET /analytics/recent-orders
app.get('/recent-orders', authMiddleware, async (c) => {
	const user = c.get('user');
	const limit = parseInt(c.req.query('limit') || '10');

	const { results } = await c.env.DB.prepare(
		'SELECT * FROM orders WHERE store_id = ? ORDER BY created_at DESC LIMIT ?'
	).bind(user.store_id, limit).all();

	const orders = (results || []).map((o: any) => ({
		...o,
		items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
	}));

	return c.json(orders);
});

// GET /analytics/payment-methods
app.get('/payment-methods', authMiddleware, async (c) => {
	const user = c.get('user');

	const { results: payments } = await c.env.DB.prepare(
		"SELECT payment_method as method, COUNT(*) as count, SUM(amount) as total FROM payments WHERE store_id = ? AND status = 'paid' GROUP BY payment_method"
	).bind(user.store_id).all();

	return c.json(payments || []);
});

// GET /analytics/alerts
app.get('/alerts', authMiddleware, async (c) => {
	const user = c.get('user');
	const store_id = user.store_id;
	const alerts: any[] = [];

	const now = new Date();
	const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
	const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
	const nowISO = now.toISOString();

	const [unavailable, oldPending, expiringPromos, unpaid] = await Promise.all([
		c.env.DB.prepare(
			'SELECT COUNT(*) as val FROM menu_items WHERE store_id = ? AND is_available = 0'
		).bind(store_id).first<{ val: number }>(),
		c.env.DB.prepare(
			"SELECT COUNT(*) as val FROM orders WHERE store_id = ? AND status = 'pending' AND created_at < ?"
		).bind(store_id, thirtyMinAgo).first<{ val: number }>(),
		c.env.DB.prepare(
			'SELECT COUNT(*) as val FROM promotions WHERE store_id = ? AND is_active = 1 AND end_date >= ? AND end_date <= ?'
		).bind(store_id, nowISO, threeDaysLater).first<{ val: number }>(),
		c.env.DB.prepare(
			"SELECT COUNT(*) as val FROM orders WHERE store_id = ? AND payment_status = 'pending' AND status IN ('completed', 'ready')"
		).bind(store_id).first<{ val: number }>(),
	]);

	if (unavailable?.val) {
		alerts.push({
			type: 'warning',
			title: 'Món ăn hết hàng',
			message: `Có ${unavailable.val} món đang không khả dụng`,
			action: '/admin/menu',
		});
	}

	if (oldPending?.val) {
		alerts.push({
			type: 'error',
			title: 'Đơn hàng chậm xử lý',
			message: `Có ${oldPending.val} đơn đang chờ quá 30 phút`,
			action: '/admin/orders',
		});
	}

	if (expiringPromos?.val) {
		alerts.push({
			type: 'info',
			title: 'Khuyến mãi sắp hết hạn',
			message: `Có ${expiringPromos.val} chương trình sắp kết thúc trong 3 ngày tới`,
			action: '/admin/promotions',
		});
	}

	if (unpaid?.val) {
		alerts.push({
			type: 'warning',
			title: 'Đơn hàng chưa thanh toán',
			message: `Có ${unpaid.val} đơn đã hoàn thành nhưng chưa thanh toán`,
			action: '/admin/orders',
		});
	}

	return c.json(alerts);
});

export default app;
