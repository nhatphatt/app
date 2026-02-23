import type { Env } from '../types';
import { generateId } from '../utils/crypto';
import { generateAIResponse, generateRecommendationIds } from './gemini';

function getTimeOfDay(): string {
	const hour = new Date().getUTCHours();
	if (hour >= 6 && hour < 11) return 'breakfast';
	if (hour >= 11 && hour < 14) return 'lunch';
	if (hour >= 14 && hour < 17) return 'afternoon';
	if (hour >= 17 && hour < 21) return 'dinner';
	return 'late_night';
}

const INTENT_PATTERNS: Record<string, { priority: number; keywords: string[]; patterns: RegExp[] }> = {
	greeting: {
		priority: 1,
		keywords: ['xin chào', 'chào', 'hello', 'hi', 'hey'],
		patterns: [/^(xin\s)?chào\s?(bạn|shop|quán|anh|chị)?/i, /^(hi|hello|hey)\s?(there|bạn)?/i],
	},
	ask_recommendation: {
		priority: 2,
		keywords: ['gợi ý', 'nên ăn', 'nên uống', 'món gì', 'đặc sản', 'ngon'],
		patterns: [/(nên|có)\s(ăn|uống|gọi)\s(gì|món\s?gì)/i, /gợi\sý/i, /hôm\snay\s(ăn|uống)\sgì/i],
	},
	ask_promotion: {
		priority: 4,
		keywords: ['giảm giá', 'khuyến mãi', 'sale', 'ưu đãi', 'combo', 'rẻ hơn', 'đang giảm'],
		patterns: [/giảm\sgiá/i, /khuyến\smãi/i, /sale/i, /ưu\sđãi/i, /có\smón\snào.*(giảm|rẻ)/i],
	},
	ask_menu: {
		priority: 2,
		keywords: ['menu', 'xem menu', 'có món gì', 'thực đơn'],
		patterns: [/(xem|cho\sxem|show)\s(menu|thực\sđơn)/i, /^menu$/i],
	},
	view_cart: {
		priority: 2,
		keywords: ['giỏ hàng', 'đã đặt', 'đơn hàng', 'xem giỏ'],
		patterns: [/(xem|kiểm\stra)\s(giỏ\shàng|đơn\shàng)/i],
	},
	ask_item_info: {
		priority: 2,
		keywords: ['là gì', 'thế nào', 'như thế nào'],
		patterns: [/(.+)\s(là\sgì|thế\snào)/i, /cho\stôi\sbiết\svề/i],
	},
	order_item: {
		priority: 3,
		keywords: ['cho tôi', 'gọi', 'đặt', 'thêm', 'lấy', 'mua'],
		patterns: [/(cho|gọi|đặt|lấy)\s(tôi|mình|em)?/i, /thêm.*vào\sgiỏ/i],
	},
	payment: {
		priority: 2,
		keywords: ['thanh toán', 'trả tiền', 'pay'],
		patterns: [/thanh\stoán/i, /trả\stiền/i],
	},
	thank: {
		priority: 1,
		keywords: ['cảm ơn', 'thanks', 'thank you'],
		patterns: [/cảm\sơn/i, /thanks/i],
	},
	goodbye: {
		priority: 1,
		keywords: ['tạm biệt', 'bye', 'goodbye'],
		patterns: [/tạm\sbiệt/i, /bye/i],
	},
	help: {
		priority: 1,
		keywords: ['giúp', 'help', 'hướng dẫn'],
		patterns: [/giúp/i, /help/i, /hướng\sdẫn/i],
	},
};

function recognizeIntent(message: string): { intent: string; confidence: number; entities: Record<string, any> } {
	const lower = message.toLowerCase().trim();
	let best = { intent: 'fallback', confidence: 0, priority: 0 };

	for (const [intent, cfg] of Object.entries(INTENT_PATTERNS)) {
		let score = 0;
		for (const kw of cfg.keywords) {
			if (lower.includes(kw)) score += 0.3;
		}
		for (const pat of cfg.patterns) {
			if (pat.test(lower)) score += 0.5;
		}
		if (score > 0 && (score > best.confidence || (score === best.confidence && cfg.priority > best.priority))) {
			best = { intent, confidence: Math.min(score, 1), priority: cfg.priority };
		}
	}

	return { intent: best.intent, confidence: best.confidence || 0.1, entities: {} };
}

