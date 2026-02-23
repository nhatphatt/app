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

app.route('/api', authRoutes);
app.route('/api', storesRoutes);
app.route('/api', ordersRoutes);
app.route('/api', paymentsRoutes);
app.route('/api', promotionsRoutes);
app.route('/api', analyticsRoutes);
app.route('/api', inventoryRoutes);
app.route('/api', staffRoutes);
app.route('/api', subscriptionsRoutes);
app.route('/api', superadminRoutes);
app.route('/api', webhooksRoutes);
app.route('/api', chatbotRoutes);

export default app;
