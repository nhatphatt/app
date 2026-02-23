import { Hono } from 'hono';
import type { Env } from './types';
import { corsMiddleware } from './middleware/cors';

import authRoutes from './routes/auth';
import storesRoutes from './routes/stores';
import ordersRoutes from './routes/orders';
import paymentsRoutes from './routes/payments';
import promotionsRoutes from './routes/promotions';
import analyticsRoutes from './routes/analytics';
import inventoryRoutes from './routes/inventory';
import staffRoutes from './routes/staff';
import subscriptionsRoutes from './routes/subscriptions';
import superadminRoutes from './routes/superadmin';
import webhooksRoutes from './routes/webhooks';
import chatbotRoutes from './routes/chatbot';

const app = new Hono<{ Bindings: Env }>();

app.use('*', corsMiddleware());

app.get('/', (c) => c.json({ status: 'ok', service: 'Minitake API', version: '1.0.0' }));
app.get('/health', (c) => c.json({ status: 'healthy' }));

// Auth routes: /api/auth/*
app.route('/api', authRoutes);
// Store/category/menu routes: /api/stores/*, /api/categories, /api/menu-items
app.route('/api', storesRoutes);
// Order/table/public routes: /api/orders, /api/tables, /api/public/*
app.route('/api', ordersRoutes);
// Payments: /api/payments/*
app.route('/api/payments', paymentsRoutes);
// Promotions: /api/promotions/*
app.route('/api/promotions', promotionsRoutes);
// Analytics: /api/analytics/*
app.route('/api/analytics', analyticsRoutes);
// Inventory: /api/inventory-dishes/*
app.route('/api/inventory-dishes', inventoryRoutes);
// Staff: /api/employees, /api/shifts, /api/attendance
app.route('/api', staffRoutes);
// Subscriptions: /api/subscriptions/*
app.route('/api/subscriptions', subscriptionsRoutes);
// Super admin: /api/super-admin/*
app.route('/api/super-admin', superadminRoutes);
// Webhooks: /api/webhooks/*
app.route('/api/webhooks', webhooksRoutes);
// Chatbot: /api/chatbot/*
app.route('/api/chatbot', chatbotRoutes);
// Payment methods alias: frontend calls /api/payment-methods/* instead of /api/payments/methods/*
app.all('/api/payment-methods/:id?', async (c) => {
	const id = c.req.param('id');
	const url = new URL(c.req.url);
	url.pathname = id ? `/api/payments/methods/${id}` : '/api/payments/methods';
	const newReq = new Request(url.toString(), c.req.raw);
	return app.fetch(newReq, c.env, c.executionCtx);
});

export default app;
