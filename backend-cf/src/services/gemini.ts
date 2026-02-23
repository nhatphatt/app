import type { Env } from '../types';

interface GeminiMessage {
	role: string;
	content: string;
}

export async function callGemini(apiKey: string, prompt: string): Promise<string> {
	const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
	const res = await fetch(`${url}?key=${apiKey}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			contents: [{ parts: [{ text: prompt }] }],
			generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
		}),
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Gemini API error: ${res.status} ${err}`);
	}

	const data = (await res.json()) as any;
	const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
	if (!text) throw new Error('Empty Gemini response');
	return text.trim();
}

export function buildSystemPrompt(intent: string, context: Record<string, any>, menuItems?: any[]): string {
	let base = `Bạn là trợ lý AI thông minh của nhà hàng, tên là Minitake Bot.
Nhiệm vụ của bạn là:
- Tư vấn món ăn một cách chuyên nghiệp và thân thiện
- Giúp khách hàng đặt món nhanh chóng
- Trả lời các câu hỏi về menu, giá cả, khuyến mãi
- Giao tiếp bằng tiếng Việt tự nhiên, thân thiện

Phong cách giao tiếp:
- Thân thiện, nhiệt tình nhưng không quá lải nhải
- Dùng emoji vừa phải (😊 🍴 💰 🎉)
- Câu ngắn gọn, dễ hiểu
- Tập trung vào nhu cầu của khách

⚠️ QUY TẮC QUAN TRỌNG:
- CHỈ nhắc đến các món CÓ TRONG MENU được cung cấp
- KHÔNG tự tạo ra tên món, không tưởng tượng ra món mới
- Nếu không biết, hãy gợi ý khách xem menu hoặc hỏi cụ thể hơn`;

	if (intent === 'ask_menu' && menuItems) {
		const lines = menuItems.slice(0, 15).map((item: any) => {
			let price = `${Math.round(item.price).toLocaleString()}đ`;
			if (item.has_promotion && item.discounted_price) {
				price = `~~${Math.round(item.price).toLocaleString()}đ~~ ${Math.round(item.discounted_price).toLocaleString()}đ 🎉`;
			}
			return `• ${item.name} - ${price}`;
		});
		base += `\n\nMenu hiện có (một số món nổi bật):\n${lines.join('\n')}`;
		if (menuItems.length > 15) base += `\n...và ${menuItems.length - 15} món khác`;
		base += '\n\nHãy giới thiệu menu một cách ngắn gọn và hấp dẫn, khuyến khích khách xem carousel để đặt món.';
	} else if (intent === 'ask_recommendation') {
		const recommended = context.recommended_items;
		if (recommended && recommended.length) {
			base += `\n\nCác món được gợi ý cho khách: ${recommended.join(', ')}`;
			base += '\n\nHãy giới thiệu ngắn gọn các món này. Khách sẽ thấy chi tiết món trong carousel bên dưới.';
		} else if (menuItems) {
			const names = menuItems.slice(0, 20).map((i: any) => i.name);
			base += `\n\nDanh sách món có sẵn: ${names.join(', ')}`;
			base += '\n\n⚠️ QUAN TRỌNG: Chỉ gợi ý các món có trong danh sách trên, KHÔNG tự tạo món mới.';
		}
		const cart = context.cart_items;
		if (cart && cart.length && !recommended) {
			const summary = cart.map((i: any) => `${i.name} x${i.quantity}`).join(', ');
			base += `\n\nKhách hàng đã có trong giỏ: ${summary}\nHãy gợi ý món bổ sung phù hợp từ danh sách menu.`;
		} else if (!cart?.length && !recommended) {
			base += '\n\nGiỏ hàng trống. Hãy gợi ý món phù hợp từ danh sách menu.';
		}
	} else if (intent === 'ask_promotion') {
		const promoItems = context.promotion_items;
		const promoDetails = context.promotion_details;
		if (promoItems && promoDetails) {
			base += `\n\n🎉 Các món đang khuyến mãi:\n${promoDetails.map((d: string) => `• ${d}`).join('\n')}`;
			base += '\n\nHãy giới thiệu ngắn gọn các món khuyến mãi này một cách hấp dẫn.';
		} else if (menuItems) {
			const promos = menuItems.filter((i: any) => i.has_promotion);
			if (promos.length) {
				const summary = promos.slice(0, 5).map((i: any) =>
					`- ${i.name}: ${Math.round(i.discounted_price || i.price)}đ (giảm từ ${Math.round(i.price)}đ)`
				).join('\n');
				base += `\n\nMón đang giảm giá:\n${summary}`;
			} else {
				base += '\n\nHiện tại chưa có món nào khuyến mãi. Hãy khéo léo đề xuất khách xem menu hoặc gợi ý món.';
			}
		}
	} else if (intent === 'view_cart') {
		const cart = context.cart_items;
		if (cart && cart.length) {
			const total = cart.reduce((s: number, i: any) => s + (i.price || 0) * (i.quantity || 1), 0);
			base += `\n\nGiỏ hàng hiện tại có ${cart.length} món, tổng ${Math.round(total).toLocaleString()}đ`;
		}
	} else if (intent === 'ask_item_info') {
		base += '\n\nHãy cung cấp thông tin chi tiết về món ăn khách hỏi.';
	} else if (intent === 'payment') {
		base += '\n\nHướng dẫn khách thanh toán qua giỏ hàng, không xử lý thanh toán trực tiếp trong chat.';
	}

	return base;
}

