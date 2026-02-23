import { Hono } from 'hono';
import type { Env } from '../types';
import { verifyToken, createToken } from '../middleware/auth';
import { verifyPassword, generateId } from '../utils/crypto';

const app = new Hono<{ Bindings: Env; Variables: { superAdmin: any } }>();

// Super admin auth middleware
async function superAdminAuth(c: any, next: any) {
	const authHeader = c.req.header('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return c.json({ detail: 'Missing or invalid authorization header' }, 401);
	}
	try {
		const decoded = await verifyToken(authHeader.slice(7), c.env.JWT_SECRET);
		if (decoded.role !== 'super_admin') {
			return c.json({ detail: 'Invalid token type' }, 401);
		}
		const admin = await c.env.DB.prepare(
			'SELECT super_admin_id, email, name, is_active, last_login_at, created_at FROM super_admins WHERE super_admin_id = ?'
		).bind(decoded.sub).first();
		if (!admin) return c.json({ detail: 'Super Admin not found' }, 401);
		if (!admin.is_active) return c.json({ detail: 'Account is deactivated' }, 401);
		c.set('superAdmin', admin);
		await next();
	} catch (e: any) {
		const msg = e.message?.includes('expired') ? 'Token expired' : 'Invalid token';
		return c.json({ detail: msg }, 401);
	}
}

// POST /login
app.post('/login', async (c) => {
	try {
		const { email, password } = await c.req.json();
		const admin = await c.env.DB.prepare('SELECT * FROM super_admins WHERE email = ?').bind(email).first();
		if (!admin) return c.json({ detail: 'Invalid email or password' }, 401);
		if (!admin.is_active) return c.json({ detail: 'Account is deactivated' }, 401);

		const valid = await verifyPassword(password, admin.password_hash as string);
		if (!valid) return c.json({ detail: 'Invalid email or password' }, 401);

		const now = new Date().toISOString();
		await c.env.DB.prepare('UPDATE super_admins SET last_login_at = ? WHERE super_admin_id = ?').bind(now, admin.super_admin_id).run();

		const token = await createToken(
			{ sub: admin.super_admin_id as string, email: admin.email as string, role: 'super_admin', store_id: '' },
			c.env.JWT_SECRET
		);

		return c.json({
			access_token: token,
			token_type: 'bearer',
			user: {
				super_admin_id: admin.super_admin_id,
				email: admin.email,
				name: admin.name,
				is_active: admin.is_active,
				last_login_at: now,
				created_at: admin.created_at,
			},
		});
	} catch (e: any) {
		return c.json({ detail: 'Login failed' }, 500);
	}
});

// GET /dashboard
app.get('/dashboard', superAdminAuth, async (c) => {
	try {
		const storeCount = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM stores').first<{ cnt: number }>();
		const userCount = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM users').first<{ cnt: number }>();
		const activeSubCount = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM subscriptions WHERE status IN ('active','trial')").first<{ cnt: number }>();
		const revenueRow = await c.env.DB.prepare("SELECT COALESCE(SUM(amount),0) as total FROM subscription_payments WHERE status = 'paid'").first<{ total: number }>();

		return c.json({
			total_stores: storeCount?.cnt || 0,
			total_users: userCount?.cnt || 0,
			active_subscriptions: activeSubCount?.cnt || 0,
			total_revenue: revenueRow?.total || 0,
		});
	} catch (e: any) {
		return c.json({ detail: 'Failed to get dashboard data' }, 500);
	}
});

// GET /stores
app.get('/stores', superAdminAuth, async (c) => {
	try {
		const page = parseInt(c.req.query('page') || '1');
		const limit = parseInt(c.req.query('limit') || '20');
		const offset = (page - 1) * limit;

		const totalRow = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM stores').first<{ cnt: number }>();
		const total = totalRow?.cnt || 0;

		const { results } = await c.env.DB.prepare(
			'SELECT * FROM stores ORDER BY created_at DESC LIMIT ? OFFSET ?'
		).bind(limit, offset).all();

		return c.json({
			stores: results || [],
			total,
			page,
			limit,
			total_pages: Math.ceil(total / limit),
		});
	} catch (e: any) {
		return c.json({ detail: 'Failed to get stores' }, 500);
	}
});

