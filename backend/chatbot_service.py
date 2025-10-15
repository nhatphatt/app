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

        # Update conversation context
        await self.conversation_manager.add_to_cart_context(session_id, item_id)

        # Generate confirmation response
        price = item.get("discounted_price") or item["price"]
        total = price * quantity

        response_text = f"✅ Đã thêm {quantity}x **{item['name']}** vào giỏ!\n"
        response_text += f"💰 Giá: {total:,}đ"

        # Save assistant message
        await self.conversation_manager.add_message(
            session_id=session_id,
            role="assistant",
            content=response_text,
            metadata={"action": "add_to_cart", "item_id": item_id}
        )

        return {
            "success": True,
            "message": response_text,
            "item": item,
            "quantity": quantity
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
