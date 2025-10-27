"""
Gemini AI Service - Integration with Google's Gemini AI

Provides natural language understanding and response generation using
Google's Gemini 2.0 Flash Experimental model.
"""

import os
import json
from typing import Dict, List, Optional
import google.generativeai as genai


class GeminiService:
    """
    Service for interacting with Google's Gemini AI
    """

    def __init__(self):
        """Initialize Gemini AI with API key from environment"""
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")

        # Configure Gemini
        genai.configure(api_key=api_key)

        # Use Gemini 2.0 Flash Experimental - fastest and latest model
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')

        print(f"✓ Gemini AI initialized successfully with model: gemini-2.0-flash-exp")

    def generate_response(
        self,
        intent: str,
        message: str,
        context: Dict,
        menu_items: Optional[List[Dict]] = None,
        conversation_history: Optional[List[Dict]] = None
    ) -> str:
        """
        Generate natural language response using Gemini AI

        Args:
            intent: Recognized intent (greeting, ask_recommendation, etc.)
            message: Original user message
            context: Conversation context (cart, preferences, etc.)
            menu_items: Available menu items for recommendations
            conversation_history: Recent conversation for context

        Returns:
            str: AI-generated response text
        """
        try:
            # Build system prompt
            system_prompt = self._build_system_prompt(intent, context, menu_items)

            # Build conversation context
            conversation_context = ""
            if conversation_history:
                conversation_context = "\n\nLịch sử hội thoại gần đây:\n"
                for msg in conversation_history[-5:]:  # Last 5 messages
                    role = "Khách hàng" if msg.get("role") == "user" else "Trợ lý"
                    conversation_context += f"{role}: {msg.get('content', '')}\n"

            # Build full prompt
            full_prompt = f"""{system_prompt}

{conversation_context}

Khách hàng hiện tại hỏi: "{message}"

Hãy trả lời một cách tự nhiên, thân thiện và hữu ích. Giữ câu trả lời ngắn gọn (2-4 câu).

Lưu ý: Nếu gợi ý món, hãy nhắc TÊN MÓN CỤ THỂ từ menu. Khách sẽ thấy các món được gợi ý trong carousel bên dưới.
"""

            # Generate response
            response = self.model.generate_content(full_prompt)
            return response.text.strip()

        except Exception as e:
            print(f"❌ Gemini API error: {e}")
            raise

    def generate_recommendation(
        self,
        context: Dict,
        menu_items: List[Dict],
        limit: int = 3
    ) -> List[Dict]:
        """
        Generate personalized menu recommendations using AI

        Args:
            context: User context (preferences, cart, order history)
            menu_items: Available menu items
            limit: Number of recommendations to return

        Returns:
            List[Dict]: Recommended menu items
        """
        try:
            # Build recommendation prompt
            menu_json = json.dumps([{
                "id": item.get("id"),
                "name": item.get("name"),
                "price": item.get("price"),
                "description": item.get("description", ""),
                "category_id": item.get("category_id"),
                "has_promotion": item.get("has_promotion", False),
                "discounted_price": item.get("discounted_price")
            } for item in menu_items], ensure_ascii=False)

            cart_items = context.get('cart_items', [])
            cart_info = json.dumps([{
                "name": item.get("name"),
                "quantity": item.get("quantity")
            } for item in cart_items], ensure_ascii=False) if cart_items else "[]"

            prompt = f"""Bạn là trợ lý AI của nhà hàng. Hãy gợi ý {limit} món ăn phù hợp nhất cho khách hàng.

Menu hiện có:
{menu_json}

Giỏ hàng hiện tại:
{cart_info}

Hãy trả về JSON array chứa đúng {limit} item IDs được gợi ý, ưu tiên:
1. Món có khuyến mãi (has_promotion=true)
2. Món bổ sung cho giỏ hàng (combo tốt, đa dạng)
3. Món phổ biến

Chỉ trả về JSON array của item IDs, ví dụ: ["id1", "id2", "id3"]
"""

            response = self.model.generate_content(prompt)
            response_text = response.text.strip()

            # Extract JSON from response
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()

            recommended_ids = json.loads(response_text)

            # Return full item objects
            return [item for item in menu_items if item.get("id") in recommended_ids][:limit]

        except Exception as e:
            print(f"❌ Gemini recommendation error: {e}, falling back to simple selection")
            # Fallback: return items with promotions first, then random
            promo_items = [item for item in menu_items if item.get('has_promotion')]
            other_items = [item for item in menu_items if not item.get('has_promotion')]
            return (promo_items + other_items)[:limit]

    def _build_system_prompt(
        self,
        intent: str,
        context: Dict,
        menu_items: Optional[List[Dict]]
    ) -> str:
        """Build system prompt based on intent and context"""

        base_prompt = """Bạn là trợ lý AI thông minh của nhà hàng, tên là Minitake Bot. 
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
- Nếu không biết, hãy gợi ý khách xem menu hoặc hỏi cụ thể hơn
"""

        # Add context based on intent
        if intent == "ask_menu":
            if menu_items:
                # Group by category for better presentation
                categories = {}
                for item in menu_items[:20]:  # Limit to 20 items
                    cat_id = item.get('category_id', 'other')
                    if cat_id not in categories:
                        categories[cat_id] = []
                    
                    price_display = f"{int(item.get('price', 0)):,}đ"
                    if item.get('has_promotion'):
                        price_display = f"~~{int(item.get('price', 0)):,}đ~~ {int(item.get('discounted_price', 0)):,}đ 🎉"
                    
                    categories[cat_id].append(f"• {item.get('name')} - {price_display}")
                
                menu_list = []
                for items in categories.values():
                    menu_list.extend(items[:5])  # Max 5 per category
                
                base_prompt += f"\n\nMenu hiện có (một số món nổi bật):\n"
                base_prompt += "\n".join(menu_list[:15])  # Max 15 items total
                
                if len(menu_items) > 15:
                    base_prompt += f"\n...và {len(menu_items) - 15} món khác"
                
                base_prompt += "\n\nHãy giới thiệu menu một cách ngắn gọn và hấp dẫn, khuyến khích khách xem carousel để đặt món."

        elif intent == "ask_recommendation":
            # Check if specific items were already selected
            recommended_items = context.get('recommended_items', [])
            
            if recommended_items:
                # Items already selected, mention them specifically
                items_text = ", ".join(recommended_items)
                base_prompt += f"\n\nCác món được gợi ý cho khách: {items_text}"
                base_prompt += "\n\nHãy giới thiệu ngắn gọn các món này (tại sao chúng phù hợp). Khách sẽ thấy chi tiết món trong carousel bên dưới."
            elif menu_items:
                # No items selected yet, show available menu
                menu_names = [item.get('name') for item in menu_items[:20]]
                base_prompt += f"\n\nDanh sách món có sẵn: {', '.join(menu_names)}"
                if len(menu_items) > 20:
                    base_prompt += f" và {len(menu_items) - 20} món khác"
                base_prompt += "\n\n⚠️ QUAN TRỌNG: Chỉ gợi ý các món có trong danh sách trên, KHÔNG tự tạo món mới."
            
            cart_items = context.get('cart_items', [])
            if cart_items and 'recommended_items' not in context:
                cart_summary = ", ".join([f"{item.get('name')} x{item.get('quantity')}" for item in cart_items])
                base_prompt += f"\n\nKhách hàng đã có trong giỏ: {cart_summary}"
                base_prompt += "\nHãy gợi ý món bổ sung phù hợp từ danh sách menu."
            elif not cart_items and 'recommended_items' not in context:
                base_prompt += "\n\nGiỏ hàng trống. Hãy gợi ý món phù hợp từ danh sách menu."

        elif intent == "ask_promotion":
            promotion_items = context.get('promotion_items', [])
            promotion_details = context.get('promotion_details', [])
            
            if promotion_items and promotion_details:
                # Specific promotions found, mention them
                base_prompt += f"\n\n🎉 Các món đang khuyến mãi:\n"
                base_prompt += "\n".join([f"• {detail}" for detail in promotion_details])
                base_prompt += "\n\nHãy giới thiệu ngắn gọn các món khuyến mãi này một cách hấp dẫn. Khách sẽ thấy chi tiết trong carousel bên dưới."
            elif menu_items:
                promo_items = [item for item in menu_items if item.get('has_promotion')]
                if promo_items:
                    promo_summary = "\n".join([
                        f"- {item.get('name')}: {int(item.get('discounted_price', item.get('price')))}đ (giảm từ {int(item.get('price'))}đ)"
                        for item in promo_items[:5]
                    ])
                    base_prompt += f"\n\nMón đang giảm giá:\n{promo_summary}"
                else:
                    base_prompt += "\n\nHiện tại chưa có món nào khuyến mãi. Hãy khéo léo đề xuất khách xem menu hoặc gợi ý món."

        elif intent == "view_cart":
            cart_items = context.get('cart_items', [])
            if cart_items:
                total = sum(item.get('price', 0) * item.get('quantity', 1) for item in cart_items)
                base_prompt += f"\n\nGiỏ hàng hiện tại có {len(cart_items)} món, tổng {int(total):,}đ"

        elif intent == "ask_item_info":
            base_prompt += "\n\nHãy cung cấp thông tin chi tiết về món ăn khách hỏi."

        elif intent == "payment":
            base_prompt += "\n\nHướng dẫn khách thanh toán qua giỏ hàng, không xử lý thanh toán trực tiếp trong chat."

        return base_prompt