// GET /stores/:store_id
app.get('/stores/:store_id', superAdminAuth, async (c) => {
	try {
		const storeId = c.req.param('store_id');
		const store = await c.env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(storeId).first();
		if (!store) return c.json({ detail: 'Store not found' }, 404);

		const subscription = await c.env.DB.prepare(
			"SELECT * FROM subscriptions WHERE store_id = ? AND status IN ('active','trial') LIMIT 1"
		).bind(storeId).first();
		(store as any).subscription = subscription || null;

		return c.json(store);
	} catch (e: any) {
		return c.json({ detail: 'Failed to get store details' }, 500);
	}
});

// PUT /stores/:store_id/suspend
app.put('/stores/:store_id/suspend', superAdminAuth, async (c) => {
	try {
		const storeId = c.req.param('store_id');
		const body = await c.req.json().catch(() => ({}));
		const reason = body.reason || null;
		const now = new Date().toISOString();

		const store = await c.env.DB.prepare('SELECT id FROM stores WHERE id = ?').bind(storeId).first();
		if (!store) return c.json({ detail: 'Store not found' }, 404);

		await c.env.DB.prepare(
			'UPDATE stores SET is_suspended = 1, suspended_reason = ?, suspended_at = ?, updated_at = ? WHERE id = ?'
		).bind(reason, now, now, storeId).run();

		return c.json({ success: true, message: 'Store suspended successfully' });
	} catch (e: any) {
		return c.json({ detail: 'Failed to suspend store' }, 500);
	}
});

// PUT /stores/:store_id/activate
app.put('/stores/:store_id/activate', superAdminAuth, async (c) => {
	try {
		const storeId = c.req.param('store_id');
		const now = new Date().toISOString();

		const store = await c.env.DB.prepare('SELECT id FROM stores WHERE id = ?').bind(storeId).first();
		if (!store) return c.json({ detail: 'Store not found' }, 404);

		await c.env.DB.prepare(
			'UPDATE stores SET is_suspended = 0, suspended_reason = NULL, suspended_at = NULL, updated_at = ? WHERE id = ?'
		).bind(now, storeId).run();

		return c.json({ success: true, message: 'Store activated successfully' });
	} catch (e: any) {
		return c.json({ detail: 'Failed to activate store' }, 500);
	}
});

// GET /subscriptions
app.get('/subscriptions', superAdminAuth, async (c) => {
	try {
		const page = parseInt(c.req.query('page') || '1');
		const limit = parseInt(c.req.query('limit') || '20');
		const offset = (page - 1) * limit;

		const totalRow = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM subscriptions').first<{ cnt: number }>();
		const total = totalRow?.cnt || 0;

		const { results } = await c.env.DB.prepare(
			'SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT ? OFFSET ?'
		).bind(limit, offset).all();

		return c.json({ subscriptions: results || [], total, page, limit, total_pages: Math.ceil(total / limit) });
	} catch (e: any) {
		return c.json({ detail: 'Failed to get subscriptions' }, 500);
	}
});

// GET /payments
app.get('/payments', superAdminAuth, async (c) => {
	try {
		const page = parseInt(c.req.query('page') || '1');
		const limit = parseInt(c.req.query('limit') || '20');
		const offset = (page - 1) * limit;
		const status = c.req.query('status');

		let countSql = 'SELECT COUNT(*) as cnt FROM subscription_payments';
		let dataSql = 'SELECT * FROM subscription_payments';
		const binds: any[] = [];

		if (status) {
			countSql += ' WHERE status = ?';
			dataSql += ' WHERE status = ?';
			binds.push(status);
		}

		dataSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

		const totalRow = await c.env.DB.prepare(countSql).bind(...binds).first<{ cnt: number }>();
		const total = totalRow?.cnt || 0;

		const { results } = await c.env.DB.prepare(dataSql).bind(...binds, limit, offset).all();

		return c.json({ payments: results || [], total, page, limit, total_pages: Math.ceil(total / limit) });
	} catch (e: any) {
		return c.json({ detail: 'Failed to get payments' }, 500);
	}
});

