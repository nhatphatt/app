"""
Conversation Manager - Manages multi-turn conversations

Tracks conversation state, context, and history across multiple messages.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional
import uuid


class ConversationManager:
    """
    Manages conversation sessions and context
    """

    def __init__(self, db):
        self.db = db

    async def create_session(
        self,
        store_id: str,
        table_id: Optional[str] = None,
        customer_phone: Optional[str] = None
    ) -> str:
        """
        Create a new conversation session

        Returns:
            session_id
        """
        session_id = str(uuid.uuid4())

        conversation_doc = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "store_id": store_id,
            "customer_phone": customer_phone,
            "table_id": table_id,
            "messages": [],
            "context": {
                "current_intent": None,
                "cart_items": [],
                "preferences": {},
                "mentioned_items": [],
                "weather": self._detect_current_weather(),
                "time_of_day": self._get_time_of_day()
            },
            "status": "active",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "last_activity_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None
        }

        await self.db.chatbot_conversations.insert_one(conversation_doc)

        return session_id

    async def get_conversation(self, session_id: str) -> Optional[Dict]:
        """
        Retrieve conversation by session ID
        """
        conversation = await self.db.chatbot_conversations.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        return conversation

    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict] = None,
        rich_content: Optional[Dict] = None
    ) -> str:
        """
        Add a message to the conversation

        Args:
            session_id: Session identifier
            role: 'user' or 'assistant'
            content: Message text
            metadata: Additional metadata (intent, entities, etc.)
            rich_content: Structured content (cards, buttons, etc.)

        Returns:
            message_id
        """
        message_id = str(uuid.uuid4())

        message = {
            "id": message_id,
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metadata": metadata or {},
            "rich_content": rich_content
        }

        # Add message to conversation
        await self.db.chatbot_conversations.update_one(
            {"session_id": session_id},
            {
                "$push": {"messages": message},
                "$set": {
                    "last_activity_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        # Update context if needed
        if metadata and "intent" in metadata:
            await self._update_context(session_id, metadata)

        return message_id

    async def update_context(
        self,
        session_id: str,
        updates: Dict
    ):
        """
        Update conversation context
        """
        update_ops = {}

        for key, value in updates.items():
            update_ops[f"context.{key}"] = value

        if update_ops:
            await self.db.chatbot_conversations.update_one(
                {"session_id": session_id},
                {"$set": update_ops}
            )

    async def add_to_cart_context(
        self,
        session_id: str,
        item_id: str
    ):
        """
        Add item to cart in conversation context
        """
        await self.db.chatbot_conversations.update_one(
            {"session_id": session_id},
            {
                "$addToSet": {"context.cart_items": item_id},
                "$addToSet": {"context.mentioned_items": item_id}
            }
        )

    async def remove_from_cart_context(
        self,
        session_id: str,
        item_id: str
    ):
        """
        Remove item from cart in conversation context
        """
        await self.db.chatbot_conversations.update_one(
            {"session_id": session_id},
            {"$pull": {"context.cart_items": item_id}}
        )

    async def get_context(self, session_id: str) -> Dict:
        """
        Get current conversation context
        """
        conversation = await self.get_conversation(session_id)
        if conversation:
            return conversation.get("context", {})
        return {}

    async def get_recent_messages(
        self,
        session_id: str,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get recent messages from conversation
        """
        conversation = await self.get_conversation(session_id)
        if conversation:
            messages = conversation.get("messages", [])
            return messages[-limit:]
        return []

    async def close_session(self, session_id: str):
        """
        Mark conversation as completed
        """
        await self.db.chatbot_conversations.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

    async def _update_context(self, session_id: str, metadata: Dict):
        """
        Update context based on message metadata
        """
        updates = {}

        # Update current intent
        if "intent" in metadata:
            updates["current_intent"] = metadata["intent"]

        # Add mentioned items
        if "entities" in metadata and "item_name" in metadata["entities"]:
            item_name = metadata["entities"]["item_name"]
            # Try to find item ID from name
            # This will be enhanced with fuzzy matching
            updates["last_mentioned_item"] = item_name

        if updates:
            await self.update_context(session_id, updates)

    def _detect_current_weather(self) -> str:
        """
        Detect current weather (placeholder - can integrate weather API)
        """
        # TODO: Integrate with weather API
        # For now, return default
        return "normal"

    def _get_time_of_day(self) -> str:
        """
        Get current time of day
        """
        hour = datetime.now().hour

        if 6 <= hour < 11:
            return "breakfast"
        elif 11 <= hour < 14:
            return "lunch"
        elif 14 <= hour < 17:
            return "afternoon"
        elif 17 <= hour < 21:
            return "dinner"
        else:
            return "late_night"

    async def get_customer_profile(
        self,
        customer_phone: str,
        store_id: str
    ) -> Optional[Dict]:
        """
        Get customer profile for personalization
        """
        profile = await self.db.customer_profiles.find_one(
            {
                "store_id": store_id,
                "phone": customer_phone
            },
            {"_id": 0}
        )
        return profile

    async def cleanup_old_sessions(self, days_old: int = 7):
        """
        Clean up old inactive sessions
        """
        from datetime import timedelta

        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days_old)).isoformat()

        result = await self.db.chatbot_conversations.delete_many({
            "last_activity_at": {"$lt": cutoff_date},
            "status": {"$in": ["completed", "abandoned"]}
        })

        return result.deleted_count