const FALLBACK_TEMPLATES: Record<string, string[]> = {
	greeting: [
		'Xin chào! Mình là trợ lý AI của quán. Bạn muốn gọi món gì hôm nay? 😊',
		'Chào bạn! Mình ở đây để giúp bạn tìm món ngon. Hôm nay bạn muốn ăn gì nhỉ?',
	],
	thank: ['Không có chi ạ! Chúc bạn ăn ngon miệng! 🍴'],
	goodbye: ['Tạm biệt! Hẹn gặp lại bạn lần sau! 👋'],
	help: ['Mình có thể giúp bạn:\n• Gợi ý món ăn phù hợp\n• Đặt món trực tiếp\n• Xem giỏ hàng và thanh toán\n• Tìm món giảm giá\n\nBạn muốn làm gì nhỉ?'],
	fallback: ['Xin lỗi, mình chưa hiểu rõ ý bạn. Bạn có thể nói rõ hơn được không?'],
};

function pickTemplate(intent: string): string {
	const templates = FALLBACK_TEMPLATES[intent] || FALLBACK_TEMPLATES.fallback;
	return templates[Math.floor(Math.random() * templates.length)];
}

function buildMenuCarousel(items: any[]): any {
	return {
		type: 'carousel',
		items: items.map(item => ({
			id: item.id,
			name: item.name,
			price: item.price,
			image_url: item.image_url || '',
			description: item.description || '',
			has_promotion: item.has_promotion || false,
			discounted_price: item.discounted_price,
			original_price: item.original_price,
			promotion_label: item.promotion_label,
		})),
	};
}

async function getMenuItems(db: D1Database, storeId: string): Promise<any[]> {
	const { results } = await db.prepare(
		'SELECT id, name, description, price, category_id, store_id, image_url, is_available FROM menu_items WHERE store_id = ? AND is_available = 1'
	).bind(storeId).all();

	if (!results || !results.length) return [];

	const now = new Date().toISOString();
	const { results: promos } = await db.prepare(
		'SELECT * FROM promotions WHERE store_id = ? AND is_active = 1 AND start_date <= ? AND end_date >= ?'
	).bind(storeId, now, now).all();

	if (promos && promos.length) {
		for (const item of results as any[]) {
			for (const promo of promos as any[]) {
				const applicableItems = promo.applicable_items ? JSON.parse(promo.applicable_items as string) : null;
				const applies = !applicableItems || applicableItems.includes(item.id);
				if (applies) {
					const val = promo.discount_value as number;
					if (promo.discount_type === 'percentage') {
						item.discounted_price = item.price * (1 - val / 100);
						item.has_promotion = true;
						item.original_price = item.price;
						item.promotion_label = `Giảm ${val}%`;
					} else if (promo.discount_type === 'fixed_amount') {
						item.discounted_price = Math.max(0, (item.price as number) - val);
						item.has_promotion = true;
						item.original_price = item.price;
						const pct = (item.price as number) > 0 ? Math.round(val / (item.price as number) * 100) : 0;
						item.promotion_label = `Giảm ${pct}%`;
					}
					break;
				}
			}
		}
	}
	return results as any[];
}

export async function createSession(db: D1Database, storeId: string, tableId?: string, customerPhone?: string): Promise<string> {
	const id = generateId();
	const sessionId = generateId();
	const now = new Date().toISOString();
	const context = JSON.stringify({
		current_intent: null,
		cart_items: [],
		preferences: {},
		mentioned_items: [],
		time_of_day: getTimeOfDay(),
	});
	const messages = JSON.stringify([]);

	await db.prepare(
		'INSERT INTO chatbot_conversations (id, store_id, session_id, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
	).bind(id, storeId, sessionId, messages, now, now).run();

	return sessionId;
}

async function getConversation(db: D1Database, sessionId: string): Promise<any | null> {
	return db.prepare('SELECT * FROM chatbot_conversations WHERE session_id = ?').bind(sessionId).first();
}

async function getRecentMessages(db: D1Database, sessionId: string, limit: number = 10): Promise<any[]> {
	const conv = await getConversation(db, sessionId);
	if (!conv) return [];
	const messages = JSON.parse((conv.messages as string) || '[]');
	return messages.slice(-limit);
}