// GET /revenue
app.get('/revenue', superAdminAuth, async (c) => {
	try {
		const period = c.req.query('period') || 'month';
		let groupBy: string;
		if (period === 'year') {
			groupBy = "strftime('%Y', created_at)";
		} else {
			groupBy = "strftime('%Y-%m', created_at)";
		}

		const { results } = await c.env.DB.prepare(
			`SELECT ${groupBy} as period_key, SUM(amount) as total_amount, COUNT(*) as payment_count FROM subscription_payments WHERE status = 'paid' GROUP BY period_key ORDER BY period_key DESC LIMIT 12`
		).all();

		return c.json({ period, data: results || [] });
	} catch (e: any) {
		return c.json({ detail: 'Failed to get revenue data' }, 500);
	}
});

// GET /users
app.get('/users', superAdminAuth, async (c) => {
	try {
		const page = parseInt(c.req.query('page') || '1');
		const limit = parseInt(c.req.query('limit') || '20');
		const offset = (page - 1) * limit;
		const search = c.req.query('search');
		const role = c.req.query('role');

		let where = "WHERE role != 'super_admin'";
		const binds: any[] = [];

		if (role) {
			where = 'WHERE role = ?';
			binds.push(role);
		}
		if (search) {
			where += ' AND (email LIKE ? OR name LIKE ?)';
			binds.push(`%${search}%`, `%${search}%`);
		}

		const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM users ${where}`).bind(...binds).first<{ cnt: number }>();
		const total = totalRow?.cnt || 0;

		const { results } = await c.env.DB.prepare(
			`SELECT id, email, name, role, store_id, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
		).bind(...binds, limit, offset).all();

		// Get store names
		const users = [];
		for (const u of (results || [])) {
			const user: any = { ...u };
			if (user.store_id) {
				const store = await c.env.DB.prepare('SELECT name FROM stores WHERE id = ?').bind(user.store_id).first();
				user.store_name = store?.name || null;
			}
			users.push(user);
		}

		return c.json({ users, total, page, limit, total_pages: Math.ceil(total / limit) });
	} catch (e: any) {
		return c.json({ detail: 'Failed to get users' }, 500);
	}
});

// GET /users/:user_id
app.get('/users/:user_id', superAdminAuth, async (c) => {
	try {
		const userId = c.req.param('user_id');
		const user: any = await c.env.DB.prepare(
			'SELECT id, email, name, role, store_id, created_at FROM users WHERE id = ?'
		).bind(userId).first();
		if (!user) return c.json({ detail: 'User not found' }, 404);

		if (user.store_id) {
			const store = await c.env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(user.store_id).first();
			user.store = store || null;
		}
		return c.json(user);
	} catch (e: any) {
		return c.json({ detail: 'Failed to get user details' }, 500);
	}
});

// PUT /users/:user_id/status
app.put('/users/:user_id/status', superAdminAuth, async (c) => {
	try {
		const userId = c.req.param('user_id');
		const body = await c.req.json();
		const newStatus = body.status;

		if (!['active', 'inactive'].includes(newStatus)) {
			return c.json({ detail: 'Invalid status' }, 400);
		}

		const existing = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(userId).first();
		if (!existing) return c.json({ detail: 'User not found' }, 404);
		if (existing.role === 'super_admin') return c.json({ detail: 'Cannot change super admin status' }, 403);

		const now = new Date().toISOString();
		await c.env.DB.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').bind(newStatus, now, userId).run();

		return c.json({ message: 'User status updated successfully', status: newStatus });
	} catch (e: any) {
		return c.json({ detail: 'Failed to update user status' }, 500);
	}
});

// DELETE /users/:user_id
app.delete('/users/:user_id', superAdminAuth, async (c) => {
	try {
		const userId = c.req.param('user_id');
		const existing = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(userId).first();
		if (!existing) return c.json({ detail: 'User not found' }, 404);
		if (existing.role === 'super_admin') return c.json({ detail: 'Cannot delete super admin' }, 403);

		await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
		return c.json({ message: 'User deleted successfully' });
	} catch (e: any) {
		return c.json({ detail: 'Failed to delete user' }, 500);
	}
});

export default app;