export async function generateAIResponse(
	apiKey: string,
	intent: string,
	message: string,
	context: Record<string, any>,
	menuItems?: any[],
	conversationHistory?: any[]
): Promise<string> {
	const systemPrompt = buildSystemPrompt(intent, context, menuItems);

	let convContext = '';
	if (conversationHistory && conversationHistory.length) {
		convContext = '\n\nLịch sử hội thoại gần đây:\n';
		for (const msg of conversationHistory.slice(-5)) {
			const role = msg.role === 'user' ? 'Khách hàng' : 'Trợ lý';
			convContext += `${role}: ${msg.content || ''}\n`;
		}
	}

	const fullPrompt = `${systemPrompt}${convContext}

Khách hàng hiện tại hỏi: "${message}"

Hãy trả lời một cách tự nhiên, thân thiện và hữu ích. Giữ câu trả lời ngắn gọn (2-4 câu).

Lưu ý: Nếu gợi ý món, hãy nhắc TÊN MÓN CỤ THỂ từ menu. Khách sẽ thấy các món được gợi ý trong carousel bên dưới.`;

	return callGemini(apiKey, fullPrompt);
}

export async function generateRecommendationIds(
	apiKey: string,
	context: Record<string, any>,
	menuItems: any[],
	limit: number = 3
): Promise<string[]> {
	const menuJson = JSON.stringify(menuItems.map(i => ({
		id: i.id, name: i.name, price: i.price,
		description: i.description || '',
		category_id: i.category_id,
		has_promotion: i.has_promotion || false,
		discounted_price: i.discounted_price,
	})));

	const cartItems = context.cart_items || [];
	const cartInfo = JSON.stringify(cartItems.map((i: any) => ({ name: i.name, quantity: i.quantity })));

	const prompt = `Bạn là trợ lý AI của nhà hàng. Hãy gợi ý ${limit} món ăn phù hợp nhất cho khách hàng.

Menu hiện có:
${menuJson}

Giỏ hàng hiện tại:
${cartInfo}

Hãy trả về JSON array chứa đúng ${limit} item IDs được gợi ý, ưu tiên:
1. Món có khuyến mãi (has_promotion=true)
2. Món bổ sung cho giỏ hàng (combo tốt, đa dạng)
3. Món phổ biến

Chỉ trả về JSON array của item IDs, ví dụ: ["id1", "id2", "id3"]`;

	try {
		let responseText = await callGemini(apiKey, prompt);
		if (responseText.includes('```json')) {
			responseText = responseText.split('```json')[1].split('```')[0].trim();
		} else if (responseText.includes('```')) {
			responseText = responseText.split('```')[1].split('```')[0].trim();
		}
		return JSON.parse(responseText);
	} catch {
		// Fallback: promo items first
		const promo = menuItems.filter(i => i.has_promotion).map(i => i.id);
		const other = menuItems.filter(i => !i.has_promotion).map(i => i.id);
		return [...promo, ...other].slice(0, limit);
	}
}