async function addMessage(
	db: D1Database,
	sessionId: string,
	role: string,
	content: string,
	metadata?: Record<string, any>,
	richContent?: any
): Promise<void> {
	const conv = await getConversation(db, sessionId);
	if (!conv) return;

	const messages = JSON.parse((conv.messages as string) || '[]');
	messages.push({
		id: generateId(),
		role,
		content,
		timestamp: new Date().toISOString(),
		metadata: metadata || {},
		rich_content: richContent || null,
	});

	await db.prepare(
		'UPDATE chatbot_conversations SET messages = ?, updated_at = ? WHERE session_id = ?'
	).bind(JSON.stringify(messages), new Date().toISOString(), sessionId).run();
}

export async function processMessage(
	env: Env,
	message: string,
	sessionId: string | null,
	storeId: string,
	customerPhone?: string,
	tableId?: string,
	cartItems?: any[]
): Promise<any> {
	const db = env.DB;

	if (!sessionId) {
		sessionId = await createSession(db, storeId, tableId, customerPhone);
	}

	const conversationHistory = await getRecentMessages(db, sessionId, 10);
	const intentResult = recognizeIntent(message);

	const context: Record<string, any> = {};
	if (cartItems) context.cart_items = cartItems;

	await addMessage(db, sessionId, 'user', message, {
		intent: intentResult.intent,
		confidence: intentResult.confidence,
		entities: intentResult.entities,
	});

	let responseText: string;
	let richContent: any = null;
	let suggestedActions: any[] = [];

	const useAI = !!env.GEMINI_API_KEY;
	const menuIntents = ['ask_recommendation', 'ask_menu', 'ask_promotion', 'ask_item_info'];
	let menuItems: any[] | undefined;

	if (menuIntents.includes(intentResult.intent)) {
		menuItems = await getMenuItems(db, storeId);
	}

	if (useAI) {
		try {
			responseText = await generateAIResponse(
				env.GEMINI_API_KEY, intentResult.intent, message, context, menuItems, conversationHistory
			);

			if (intentResult.intent === 'ask_menu' && menuItems?.length) {
				richContent = buildMenuCarousel(menuItems.slice(0, 12));
				suggestedActions = [
					{ type: 'quick_reply', label: '🍽️ Gợi ý món', payload: 'gợi ý món' },
					{ type: 'quick_reply', label: '💰 Xem khuyến mãi', payload: 'có khuyến mãi gì' },
				];
			} else if (intentResult.intent === 'ask_recommendation' && menuItems?.length) {
				const recIds = await generateRecommendationIds(env.GEMINI_API_KEY, context, menuItems, 3);
				const recs = menuItems.filter(i => recIds.includes(i.id)).slice(0, 3);
				if (recs.length) {
					const recNames = recs.map(i => i.name);
					responseText = await generateAIResponse(
						env.GEMINI_API_KEY, intentResult.intent, message,
						{ ...context, recommended_items: recNames }, menuItems, conversationHistory
					);
					richContent = buildMenuCarousel(recs);
				}
				suggestedActions = [
					{ type: 'quick_reply', label: '💰 Xem khuyến mãi', payload: 'có khuyến mãi gì' },
					{ type: 'quick_reply', label: '🛒 Xem giỏ hàng', payload: 'xem giỏ hàng' },
				];
			} else if (intentResult.intent === 'ask_promotion' && menuItems?.length) {
				const promoItems = menuItems.filter(i => i.has_promotion);
				if (promoItems.length) {
					richContent = buildMenuCarousel(promoItems.slice(0, 5));
				}
				suggestedActions = [
					{ type: 'quick_reply', label: '🍽️ Gợi ý món', payload: 'gợi ý món' },
					{ type: 'quick_reply', label: '🛒 Xem giỏ hàng', payload: 'xem giỏ hàng' },
				];
			} else if (intentResult.intent === 'view_cart') {
				suggestedActions = [
					{ type: 'quick_reply', label: '🍽️ Gợi ý thêm', payload: 'gợi ý món' },
					{ type: 'quick_reply', label: '💰 Xem khuyến mãi', payload: 'có khuyến mãi gì' },
				];
			} else if (intentResult.intent === 'payment') {
				suggestedActions = [
					{ type: 'quick_reply', label: '🛒 Xem giỏ hàng', payload: 'xem giỏ hàng' },
					{ type: 'quick_reply', label: '🍽️ Gợi ý thêm', payload: 'gợi ý món' },
				];
			}
		} catch {
			responseText = pickTemplate(intentResult.intent);
		}
	} else {
		responseText = pickTemplate(intentResult.intent);
	}

	await addMessage(db, sessionId, 'assistant', responseText, { intent: intentResult.intent }, richContent);

	return {
		session_id: sessionId,
		message: responseText,
		rich_content: richContent,
		suggested_actions: suggestedActions,
		intent: intentResult.intent,
		confidence: intentResult.confidence,
	};
}

