import { cors } from 'hono/cors';
import type { Env } from '../types';

const ALLOWED_ORIGINS = [
	'https://minitake-app.pages.dev',
	'https://minitake.pages.dev',
	'https://minitake-e1u.pages.dev',
	'https://minitake.vercel.app',
	'http://localhost:3000',
	'http://localhost:3001',
];

const PREVIEW_ORIGIN_REGEX = /^https:\/\/[a-z0-9-]+\.minitake\.pages\.dev$/;

export function corsMiddleware() {
	return cors({
		origin: (origin: string) => {
			if (ALLOWED_ORIGINS.includes(origin)) return origin;
			if (PREVIEW_ORIGIN_REGEX.test(origin)) return origin;
			return '';
		},
		allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-frontend-url'],
		credentials: true,
		maxAge: 86400,
	});
}
