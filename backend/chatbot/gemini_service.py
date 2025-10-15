"""
Google Gemini AI Service

Integrates Google's Gemini AI for intelligent chatbot responses.
"""

import os
import json
from typing import Dict, List, Optional
import google.generativeai as genai


class GeminiService:
    """
    Service for interacting with Google Gemini AI
    """

    def __init__(self):
        # Configure Gemini API
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")

        genai.configure(api_key=api_key)

        # Use Gemini Flash Latest for fast responses with higher quota
        # Free tier: 15 RPM (requests per minute) vs 2 RPM for Pro
        self.model = genai.GenerativeModel('gemini-flash-latest')

        # System instructions for the chatbot
        self.system_context = """Bạn là trợ lý AI thông minh cho hệ thống đặt món ăn Minitake.

NHIỆM VỤ:
- Giúp khách hàng chọn món ăn, đồ uống phù hợp
- Trả lời câu hỏi về thực đơn, giá cả, khuyến mãi
- Hỗ trợ đặt món, xem giỏ hàng
- Gợi ý món ăn dựa trên sở thích, thời gian, ngữ cảnh

PHONG CÁCH:
- Thân thiện, nhiệt tình như nhân viên phục vụ chuyên nghiệp
- Trả lời bằng tiếng Việt tự nhiên, dễ hiểu
- Ngắn gọn, súc tích (2-3 câu)
- Emoji phù hợp (😊 🍴 👍)

QUY TẮC:
- KHÔNG bịa đặt món ăn không có trong menu
- LUÔN đề xuất dựa trên menu thực tế
- NẾU không chắc chắn, hỏi lại khách hàng
- Ưu tiên món có khuyến mãi khi gợi ý

THANH TOÁN:
- KHÔNG xử lý thanh toán trong chatbot
- KHI khách hỏi về thanh toán, hướng dẫn: "Để thanh toán, bạn vui lòng mở giỏ hàng và nhấn nút Thanh toán nhé! 💳"
- KHI khách muốn đặt món xong, nhắc: "Bạn có thể xem giỏ hàng và thanh toán bất cứ lúc nào! 🛒"
"""

    def detect_intent(self, message: str, conversation_history: List[Dict] = None) -> Dict:
        """
        Use Gemini to detect user intent and extract entities

        Returns:
            {
                "intent": str,  # greeting, ask_recommendation, order_item, etc.
                "confidence": float,  # 0.0 to 1.0
                "entities": dict,  # extracted entities (item_name, quantity, etc.)
                "response_type": str  # Type of response expected
            }
        """

        # Build prompt for intent detection
        prompt = f"""{self.system_context}

PHÂN TÍCH TIN NHẮN:
Tin nhắn của khách: "{message}"

Hãy phân tích và trả về JSON với format sau:
{{
  "intent": "<one of: greeting, ask_recommendation, ask_item_info, order_item, view_cart, modify_cart, ask_promotion, ask_menu, payment, help, thank, goodbye, fallback>",
  "confidence": <0.0 to 1.0>,
  "entities": {{
    "item_name": "<tên món nếu có>",
    "quantity": <số lượng nếu có>,
    "category": "<loại món: đồ ăn/đồ uống/tráng miệng nếu có>"
  }},
  "response_type": "<greeting/recommendation/item_info/order_confirmation/cart_display/etc>"
}}

CHỈ trả về JSON, không giải thích thêm.
"""

        try:
            response = self.model.generate_content(prompt)
            result_text = response.text.strip()

            # Remove markdown code blocks if present
            if result_text.startswith('```json'):
                result_text = result_text[7:]
            if result_text.startswith('```'):
                result_text = result_text[3:]
            if result_text.endswith('```'):
                result_text = result_text[:-3]

            result_text = result_text.strip()

            # Parse JSON response
            intent_data = json.loads(result_text)

            return intent_data

        except Exception as e:
            print(f"Error in Gemini intent detection: {e}")
            # Fallback to default
            return {
                "intent": "fallback",
                "confidence": 0.5,
                "entities": {},
                "response_type": "fallback"
            }

    def generate_response(
        self,
        intent: str,
        message: str,
        context: Dict,
        menu_items: List[Dict] = None,
        conversation_history: List[Dict] = None
    ) -> str:
        """
        Generate natural language response using Gemini

        Args:
            intent: Detected intent
            message: Original user message
            context: Conversation context (cart, customer info, etc.)
            menu_items: Available menu items (for recommendations)
            conversation_history: Previous messages

        Returns:
            Natural language response
        """

        # Build context information
        context_info = []

        if context.get('cart_items'):
            cart_summary = []
            for item in context['cart_items']:
                cart_summary.append(f"- {item.get('name')} x{item.get('quantity', 1)}")
            context_info.append(f"Giỏ hàng hiện tại:\n" + "\n".join(cart_summary))
        else:
            context_info.append("Giỏ hàng: trống")

        if context.get('time_of_day'):
            context_info.append(f"Thời gian: {context['time_of_day']}")

        # Menu items context
        menu_context = ""
        if menu_items and len(menu_items) > 0:
            menu_context = "\n\nMỘT SỐ MÓN TRONG MENU:\n"
            for item in menu_items[:10]:  # Limit to 10 items to save tokens
                price = item.get('discounted_price') if item.get('has_promotion') else item.get('price', 0)
                promo_tag = " [KHUYẾN MÃI]" if item.get('has_promotion') else ""
                menu_context += f"- {item.get('name')}: {price:,.0f}đ{promo_tag}\n"

        # Build conversation history
        history_text = ""
        if conversation_history and len(conversation_history) > 0:
            history_text = "\n\nHỘI THOẠI TRƯỚC:\n"
            for msg in conversation_history[-5:]:  # Last 5 messages
                role = "Khách" if msg.get('role') == 'user' else "Bot"
                history_text += f"{role}: {msg.get('content')}\n"

        # Build full prompt
        prompt = f"""{self.system_context}

NGỮ CẢNH:
{chr(10).join(context_info)}
{menu_context}
{history_text}

TIN NHẮN MỚI:
Intent: {intent}
Khách hàng: "{message}"

Hãy trả lời khách hàng một cách tự nhiên, thân thiện.
- NẾU intent là "ask_recommendation": Gợi ý 2-3 món phù hợp từ menu
- NẾU intent là "order_item": Xác nhận đã thêm món vào giỏ hàng
- NẾU intent là "view_cart": Liệt kê món trong giỏ hàng
- NẾU intent là "ask_promotion": Giới thiệu món đang khuyến mãi

CHỈ trả về câu trả lời, KHÔNG thêm giải thích hay metadata.
Độ dài: 2-4 câu.
"""

        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()

        except Exception as e:
            print(f"Error in Gemini response generation: {e}")
            return "Xin lỗi, mình đang gặp chút vấn đề kỹ thuật. Bạn thử lại sau chút nhé! 😅"

    def generate_recommendation(
        self,
        context: Dict,
        menu_items: List[Dict],
        limit: int = 3
    ) -> List[Dict]:
        """
        Use Gemini to intelligently select recommendations

        Args:
            context: User context (time, cart, preferences)
            menu_items: All available menu items
            limit: Number of recommendations to return

        Returns:
            List of recommended items with reasons
        """

        if not menu_items or len(menu_items) == 0:
            return []

        # Build menu list for Gemini
        menu_text = ""
        for idx, item in enumerate(menu_items):
            price = item.get('discounted_price') if item.get('has_promotion') else item.get('price', 0)
            promo = " [KHUYẾN MÃI]" if item.get('has_promotion') else ""
            category = item.get('category', {}).get('name', '')
            menu_text += f"{idx}. {item.get('name')} - {category} - {price:,.0f}đ{promo}\n"

        # Build context
        time_of_day = context.get('time_of_day', 'day')
        cart_items = context.get('cart_items', [])
        cart_text = ", ".join([item.get('name') for item in cart_items]) if cart_items else "trống"

        prompt = f"""{self.system_context}

MENU HIỆN TẠI:
{menu_text}

NGỮ CẢNH:
- Thời gian: {time_of_day}
- Giỏ hàng: {cart_text}

Hãy chọn {limit} món phù hợp nhất để gợi ý cho khách hàng.

Trả về JSON format:
{{
  "recommendations": [
    {{
      "index": <index của món trong menu>,
      "reason": "<lý do gợi ý ngắn gọn>"
    }}
  ]
}}

QUY TẮC:
- Ưu tiên món có khuyến mãi
- Phù hợp với thời gian (sáng→breakfast, trưa→lunch, tối→dinner)
- Đa dạng loại món (đồ ăn + đồ uống)
- KHÔNG chọn món đã có trong giỏ hàng

CHỈ trả về JSON, không giải thích.
"""

        try:
            response = self.model.generate_content(prompt)
            result_text = response.text.strip()

            # Clean markdown
            if result_text.startswith('```json'):
                result_text = result_text[7:]
            if result_text.startswith('```'):
                result_text = result_text[3:]
            if result_text.endswith('```'):
                result_text = result_text[:-3]
            result_text = result_text.strip()

            # Parse response
            result = json.loads(result_text)
            recommendations = []

            for rec in result.get('recommendations', []):
                idx = rec.get('index')
                if idx is not None and 0 <= idx < len(menu_items):
                    item = menu_items[idx]
                    recommendations.append({
                        **item,
                        'recommendation_reason': rec.get('reason', 'Món ngon được nhiều người yêu thích')
                    })

            return recommendations[:limit]

        except Exception as e:
            print(f"Error in Gemini recommendation: {e}")
            # Fallback to first N items with promotions
            promo_items = [item for item in menu_items if item.get('has_promotion')]
            return promo_items[:limit] if promo_items else menu_items[:limit]