export async function handleAction(
	env: Env,
	actionType: string,
	actionPayload: Record<string, any>,
	sessionId: string,
	storeId: string
): Promise<any> {
	const db = env.DB;

	if (actionType === 'add_to_cart') {
		const itemId = actionPayload.item_id;
		const quantity = actionPayload.quantity || 1;
		if (!itemId) return { success: false, message: 'Item ID required' };

		const item = await db.prepare(
			'SELECT * FROM menu_items WHERE id = ? AND store_id = ?'
		).bind(itemId, storeId).first() as any;
		if (!item) return { success: false, message: 'Item not found' };

		const now = new Date().toISOString();
		const { results: promos } = await db.prepare(
			'SELECT * FROM promotions WHERE store_id = ? AND is_active = 1 AND start_date <= ? AND end_date >= ?'
		).bind(storeId, now, now).all();

		let finalPrice = item.price as number;
		let discountInfo: any = null;

		if (promos) {
			for (const promo of promos as any[]) {
				const applicable = promo.applicable_items ? JSON.parse(promo.applicable_items) : null;
				const applies = !applicable || applicable.includes(itemId);
				if (applies) {
					const val = promo.discount_value as number;
					if (promo.discount_type === 'percentage') {
						const discountAmt = item.price * (val / 100);
						finalPrice = item.price - discountAmt;
						discountInfo = { original_price: item.price, discounted_price: finalPrice, discount_percent: val, promotion_name: promo.name };
					} else if (promo.discount_type === 'fixed_amount') {
						finalPrice = Math.max(0, item.price - val);
						const pct = item.price > 0 ? (val / item.price) * 100 : 0;
						discountInfo = { original_price: item.price, discounted_price: finalPrice, discount_percent: pct, promotion_name: promo.name };
					}
					break;
				}
			}
		}

		const total = finalPrice * quantity;
		let responseText = `✅ Đã thêm ${quantity}x **${item.name}** vào giỏ!\n`;
		if (discountInfo) {
			const origTotal = discountInfo.original_price * quantity;
			responseText += `💰 Giá gốc: ~~${Math.round(origTotal).toLocaleString()}đ~~\n`;
			responseText += `🎉 Giá khuyến mãi: **${Math.round(total).toLocaleString()}đ** (giảm ${Math.round(discountInfo.discount_percent)}%)`;
		} else {
			responseText += `💰 Giá: ${Math.round(total).toLocaleString()}đ`;
		}

		const itemWithPrice: any = { ...item };
		if (discountInfo) {
			itemWithPrice.discounted_price = discountInfo.discounted_price;
			itemWithPrice.original_price = discountInfo.original_price;
			itemWithPrice.has_promotion = true;
			itemWithPrice.promotion_label = `Giảm ${Math.round(discountInfo.discount_percent)}%`;
		}

		await addMessage(db, sessionId, 'assistant', responseText, { action: 'add_to_cart', item_id: itemId, discount_info: discountInfo });

		return { success: true, message: responseText, item: itemWithPrice, quantity, discount_info: discountInfo };
	}

	if (actionType === 'remove_from_cart') {
		if (!actionPayload.item_id) return { success: false, message: 'Item ID required' };
		return { success: true, message: 'Đã xóa món khỏi giỏ hàng' };
	}

	if (actionType === 'view_detail') {
		const itemId = actionPayload.item_id;
		if (!itemId) return { success: false, message: 'Item ID required' };
		const item = await db.prepare(
			'SELECT * FROM menu_items WHERE id = ? AND store_id = ?'
		).bind(itemId, storeId).first();
		if (!item) return { success: false, message: 'Item not found' };
		return { success: true, item };
	}

	return { success: false, message: 'Unknown action type' };
}

export async function getConversationHistory(db: D1Database, sessionId: string, limit: number = 20): Promise<any> {
	const messages = await getRecentMessages(db, sessionId, limit);
	return { session_id: sessionId, messages };
}
