"""
Chatbot Service - Main orchestrator for chatbot functionality

Coordinates intent recognition, conversation management, and response generation.
"""

from typing import Dict, Optional
from chatbot.intent_recognizer import IntentRecognizer
from chatbot.conversation_manager import ConversationManager
from chatbot.response_generator import ResponseGenerator


class ChatbotService:
    """
    Main chatbot service that orchestrates all chatbot components
    """

    def __init__(self, db):
        self.db = db
        self.intent_recognizer = IntentRecognizer()
        self.conversation_manager = ConversationManager(db)
        self.response_generator = ResponseGenerator(db)

    async def process_message(
        self,
        message: str,
        session_id: Optional[str],
        store_id: str,
        customer_phone: Optional[str] = None,
        table_id: Optional[str] = None,
        cart_items: Optional[list] = None
    ) -> Dict:
        """
        Process incoming message and generate response

        Args:
            message: User's message text
            session_id: Existing session ID or None for new session
            store_id: Store identifier
            customer_phone: Customer phone (optional)
            table_id: Table ID from QR scan (optional)
            cart_items: Current cart items (optional)

        Returns:
            Dict with response, session_id, and metadata
        """
        # Create or get session
        if not session_id:
            session_id = await self.conversation_manager.create_session(
                store_id=store_id,
                table_id=table_id,
                customer_phone=customer_phone
            )

        # Get conversation context
        context = await self.conversation_manager.get_context(session_id)

        # Get conversation history for AI context
        conversation_history = await self.conversation_manager.get_recent_messages(
            session_id,
            limit=10
        )

        # Recognize intent from message (with conversation history for AI)
        intent_result = self.intent_recognizer.recognize(message, conversation_history)

        # Extract additional context from message
        message_context = self.intent_recognizer.extract_context(message)

        # Add cart items to context if provided
        if cart_items:
            message_context['cart_items'] = cart_items

        # Merge contexts
        full_context = {**context, **message_context}

        # Save user message
        await self.conversation_manager.add_message(
            session_id=session_id,
            role="user",
            content=message,
            metadata={
                "intent": intent_result["intent"],
                "confidence": intent_result["confidence"],
                "entities": intent_result["entities"]
            }
        )

        # Generate response (with original message and history for AI)
        response = await self.response_generator.generate_response(
            intent=intent_result["intent"],
            entities=intent_result["entities"],
            context=full_context,
            store_id=store_id,
            original_message=message,
            conversation_history=conversation_history
        )

        # Save assistant message
        await self.conversation_manager.add_message(
            session_id=session_id,
            role="assistant",
            content=response["text"],
            metadata={
                "intent": intent_result["intent"]
            },
            rich_content=response.get("rich_content")
        )

        return {
            "session_id": session_id,
            "message": response["text"],
            "rich_content": response.get("rich_content"),
            "suggested_actions": response.get("suggested_actions", []),
            "intent": intent_result["intent"],
            "confidence": intent_result["confidence"]
        }

    async def handle_action(
        self,
        action_type: str,
        action_payload: Dict,
        session_id: str,
        store_id: str
    ) -> Dict:
        """
        Handle user actions (add to cart, view detail, etc.)

        Args:
            action_type: Type of action (add_to_cart, view_detail, etc.)
            action_payload: Action data
            session_id: Session identifier
            store_id: Store identifier

        Returns:
            Dict with action result and response
        """
        if action_type == "add_to_cart":
            return await self._handle_add_to_cart(
                action_payload,
                session_id,
                store_id
            )

        elif action_type == "remove_from_cart":
            return await self._handle_remove_from_cart(
                action_payload,
                session_id,
                store_id
            )

        elif action_type == "view_detail":
            return await self._handle_view_detail(
                action_payload,
                session_id,
                store_id
            )

        else:
            return {
                "success": False,
                "message": "Unknown action type"
            }

    async def _handle_add_to_cart(
        self,
        payload: Dict,
        session_id: str,
        store_id: str
    ) -> Dict:
        """
        Handle add to cart action
        """
        item_id = payload.get("item_id")
        quantity = payload.get("quantity", 1)

        if not item_id:
            return {
                "success": False,
                "message": "Item ID required"
            }

        # Get item details
        item = await self.db.menu_items.find_one(
            {"id": item_id, "store_id": store_id},
            {"_id": 0}
        )

        if not item:
            return {
                "success": False,
                "message": "Item not found"
            }

        # Check for active promotions and apply to item
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        
        promotions = await self.db.promotions.find({
            "store_id": store_id,
            "is_active": True,
            "start_date": {"$lte": now},
            "end_date": {"$gte": now}
        }).to_list(100)
        
        # Apply promotions to this specific item
        final_price = item["price"]
        discount_info = None
        
        for promotion in promotions:
            apply_to = promotion.get('apply_to', '')
            discount_value = promotion.get('discount_value', 0)
            promo_type = promotion.get('promotion_type', 'percentage')
            
            # Check if promotion applies to this item
            applies = False
            
            if apply_to == 'all':
                applies = True
            elif apply_to == 'category' and item.get('category_id') in promotion.get('category_ids', []):
                applies = True
            elif apply_to == 'items' and item.get('id') in promotion.get('item_ids', []):
                applies = True
            
            if applies:
                if promo_type == 'percentage':
                    discount_amount = item["price"] * (discount_value / 100)
                    final_price = item["price"] - discount_amount
                    discount_info = {
                        "original_price": item["price"],
                        "discounted_price": final_price,
                        "discount_percent": discount_value,
                        "promotion_name": promotion.get('name')
                    }
                elif promo_type == 'fixed_amount':
                    final_price = max(0, item["price"] - discount_value)
                    discount_percent = (discount_value / item["price"]) * 100 if item["price"] > 0 else 0
                    discount_info = {
                        "original_price": item["price"],
                        "discounted_price": final_price,
                        "discount_percent": discount_percent,
                        "promotion_name": promotion.get('name')
                    }
                break  # Apply first matching promotion

        # Update conversation context
        await self.conversation_manager.add_to_cart_context(session_id, item_id)

        # Generate confirmation response
        total = final_price * quantity

        response_text = f"✅ Đã thêm {quantity}x **{item['name']}** vào giỏ!\n"
        
        if discount_info:
            original_total = discount_info['original_price'] * quantity
            response_text += f"💰 Giá gốc: ~~{original_total:,.0f}đ~~\n"
            response_text += f"🎉 Giá khuyến mãi: **{total:,.0f}đ** (giảm {discount_info['discount_percent']:.0f}%)"
        else:
            response_text += f"💰 Giá: {total:,.0f}đ"
        
        # Add discount_info to item if promotion applied
        item_with_price = item.copy()
        if discount_info:
            item_with_price['discounted_price'] = discount_info['discounted_price']
            item_with_price['original_price'] = discount_info['original_price']
            item_with_price['has_promotion'] = True
            item_with_price['promotion_label'] = f"Giảm {discount_info['discount_percent']:.0f}%"

        # Save assistant message
        await self.conversation_manager.add_message(
            session_id=session_id,
            role="assistant",
            content=response_text,
            metadata={"action": "add_to_cart", "item_id": item_id, "discount_info": discount_info}
        )

        return {
            "success": True,
            "message": response_text,
            "item": item_with_price,
            "quantity": quantity,
            "discount_info": discount_info
        }

    async def _handle_remove_from_cart(
        self,
        payload: Dict,
        session_id: str,
        store_id: str
    ) -> Dict:
        """
        Handle remove from cart action
        """
        item_id = payload.get("item_id")

        if not item_id:
            return {
                "success": False,
                "message": "Item ID required"
            }

        # Update conversation context
        await self.conversation_manager.remove_from_cart_context(session_id, item_id)

        return {
            "success": True,
            "message": "Đã xóa món khỏi giỏ hàng"
        }

    async def _handle_view_detail(
        self,
        payload: Dict,
        session_id: str,
        store_id: str
    ) -> Dict:
        """
        Handle view item detail action
        """
        item_id = payload.get("item_id")

        if not item_id:
            return {
                "success": False,
                "message": "Item ID required"
            }

        # Get item details
        item = await self.db.menu_items.find_one(
            {"id": item_id, "store_id": store_id},
            {"_id": 0}
        )

        if not item:
            return {
                "success": False,
                "message": "Item not found"
            }

        return {
            "success": True,
            "item": item
        }

    async def get_conversation_history(
        self,
        session_id: str,
        limit: int = 20
    ) -> Dict:
        """
        Get conversation history
        """
        messages = await self.conversation_manager.get_recent_messages(
            session_id,
            limit
        )

        return {
            "session_id": session_id,
            "messages": messages
        }
