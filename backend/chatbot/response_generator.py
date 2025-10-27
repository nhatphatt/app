"""
Response Generator - Generates natural language responses

Creates contextual, personalized responses based on intent and conversation state.
Can use either templates (fallback) or Gemini AI (preferred).
"""

from typing import Dict, List, Optional
import random
import os
from datetime import datetime, timezone


class ResponseGenerator:
    """
    Generates natural language responses for different intents
    """

    def __init__(self, db, use_ai: bool = True):
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
            print(f"[ResponseGenerator] Skipping Gemini initialization (use_ai={use_ai})")

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

                if intent == "ask_menu" and menu_items:
                    # Show full menu with carousel
                    rich_content = self._build_menu_carousel(menu_items[:12])
                    suggested_actions = [
                        {"type": "quick_reply", "label": "🍽️ Gợi ý món", "payload": "gợi ý món"},
                        {"type": "quick_reply", "label": "💰 Xem khuyến mãi", "payload": "có khuyến mãi gì"}
                    ]

                elif intent == "ask_recommendation" and menu_items:
                    # Use AI to pick best recommendations FIRST
                    recommendations = self.gemini_service.generate_recommendation(
                        context=context,
                        menu_items=menu_items,
                        limit=3
                    )
                    if recommendations:
                        # Now generate text response knowing which items were selected
                        recommended_names = [item.get('name') for item in recommendations]
                        
                        # Re-generate AI text with recommended items context
                        ai_text = self.gemini_service.generate_response(
                            intent=intent,
                            message=original_message,
                            context={**context, 'recommended_items': recommended_names},
                            menu_items=menu_items,
                            conversation_history=conversation_history
                        )
                        
                        rich_content = self._build_menu_carousel(recommendations)
                        suggested_actions = [
                            {"type": "quick_reply", "label": "💰 Xem khuyến mãi", "payload": "có khuyến mãi gì"},
                            {"type": "quick_reply", "label": "🛒 Xem giỏ hàng", "payload": "xem giỏ hàng"}
                        ]
                        
                        return {
                            "text": ai_text,
                            "rich_content": rich_content,
                            "suggested_actions": suggested_actions
                        }

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
                    # Get active promotions from database
                    promotions = await self._get_active_promotions(context.get('store_id'))
                    
                    if promotions:
                        # Apply promotions to menu items and get promoted items
                        promoted_items = await self._apply_promotions_to_menu(promotions, menu_items, context.get('store_id'))
                        
                        if promoted_items:
                            # Build promotion details for AI
                            promo_details = []
                            for item in promoted_items[:5]:
                                original_price = int(item.get('original_price', item.get('price', 0)))
                                discounted_price = int(item.get('discounted_price', original_price))
                                discount_pct = int(item.get('discount_percent', 0))
                                promo_details.append(
                                    f"{item.get('name')}: {discounted_price:,}đ (giảm {discount_pct}% từ {original_price:,}đ)"
                                )
                            
                            # Get promotion names for context
                            promo_names = [p.get('name') for p in promotions]
                            
                            # Re-generate AI text with promotion context
                            ai_text = self.gemini_service.generate_response(
                                intent=intent,
                                message=original_message,
                                context={
                                    **context,
                                    'promotion_items': [item.get('name') for item in promoted_items[:5]],
                                    'promotion_details': promo_details,
                                    'promotion_names': promo_names
                                },
                                menu_items=menu_items,
                                conversation_history=conversation_history
                            )
                            
                            rich_content = self._build_menu_carousel(promoted_items[:5])
                            suggested_actions = [
                                {"type": "quick_reply", "label": "🍽️ Gợi ý món", "payload": "gợi ý món"},
                                {"type": "quick_reply", "label": "🛒 Xem giỏ hàng", "payload": "xem giỏ hàng"}
                            ]
                            
                            return {
                                "text": ai_text,
                                "rich_content": rich_content,
                                "suggested_actions": suggested_actions
                            }
                    
                    # No promotions available
                    suggested_actions = [
                        {"type": "quick_reply", "label": "🍽️ Gợi ý món", "payload": "gợi ý món"},
                        {"type": "quick_reply", "label": "📋 Xem menu", "payload": "xem menu"}
                    ]

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

        elif intent == "ask_menu":
            return await self._generate_menu_response(store_id)

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

    async def _generate_menu_response(self, store_id: str) -> Dict:
        """
        Generate full menu display response with categories
        """
        # Get all menu items
        menu_items = await self._get_menu_items(store_id)

        if not menu_items:
            return {
                "text": "Hiện tại quán chưa có món nào. Vui lòng quay lại sau nhé!",
                "rich_content": None,
                "suggested_actions": []
            }

        # Get all categories
        categories = await self.db.categories.find(
            {"store_id": store_id},
            {"_id": 0}
        ).sort("display_order", 1).to_list(100)

        # Group items by category
        category_map = {cat["id"]: cat["name"] for cat in categories}

        # Build response text
        response_text = "📋 **MENU QUÁN**\n\n"
        
        # Group items by category
        items_by_category = {}
        for item in menu_items:
            cat_id = item.get("category_id")
            cat_name = category_map.get(cat_id, "Khác")
            if cat_name not in items_by_category:
                items_by_category[cat_name] = []
            items_by_category[cat_name].append(item)

        # Build text menu
        for cat_name, items in items_by_category.items():
            response_text += f"**{cat_name}**\n"
            for item in items[:5]:  # Limit 5 items per category in text
                price = item.get("discounted_price") or item.get("price", 0)
                promo_mark = "🎉 " if item.get("has_promotion") else ""
                response_text += f"{promo_mark}• {item['name']} - {int(price):,}đ\n"
            if len(items) > 5:
                response_text += f"  _...và {len(items) - 5} món khác_\n"
            response_text += "\n"

        response_text += "Bạn muốn gọi món nào? Hoặc hỏi mình để được tư vấn nhé! 😊"

        # Build rich content with all items (carousel)
        rich_content = self._build_menu_carousel(menu_items[:12])  # Show max 12 items in carousel

        return {
            "text": response_text,
            "rich_content": rich_content,
            "suggested_actions": [
                {"type": "quick_reply", "label": "🍽️ Gợi ý món", "payload": "gợi ý món"},
                {"type": "quick_reply", "label": "💰 Xem khuyến mãi", "payload": "có khuyến mãi gì"},
                {"type": "quick_reply", "label": "🛒 Xem giỏ hàng", "payload": "xem giỏ hàng"}
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
        Generate promotions list response - shows menu items with active promotions from database
        """
        # Get active promotions from database (same as API /api/promotions/active)
        promotions = await self._get_active_promotions(store_id)
        
        if not promotions:
            return {
                "text": "Hiện tại quán chưa có chương trình khuyến mãi nào ạ. Bạn có thể xem menu hoặc gợi ý món nhé! 😊",
                "rich_content": None,
                "suggested_actions": [
                    {"type": "quick_reply", "label": "📋 Xem menu", "payload": "xem menu"},
                    {"type": "quick_reply", "label": "🍽️ Gợi ý món", "payload": "gợi ý món"}
                ]
            }
        
        # Get menu items and apply promotions
        menu_items = await self._get_menu_items(store_id)
        promoted_items = await self._apply_promotions_to_menu(promotions, menu_items, store_id)
        
        if not promoted_items:
            return {
                "text": "Hiện tại quán chưa có món nào đang khuyến mãi ạ. Bạn có thể xem menu hoặc gợi ý món nhé! 😊",
                "rich_content": None,
                "suggested_actions": [
                    {"type": "quick_reply", "label": "📋 Xem menu", "payload": "xem menu"},
                    {"type": "quick_reply", "label": "🍽️ Gợi ý món", "payload": "gợi ý món"}
                ]
            }

        # Build response text
        response_text = "🎉 **KHUYẾN MÃI ĐANG DIỄN RA**\n\n"
        
        # Show promotion names
        for promo in promotions:
            response_text += f"📋 {promo.get('name')}\n"
        
        response_text += "\n**Các món được giảm giá:**\n\n"
        
        for item in promoted_items[:5]:  # Show max 5 in text
            original_price = int(item.get('original_price', item.get('price', 0)))
            discounted_price = int(item.get('discounted_price', original_price))
            discount_percent = int(item.get('discount_percent', 0))
            
            response_text += f"• **{item.get('name')}**\n"
            response_text += f"  ~~{original_price:,}đ~~ → **{discounted_price:,}đ** 🎉\n"
            response_text += f"  _Giảm {discount_percent}%_\n\n"
        
        if len(promoted_items) > 5:
            response_text += f"_...và {len(promoted_items) - 5} món khác đang giảm giá!_\n\n"
        
        response_text += "Bạn muốn gọi món nào? 😊"

        return {
            "text": response_text,
            "rich_content": self._build_menu_carousel(promoted_items[:5]),
            "suggested_actions": [
                {"type": "quick_reply", "label": "🍽️ Gợi ý món", "payload": "gợi ý món"},
                {"type": "quick_reply", "label": "📋 Xem menu", "payload": "xem menu"}
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

    async def _get_active_promotions(self, store_id: str) -> List[Dict]:
        """Get active promotions from database (like /api/promotions/active)"""
        if not store_id:
            return []
        
        try:
            now = datetime.now(timezone.utc).isoformat()
            promotions = await self.db.promotions.find({
                "store_id": store_id,
                "is_active": True,
                "start_date": {"$lte": now},
                "end_date": {"$gte": now}
            }).to_list(100)
            return promotions
        except Exception as e:
            print(f"Error getting promotions: {e}")
            return []

    async def _apply_promotions_to_menu(self, promotions: List[Dict], menu_items: List[Dict], store_id: str) -> List[Dict]:
        """Apply promotions to menu items and return items that have discounts"""
        promoted_items = []
        
        try:
            for promotion in promotions:
                apply_to = promotion.get('apply_to', '')
                discount_value = promotion.get('discount_value', 0)
                promo_type = promotion.get('promotion_type', 'percentage')
                
                if apply_to == 'category':
                    # Get category IDs from promotion
                    category_ids = promotion.get('category_ids', [])
                    
                    # Find items in these categories
                    for item in menu_items:
                        if item.get('category_id') in category_ids:
                            promoted_item = item.copy()
                            promoted_item['original_price'] = item.get('price', 0)
                            
                            if promo_type == 'percentage':
                                discount_amount = item.get('price', 0) * (discount_value / 100)
                                promoted_item['discounted_price'] = item.get('price', 0) - discount_amount
                                promoted_item['discount_percent'] = discount_value
                            elif promo_type == 'fixed_amount':
                                promoted_item['discounted_price'] = max(0, item.get('price', 0) - discount_value)
                                promoted_item['discount_percent'] = (discount_value / item.get('price', 1)) * 100
                            
                            promoted_item['promotion_name'] = promotion.get('name')
                            promoted_item['has_promotion'] = True
                            promoted_item['promotion_label'] = f"Giảm {int(promoted_item['discount_percent'])}%"
                            promoted_items.append(promoted_item)
                
                elif apply_to == 'items':
                    # Get specific item IDs from promotion
                    item_ids = promotion.get('item_ids', [])
                    
                    # Find these specific items
                    for item in menu_items:
                        if item.get('id') in item_ids:
                            promoted_item = item.copy()
                            promoted_item['original_price'] = item.get('price', 0)
                            
                            if promo_type == 'percentage':
                                discount_amount = item.get('price', 0) * (discount_value / 100)
                                promoted_item['discounted_price'] = item.get('price', 0) - discount_amount
                                promoted_item['discount_percent'] = discount_value
                            elif promo_type == 'fixed_amount':
                                promoted_item['discounted_price'] = max(0, item.get('price', 0) - discount_value)
                                promoted_item['discount_percent'] = (discount_value / item.get('price', 1)) * 100
                            
                            promoted_item['promotion_name'] = promotion.get('name')
                            promoted_item['has_promotion'] = True
                            promoted_item['has_promotion'] = True
                            promoted_item['promotion_label'] = f"Giảm {int(promoted_item['discount_percent'])}%"
                            promoted_items.append(promoted_item)
                
                elif apply_to == 'all':
                    # Apply to all items
                    for item in menu_items:
                        promoted_item = item.copy()
                        promoted_item['original_price'] = item.get('price', 0)
                        
                        if promo_type == 'percentage':
                            discount_amount = item.get('price', 0) * (discount_value / 100)
                            promoted_item['discounted_price'] = item.get('price', 0) - discount_amount
                            promoted_item['discount_percent'] = discount_value
                        elif promo_type == 'fixed_amount':
                            promoted_item['discounted_price'] = max(0, item.get('price', 0) - discount_value)
                            promoted_item['discount_percent'] = (discount_value / item.get('price', 1)) * 100
                        
                        promoted_item['promotion_name'] = promotion.get('name')
                        promoted_item['has_promotion'] = True
                        promoted_item['promotion_label'] = f"Giảm {int(promoted_item['discount_percent'])}%"
                        promoted_items.append(promoted_item)
            
            return promoted_items
            
        except Exception as e:
            print(f"Error applying promotions: {e}")
            return []

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
