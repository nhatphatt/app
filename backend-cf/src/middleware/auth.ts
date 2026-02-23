import { Context, Next } from 'hono';
import type { Env, JwtPayload } from '../types';

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
	const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
	str = str.replace(/-/g, '+').replace(/_/g, '/');
	while (str.length % 4) str += '=';
	const binary = atob(str);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

async function getKey(secret: string): Promise<CryptoKey> {
	const enc = new TextEncoder();
	return crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}

export async function createToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, secret: string, expiresInMinutes = 1440): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const fullPayload: JwtPayload = {
		...payload,
		iat: now,
		exp: now + expiresInMinutes * 60,
	};

	const header = { alg: 'HS256', typ: 'JWT' };
	const enc = new TextEncoder();
	const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
	const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(fullPayload)));
	const signingInput = `${headerB64}.${payloadB64}`;

	const key = await getKey(secret);
	const signature = await crypto.subtle.sign('HMAC', key, enc.encode(signingInput));

	return `${signingInput}.${base64UrlEncode(signature)}`;
}

export async function verifyToken(token: string, secret: string): Promise<JwtPayload> {
	const parts = token.split('.');
	if (parts.length !== 3) throw new Error('Invalid token format');

	const [headerB64, payloadB64, signatureB64] = parts;
	const enc = new TextEncoder();
	const key = await getKey(secret);

	const valid = await crypto.subtle.verify(
		'HMAC',
		key,
		base64UrlDecode(signatureB64),
		enc.encode(`${headerB64}.${payloadB64}`)
	);

	if (!valid) throw new Error('Invalid token signature');

	const payload: JwtPayload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));

	if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
		throw new Error('Token expired');
	}

	return payload;
}

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: { user: any; jwtPayload: JwtPayload } }>, next: Next) {
	const authHeader = c.req.header('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ detail: 'Missing or invalid authorization header' }, 401);
	}

	const token = authHeader.slice(7);
	try {
		const decoded = await verifyToken(token, c.env.JWT_SECRET);

		const user = await c.env.DB.prepare(
			'SELECT id, email, name, role, store_id, created_at FROM users WHERE id = ?'
		).bind(decoded.sub).first();

		if (!user) {
			return c.json({ detail: 'User not found' }, 401);
		}

		c.set('user', user);
		c.set('jwtPayload', decoded);
		await next();
	} catch (e: any) {
		const message = e.message?.includes('expired') ? 'Token expired' : 'Invalid token';
		return c.json({ detail: message }, 401);
	}
}
