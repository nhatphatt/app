"""
Response Generator - Generates natural language responses

Creates contextual, personalized responses based on intent and conversation state.
Can use either templates (fallback) or Gemini AI (preferred).
"""

from typing import Dict, List, Optional
import random
import os


class ResponseGenerator:
    """
    Generates natural language responses for different intents
    """

    def __init__(self, db, use_ai: bool = False):
        self.db = db
        self.response_templates = self._load_response_templates()

        # Check GEMINI_API_KEY
        api_key = os.environ.get('GEMINI_API_KEY')
        print(f"[ResponseGenerator] Checking GEMINI_API_KEY...")
        print(f"[ResponseGenerator] use_ai parameter: {use_ai}")
        print(f"[ResponseGenerator] GEMINI_API_KEY exists: {api_key is not None}")
        if api_key:
            print(f"[ResponseGenerator] API key preview: {api_key[:10]}...{api_key[-4:]}")

        self.use_ai = use_ai and api_key is not None
        self.gemini_service = None

        print(f"[ResponseGenerator] Final use_ai value: {self.use_ai}")

        # Initialize Gemini if enabled
        if self.use_ai:
            print(f"[ResponseGenerator] Attempting to initialize Gemini...")
            try:
                from chatbot.gemini_service import GeminiService
                print(f"[ResponseGenerator] GeminiService imported successfully")
                self.gemini_service = GeminiService()
                print("✓ Gemini AI enabled for response generation")
            except Exception as e:
                print(f"⚠ Gemini AI not available: {e}")
                print("  Falling back to templates")
                import traceback
                traceback.print_exc()
                self.use_ai = False
        else:
            print(f"[ResponseGenerator] Skipping Gemini initialization (use_ai=False)")

    def _load_response_templates(self) -> Dict:
        """
        Define response templates for each intent
        """
        return {
            "greeting": [
                "Xin chào! Mình là trợ lý AI của quán. Bạn muốn gọi món gì hôm nay? 😊",
                "Chào bạn! Mình ở đây để giúp bạn tìm món ngon. Hôm nay bạn muốn ăn gì nhỉ?",
                "Hi! Để mình giúp bạn chọn món nhé. Bạn muốn xem gợi ý không?"
            ],

            "thank": [
                "Không có chi ạ! Chúc bạn ăn ngon miệng! 🍴",
                "Rất vui được giúp bạn! Hãy gọi mình nếu cần gì nhé 😊",
                "Dạ, không có gì! Chúc bạn có bữa ăn tuyệt vời!"
            ],

            "goodbye": [
                "Tạm biệt! Hẹn gặp lại bạn lần sau! 👋",
                "Bye bye! Chúc bạn một ngày tốt lành! 😊",
                "Hẹn gặp lại bạn! Nhớ ghé lại quán nhé!"
            ],

            "help": [
                "Mình có thể giúp bạn:\n• Gợi ý món ăn phù hợp\n• Đặt món trực tiếp\n• Xem giỏ hàng và thanh toán\n• Tìm món giảm giá, combo hời\n\nBạn muốn làm gì nhỉ?"
            ],

            "fallback": [
                "Xin lỗi, mình chưa hiểu rõ ý bạn lắm. Bạn có thể nói rõ hơn được không?",
                "Hmm, mình chưa nắm được ý bạn. Bạn muốn gọi món, xem gợi ý hay hỏi về món nào ạ?",
                "Mình hơi confused nè. Bạn có thể hỏi lại với cách khác được không?"
            ]
        }

    async def generate_response(
        self,
        intent: str,
        entities: Dict,
        context: Dict,
        store_id: str,
        original_message: str = "",
        conversation_history: List[Dict] = None
    ) -> Dict:
        """
        Generate response based on intent and context

        Returns:
            Dict with text, rich_content, and suggested_actions
        """
        response_type = intent

        # Use Gemini AI for natural responses if available
        if self.use_ai and self.gemini_service and original_message:
            try:
                # Get menu items for context (for recommendation/menu/promotion intents)
                menu_items = None
                if intent in ["ask_recommendation", "ask_menu", "ask_promotion", "ask_item_info"]:
                    menu_items = await self._get_menu_items(store_id)

                # Generate AI response
                ai_text = self.gemini_service.generate_response(
                    intent=intent,
                    message=original_message,
                    context=context,
                    menu_items=menu_items,
                    conversation_history=conversation_history
                )

                # For some intents, still add rich content
                rich_content = None
                suggested_actions = None

                if intent == "ask_recommendation" and menu_items:
                    # Use AI to pick best recommendations
                    recommendations = self.gemini_service.generate_recommendation(
                        context=context,
                        menu_items=menu_items,
                        limit=3
                    )
                    if recommendations:
                        rich_content = self._build_menu_carousel(recommendations)
                        suggested_actions = [
                            {"type": "quick_reply", "label": "💰 Xem khuyến mãi", "payload": "có khuyến mãi gì"},
                            {"type": "quick_reply", "label": "🛒 Xem giỏ hàng", "payload": "xem giỏ hàng"}
                        ]

                elif intent == "view_cart":
                    rich_content = self._build_cart_display(context.get('cart_items', []))
                    suggested_actions = [
                        {"type": "quick_reply", "label": "🍽️ Gợi ý thêm", "payload": "gợi ý món"},
                        {"type": "quick_reply", "label": "💰 Xem khuyến mãi", "payload": "có khuyến mãi gì"}
                    ]

                elif intent == "payment":
                    # Don't handle payment in chatbot, redirect to cart
                    suggested_actions = [
                        {"type": "quick_reply", "label": "🛒 Xem giỏ hàng", "payload": "xem giỏ hàng"},
                        {"type": "quick_reply", "label": "🍽️ Gợi ý thêm", "payload": "gợi ý món"}
                    ]

                elif intent == "ask_promotion" and menu_items:
                    promo_items = [item for item in menu_items if item.get('has_promotion')]
                    if promo_items:
                        rich_content = self._build_menu_carousel(promo_items[:5])

                return {
                    "text": ai_text,
                    "rich_content": rich_content,
                    "suggested_actions": suggested_actions
                }

            except Exception as e:
                print(f"❌ Gemini response generation failed: {e}, falling back to templates")
                import traceback
                traceback.print_exc()

        # Fallback to template-based responses
        # Route to specific generator based on intent
        if intent == "greeting":
            return self._generate_greeting()

        elif intent == "ask_recommendation":
            return await self._generate_recommendation_response(entities, context, store_id)

        elif intent == "ask_item_info":
            return await self._generate_item_info_response(entities, store_id)

        elif intent == "order_item":
            return await self._generate_order_response(entities, context, store_id)

        elif intent == "view_cart":
            return await self._generate_cart_response(context, store_id)

        elif intent == "ask_promotion":
            return await self._generate_promotion_response(store_id)

        elif intent == "payment":
            return await self._generate_payment_response(context, store_id)

        elif intent in ["thank", "goodbye", "help"]:
            return self._generate_simple_response(intent)

        else:
            return self._generate_fallback_response()

    def _generate_greeting(self) -> Dict:
        """Generate greeting response"""
        return {
            "text": random.choice(self.response_templates["greeting"]),
            "rich_content": None,
            "suggested_actions": [
                {"type": "quick_reply", "label": "🍽️ Gợi ý món", "payload": "gợi ý món"},
                {"type": "quick_reply", "label": "💰 Xem khuyến mãi", "payload": "có khuyến mãi gì"},
                {"type": "quick_reply", "label": "📋 Xem menu", "payload": "xem menu"}
            ]
        }

    async def _generate_recommendation_response(
        self,
        entities: Dict,
        context: Dict,
        store_id: str
    ) -> Dict:
        """
        Generate simple recommendation response (fallback when AI is not available)
        Just shows popular/promoted items
        """
        # Get menu items with promotions first, then popular items
        menu_items = await self._get_menu_items(store_id)

        if not menu_items:
            return {
                "text": "Hiện tại quán chưa có món nào. Vui lòng quay lại sau nhé!",
                "rich_content": None,
                "suggested_actions": []
            }

        # Prioritize promoted items
        promo_items = [item for item in menu_items if item.get('has_promotion')]

        # Get 3 recommendations: promoted first, then others
        recommendations = (promo_items + menu_items)[:3]

        # Generate intro text
        intro = "Mình gợi ý cho bạn những món này nhé:"

        # Build rich content carousel
        rich_content = self._build_menu_carousel(recommendations)

        return {
            "text": intro,
            "rich_content": rich_content,
            "suggested_actions": [
                {"type": "quick_reply", "label": "🔄 Gợi ý món khác", "payload": "gợi ý món khác"},
                {"type": "quick_reply", "label": "🛒 Xem giỏ hàng", "payload": "xem giỏ hàng"}
            ]
        }

    async def _generate_item_info_response(
        self,
        entities: Dict,
        store_id: str
    ) -> Dict:
        """
        Generate response with item information
        """
        item_name = entities.get("item_name", "")

        if not item_name:
            return {
                "text": "Bạn muốn hỏi về món nào ạ? Có thể nói rõ tên món giúp mình nhé!",
                "rich_content": None,
                "suggested_actions": []
            }

        # Find item by name (fuzzy search)
        item = await self._find_item_by_name(item_name, store_id)

        if not item:
            return {
                "text": f"Xin lỗi, mình không tìm thấy món '{item_name}'. Bạn có thể xem menu hoặc gợi ý món nhé!",
                "rich_content": None,
                "suggested_actions": [
                    {"type": "quick_reply", "label": "📋 Xem menu", "payload": "xem menu"},
                    {"type": "quick_reply", "label": "🍽️ Gợi ý món", "payload": "gợi ý món"}
                ]
            }

        # Build detailed item info
        info_text = f"**{item['name']}** - {item['price']:,}đ\n\n"

        if item.get("description"):
            info_text += f"{item['description']}\n\n"

        # Add promotion info if available
        if item.get("has_promotion"):
            info_text += f"🎉 {item['promotion_label']} - Giá sau giảm: {item['discounted_price']:,}đ\n\n"

        # Get category
        category = await self.db.categories.find_one({"id": item["category_id"]}, {"_id": 0})
        if category:
            info_text += f"📁 Danh mục: {category['name']}\n"

        rich_content = {
            "type": "item_detail_card",
            "item": {
                "id": item["id"],
                "name": item["name"],
                "description": item.get("description"),
                "price": item["price"],
                "discounted_price": item.get("discounted_price"),
                "image_url": item.get("image_url"),
                "has_promotion": item.get("has_promotion", False)
            }
        }

        return {
            "text": info_text,
            "rich_content": rich_content,
            "suggested_actions": [
                {
                    "type": "add_to_cart",
                    "label": "🛒 Thêm vào giỏ",
                    "payload": f"add_to_cart:{item['id']}"
                },
                {
                    "type": "quick_reply",
                    "label": "🍽️ Món khác",
                    "payload": "gợi ý món"
                }
            ]
        }

    async def _generate_order_response(
        self,
        entities: Dict,
        context: Dict,
        store_id: str
    ) -> Dict:
        """
        Generate response for order intent
        """
        item_name = entities.get("item_name", "")
        quantity = entities.get("quantity", 1)

        if not item_name:
            return {
                "text": "Bạn muốn gọi món gì ạ? Có thể nói rõ tên món giúp mình nhé!",
                "rich_content": None,
                "suggested_actions": []
            }

        # Find item
        item = await self._find_item_by_name(item_name, store_id)

        if not item:
            return {
                "text": f"Xin lỗi, mình không tìm thấy món '{item_name}'. Bạn xem gợi ý nhé!",
                "rich_content": None,
                "suggested_actions": [
                    {"type": "quick_reply", "label": "🍽️ Gợi ý món", "payload": "gợi ý món"}
                ]
            }

        # Calculate total
        price = item.get("discounted_price") or item["price"]
        total = price * quantity

        response_text = f"Dạ, mình đã thêm vào giỏ:\n\n"
        response_text += f"• {quantity}x **{item['name']}** - {total:,}đ\n\n"

        # Get current cart total
        cart_items = context.get("cart_items", [])
        if len(cart_items) > 0:
            response_text += f"💰 Tổng giỏ hàng hiện tại: ... đ\n\n"

        response_text += "Bạn muốn thêm gì nữa không?"

        return {
            "text": response_text,
            "rich_content": {
                "type": "order_confirmation",
                "item": item,
                "quantity": quantity,
                "total": total
            },
            "suggested_actions": [
                {"type": "quick_reply", "label": "✅ Xác nhận đặt món", "payload": "xác nhận"},
                {"type": "quick_reply", "label": "🍽️ Thêm món khác", "payload": "gợi ý món"},
                {"type": "quick_reply", "label": "🛒 Xem giỏ hàng", "payload": "xem giỏ hàng"}
            ]
        }

    async def _generate_cart_response(
        self,
        context: Dict,
        store_id: str
    ) -> Dict:
        """
        Generate cart display response
        """
        cart_items = context.get("cart_items", [])

        if not cart_items:
            return {
                "text": "Giỏ hàng của bạn đang trống. Hãy chọn món để bắt đầu nhé! 🍽️",
                "rich_content": None,
                "suggested_actions": [
                    {"type": "quick_reply", "label": "🍽️ Gợi ý món", "payload": "gợi ý món"}
                ]
            }

        # Get full item details
        items = await self.db.menu_items.find({
            "id": {"$in": cart_items}
        }, {"_id": 0}).to_list(100)

        response_text = "🛒 **GIỎ HÀNG CỦA BẠN**\n\n"
        total = 0

        for item in items:
            price = item.get("discounted_price") or item["price"]
            response_text += f"• {item['name']} - {price:,}đ\n"
            total += price

        response_text += f"\n💰 **Tổng cộng: {total:,}đ**"

        return {
            "text": response_text,
            "rich_content": {
                "type": "cart_summary",
                "items": items,
                "total": total
            },
            "suggested_actions": [
                {"type": "quick_reply", "label": "✅ Đặt món ngay", "payload": "đặt món"},
                {"type": "quick_reply", "label": "🍽️ Thêm món", "payload": "gợi ý món"}
            ]
        }

    async def _generate_promotion_response(self, store_id: str) -> Dict:
        """
        Generate promotions list response
        """
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc).isoformat()
        promotions = await self.db.promotions.find({
            "store_id": store_id,
            "is_active": True,
            "start_date": {"$lte": now},
            "end_date": {"$gte": now}
        }, {"_id": 0}).to_list(10)

        if not promotions:
            return {
                "text": "Hiện tại quán chưa có chương trình khuyến mãi nào ạ. Bạn có thể xem menu nhé!",
                "rich_content": None,
                "suggested_actions": [
                    {"type": "quick_reply", "label": "📋 Xem menu", "payload": "xem menu"}
                ]
            }

        response_text = "🎉 **KHUYẾN MÃI ĐANG DIỄN RA**\n\n"

        for promo in promotions:
            response_text += f"• **{promo['name']}**\n"
            if promo.get("description"):
                response_text += f"  {promo['description']}\n"
            response_text += "\n"

        return {
            "text": response_text,
            "rich_content": {
                "type": "promotions_list",
                "promotions": promotions
            },
            "suggested_actions": [
                {"type": "quick_reply", "label": "🍽️ Xem món giảm giá", "payload": "món giảm giá"}
            ]
        }

    async def _generate_payment_response(
        self,
        context: Dict,
        store_id: str
    ) -> Dict:
        """
        Redirect user to cart for payment (don't handle payment in chatbot)
        """
        cart_items = context.get("cart_items", [])

        if not cart_items or len(cart_items) == 0:
            return {
                "text": "Giỏ hàng của bạn đang trống. Hãy chọn món trước nhé! 🍽️",
                "rich_content": None,
                "suggested_actions": [
                    {"type": "quick_reply", "label": "🍽️ Gợi ý món", "payload": "gợi ý món"}
                ]
            }

        return {
            "text": "Để thanh toán, bạn vui lòng mở Giỏ hàng và nhấn nút Thanh toán nhé! 💳\n\nBạn có thể chọn phương thức thanh toán tiện lợi: Tiền mặt, Chuyển khoản, hoặc MoMo.",
            "rich_content": None,
            "suggested_actions": [
                {"type": "quick_reply", "label": "🛒 Xem giỏ hàng", "payload": "xem giỏ hàng"},
                {"type": "quick_reply", "label": "🍽️ Gợi ý thêm món", "payload": "gợi ý món"}
            ]
        }

    def _generate_simple_response(self, intent: str) -> Dict:
        """
        Generate simple template-based response
        """
        return {
            "text": random.choice(self.response_templates[intent]),
            "rich_content": None,
            "suggested_actions": []
        }

    def _generate_fallback_response(self) -> Dict:
        """
        Generate fallback response for unknown intent
        """
        return {
            "text": random.choice(self.response_templates["fallback"]),
            "rich_content": None,
            "suggested_actions": [
                {"type": "quick_reply", "label": "🍽️ Gợi ý món", "payload": "gợi ý món"},
                {"type": "quick_reply", "label": "💰 Xem khuyến mãi", "payload": "khuyến mãi"},
                {"type": "quick_reply", "label": "❓ Hướng dẫn", "payload": "giúp tôi"}
            ]
        }

    async def _get_menu_items(self, store_id: str) -> List[Dict]:
        """Get all menu items for a store"""
        cursor = self.db.menu_items.find(
            {"store_id": store_id, "is_available": True},
            {"_id": 0}
        ).limit(50)

        items = await cursor.to_list(length=50)
        return items

    def _build_menu_carousel(self, items: List[Dict]) -> Dict:
        """Build menu carousel rich content from items"""
        carousel_items = []
        for item in items:
            # Ensure reasons is always a list
            reason = item.get("recommendation_reason", "Món ngon")
            if isinstance(reason, str):
                reasons = [reason]
            elif isinstance(reason, list):
                reasons = reason
            else:
                reasons = ["Món ngon"]

            carousel_items.append({
                "item_id": item.get("id"),
                "name": item.get("name"),
                "description": item.get("description", ""),
                "price": item.get("price", 0),
                "discounted_price": item.get("discounted_price"),
                "has_promotion": item.get("has_promotion", False),
                "promotion_label": item.get("promotion_label"),
                "image_url": item.get("image_url"),
                "reasons": reasons,
                "actions": [
                    {
                        "type": "add_to_cart",
                        "label": "🛒 Thêm vào giỏ",
                        "item_id": item.get("id")
                    }
                ]
            })

        return {
            "type": "menu_items_carousel",
            "items": carousel_items
        }

    def _build_cart_display(self, cart_items: List[Dict]) -> Dict:
        """Build cart display rich content"""
        if not cart_items:
            return None

        return {
            "type": "cart_summary",
            "items": [
                {
                    "item_id": item.get("item_id"),
                    "name": item.get("name"),
                    "quantity": item.get("quantity", 1),
                    "price": item.get("price"),
                    "subtotal": item.get("price", 0) * item.get("quantity", 1)
                }
                for item in cart_items
            ],
            "total": sum(item.get("price", 0) * item.get("quantity", 1) for item in cart_items)
        }

    async def _find_item_by_name(
        self,
        item_name: str,
        store_id: str
    ) -> Optional[Dict]:
        """
        Find menu item by name using fuzzy search
        """
        # Simple case-insensitive search
        # TODO: Implement fuzzy matching for better results
        item = await self.db.menu_items.find_one({
            "store_id": store_id,
            "name": {"$regex": item_name, "$options": "i"}
        }, {"_id": 0})

        return item
