import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { processMessage, handleAction, getConversationHistory } from '../services/chatbot';

const chatbot = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Public: process chatbot message (no auth required for customer-facing)
chatbot.post('/message', async (c) => {
	try {
		const body = await c.req.json();
		const { message, session_id, store_id, customer_phone, table_id, cart_items } = body;

		if (!message || !store_id) {
			return c.json({ detail: 'message and store_id are required' }, 400);
		}

		const result = await processMessage(
			c.env, message, session_id || null, store_id, customer_phone, table_id, cart_items
		);
		return c.json(result);
	} catch (e: any) {
		return c.json({ detail: e.message || 'Internal server error' }, 500);
	}
});

// Public: handle chatbot action
chatbot.post('/action', async (c) => {
	try {
		const body = await c.req.json();
		const { action_type, action_payload, session_id, store_id } = body;

		if (!action_type || !session_id || !store_id) {
			return c.json({ detail: 'action_type, session_id and store_id are required' }, 400);
		}

		const result = await handleAction(c.env, action_type, action_payload || {}, session_id, store_id);
		return c.json(result);
	} catch (e: any) {
		return c.json({ detail: e.message || 'Internal server error' }, 500);
	}
});

// Public: get conversation history
chatbot.get('/history/:session_id', async (c) => {
	try {
		const sessionId = c.req.param('session_id');
		const limit = parseInt(c.req.query('limit') || '20');

		const result = await getConversationHistory(c.env.DB, sessionId, limit);
		return c.json(result);
	} catch (e: any) {
		return c.json({ detail: e.message || 'Internal server error' }, 500);
	}
});

export default chatbot;
