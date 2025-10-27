"""
Intent Recognizer - Natural Language Understanding

Analyzes user messages to detect intent and extract entities.
Can use either pattern matching (fallback) or Gemini AI (preferred).
"""

import re
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime


class IntentRecognizer:
    """
    Recognizes user intent from natural language input
    """

    def __init__(self, use_ai: bool = False):
        self.intents = self._load_intent_patterns()

        # Check GEMINI_API_KEY
        api_key = os.environ.get('GEMINI_API_KEY')
        print(f"[IntentRecognizer] Checking GEMINI_API_KEY...")
        print(f"[IntentRecognizer] use_ai parameter: {use_ai}")
        print(f"[IntentRecognizer] GEMINI_API_KEY exists: {api_key is not None}")
        if api_key:
            print(f"[IntentRecognizer] API key preview: {api_key[:10]}...{api_key[-4:]}")

        self.use_ai = use_ai and api_key is not None
        self.gemini_service = None

        print(f"[IntentRecognizer] Final use_ai value: {self.use_ai}")

        # Initialize Gemini if enabled
        if self.use_ai:
            print(f"[IntentRecognizer] Attempting to initialize Gemini...")
            try:
                from chatbot.gemini_service import GeminiService
                print(f"[IntentRecognizer] GeminiService imported successfully")
                self.gemini_service = GeminiService()
                print("✓ Gemini AI enabled for intent recognition")
            except Exception as e:
                print(f"⚠ Gemini AI not available: {e}")
                print("  Falling back to pattern matching")
                import traceback
                traceback.print_exc()
                self.use_ai = False
        else:
            print(f"[IntentRecognizer] Skipping Gemini initialization (use_ai=False)")

    def _load_intent_patterns(self) -> Dict:
        """
        Define intent patterns with keywords and regex
        Each intent has priority and matching patterns
        """
        return {
            # 1. Greeting intents
            "greeting": {
                "priority": 1,
                "keywords": ["xin chào", "chào", "hello", "hi", "hey"],
                "patterns": [
                    r"^(xin\s)?chào\s(bạn|shop|quán|anh|chị)?",
                    r"^(hi|hello|hey)\s?(there|bạn)?",
                ],
                "response_type": "greeting"
            },

            # 2. Ask for recommendations
            "ask_recommendation": {
                "priority": 2,
                "keywords": ["gợi ý", "nên ăn", "nên uống", "món gì", "đặc sản", "ngon"],
                "patterns": [
                    r"(nên|có)\s(ăn|uống|gọi)\s(gì|món\s?gì)",
                    r"gợi\sý\s(món|đồ\suống|thức\săn)",
                    r"(món|đồ)\s(gì|nào)\s(ngon|đặc\ssản|hot)",
                    r"hôm\snay\s(ăn|uống)\sgì",
                ],
                "entities": ["category", "context", "budget"],
                "response_type": "recommendation"
            },

            # 3. Ask about specific item
            "ask_item_info": {
                "priority": 2,
                "keywords": ["có", "là gì", "món", "thế nào", "như thế nào", "cay không"],
                "patterns": [
                    r"(.+)\s(là\sgì|thế\snào|như\sthế\snào)",
                    r"(.+)\s(có\scay|có\sngọt|có\snhiều)",
                    r"cho\stôi\sbiết\svề\s(.+)",
                    r"^(?!.*(giảm\sgiá|khuyến\smãi|sale|ưu\sđãi))(.+)\s(bao\snhiêu\stiền|giá)(?!\s(giảm|khuyến\smãi))",  # Exclude promotion queries
                ],
                "entities": ["item_name"],
                "response_type": "item_info"
            },

            # 4. Order/Add to cart
            "order_item": {
                "priority": 3,
                "keywords": ["cho tôi", "gọi", "đặt", "thêm", "lấy", "mua"],
                "patterns": [
                    r"(cho|gọi|đặt|lấy)\s(tôi|mình|em)?\s?(\d+)?\s?(.+)",
                    r"thêm\s(\d+)?\s?(.+)\s?(vào\sgiỏ)?",
                    r"mua\s(\d+)?\s?(.+)",
                    r"(\d+)\s(.+)",  # "2 phở bò"
                ],
                "entities": ["item_name", "quantity"],
                "response_type": "order_confirmation"
            },

            # 5. View cart
            "view_cart": {
                "priority": 2,
                "keywords": ["giỏ hàng", "đã đặt", "đơn hàng", "xem giỏ"],
                "patterns": [
                    r"(xem|kiểm\stra)\s(giỏ\shàng|đơn\shàng)",
                    r"tôi\s(đã\sgọi|đã\sđặt)\s(gì|món\sgì)",
                    r"(show|hiện)\s(giỏ|cart)",
                ],
                "response_type": "cart_display"
            },

            # 6. Ask to view menu
            "ask_menu": {
                "priority": 2,
                "keywords": ["menu", "xem menu", "có món gì", "món ăn", "thực đơn"],
                "patterns": [
                    r"(xem|cho\sxem|show)\s(menu|thực\sđơn)",
                    # Exclude promotion-related queries with negative lookahead
                    r"^(?!.*(giảm\sgiá|khuyến\smãi|sale|ưu\sđãi|rẻ\shơn|đang\sgiảm))(có|quán\scó)\s(món\sgì|món\snào|món\sấn\sgì)",
                    r"menu\s(là\sgì|có\sgì|như\sthế\snào)",
                    r"^menu$",
                ],
                "response_type": "menu_display"
            },

            # 7. Ask about promotions
            "ask_promotion": {
                "priority": 4,  # Highest priority to avoid conflict with ask_menu and ask_item_info
                "keywords": ["giảm giá", "khuyến mãi", "sale", "ưu đãi", "combo", "rẻ hơn", "chương trình", "đang giảm"],
                "patterns": [
                    # Exact matches for common queries (order matters!)
                    r"có\smón\snào\s(đang\s)?giảm\sgiá",
                    r"có\smón\snào\srẻ\shơn",
                    r"có\smón\s(nào|gì).*(giảm|khuyến\smãi|rẻ)",
                    r"^(giảm\sgiá|khuyến\smãi)\s?(gì|nào|bao\snhiêu)?",
                    r"^món\s(nào|gì)\s(giảm\sgiá|khuyến\smãi|đang\sgiảm)",
                    # General patterns
                    r"(có|đang).*(giảm\sgiá|khuyến\smãi|sale|ưu\sđãi)",
                    r"món\s(nào|gì).*(rẻ|giảm)",
                    r"combo\s(gì|nào)",
                    r"(chương\strình|CT).*(giảm|khuyến\smãi|ưu\sđãi)",
                    r"(hôm\snay|hiện\stại).*(giảm\sgiá|khuyến\smãi|ưu\sđãi|sale)",
                ],
                "response_type": "promotion_list"
            },

            # 8. Ask about order status
            "check_order_status": {
                "priority": 2,
                "keywords": ["trạng thái", "đơn hàng", "xong chưa", "lâu không"],
                "patterns": [
                    r"(đơn\shàng|món)\s(đến|xong|sẵn)\s?chưa",
                    r"(kiểm\stra|xem)\strạng\sthái",
                    r"còn\slâu\s(không|nữa)",
                ],
                "response_type": "order_status"
            },

            # 9. Payment intent
            "payment": {
                "priority": 3,
                "keywords": ["thanh toán", "trả tiền", "tính tiền", "bill"],
                "patterns": [
                    r"(thanh\stoán|trả\stiền|tính\stiền)",
                    r"(lấy|xin)\s(bill|hóa\sđơn)",
                    r"(muốn\s)?thanh\stoán",
                ],
                "response_type": "payment_options"
            },

            # 9. Cancel/Remove from cart
            "remove_item": {
                "priority": 2,
                "keywords": ["bỏ", "xóa", "hủy", "không lấy"],
                "patterns": [
                    r"(bỏ|xóa|hủy)\s(.+)",
                    r"không\s(lấy|gọi|muốn)\s(.+)",
                ],
                "entities": ["item_name"],
                "response_type": "remove_confirmation"
            },

            # 10. Ask for help
            "ask_help": {
                "priority": 1,
                "keywords": ["giúp", "help", "hướng dẫn", "làm sao"],
                "patterns": [
                    r"(giúp|help)\s(tôi|mình|em)",
                    r"làm\s(sao|thế\snào)\sđể\s(.+)",
                    r"hướng\sdẫn",
                ],
                "response_type": "help"
            },

            # 11. Gratitude
            "thank": {
                "priority": 1,
                "keywords": ["cảm ơn", "thank", "thanks", "cám ơn"],
                "patterns": [
                    r"(cảm|cám)\sơn",
                    r"thank(s)?",
                ],
                "response_type": "acknowledgment"
            },

            # 12. Goodbye
            "goodbye": {
                "priority": 1,
                "keywords": ["tạm biệt", "bye", "hẹn gặp lại"],
                "patterns": [
                    r"(tạm\sbiệt|bye|goodbye)",
                    r"hẹn\sgặp\slại",
                ],
                "response_type": "goodbye"
            }
        }

    def recognize(self, message: str, conversation_history: List[Dict] = None) -> Dict:
        """
        Analyze message and return intent with confidence score

        Args:
            message: User's message text
            conversation_history: Previous messages for context (optional)

        Returns:
            Dict with intent, confidence, and matched entities
        """
        message_clean = message.lower().strip()

        if not message_clean:
            return {
                "intent": "unknown",
                "confidence": 0.0,
                "entities": {},
                "response_type": "fallback"
            }

        # Use Gemini AI if available
        if self.use_ai and self.gemini_service:
            try:
                result = self.gemini_service.detect_intent(message, conversation_history)
                # Ensure all required fields
                if result.get('intent'):
                    return result
            except Exception as e:
                print(f"Gemini intent detection failed: {e}, falling back to patterns")

        # Fallback to pattern matching first (highest confidence)
        for intent_name, intent_data in self.intents.items():
            for pattern in intent_data.get("patterns", []):
                match = re.search(pattern, message_clean)
                if match:
                    entities = self._extract_entities_from_match(
                        match,
                        intent_data.get("entities", [])
                    )
                    return {
                        "intent": intent_name,
                        "confidence": 0.9,
                        "entities": entities,
                        "response_type": intent_data["response_type"]
                    }

        # Fallback to keyword matching (medium confidence)
        best_match = None
        best_score = 0

        for intent_name, intent_data in self.intents.items():
            score = self._keyword_match_score(message_clean, intent_data["keywords"])
            if score > best_score:
                best_score = score
                best_match = intent_name

        if best_match and best_score > 0.3:
            return {
                "intent": best_match,
                "confidence": best_score,
                "entities": {},
                "response_type": self.intents[best_match]["response_type"]
            }

        # Unknown intent
        return {
            "intent": "unknown",
            "confidence": 0.0,
            "entities": {},
            "response_type": "fallback"
        }

    def _extract_entities_from_match(self, match: re.Match, entity_types: List[str]) -> Dict:
        """
        Extract entities from regex match groups
        """
        entities = {}

        # Extract quantity if present
        if "quantity" in entity_types:
            for group in match.groups():
                if group and group.isdigit():
                    entities["quantity"] = int(group)
                    break

        # Extract item name (usually last non-digit group)
        if "item_name" in entity_types:
            for group in reversed(match.groups()):
                if group and not group.isdigit() and len(group) > 2:
                    entities["item_name"] = group.strip()
                    break

        return entities

    def _keyword_match_score(self, message: str, keywords: List[str]) -> float:
        """
        Calculate match score based on keyword presence
        """
        matches = 0
        for keyword in keywords:
            if keyword in message:
                matches += 1

        if not keywords:
            return 0.0

        return matches / len(keywords)

    def extract_context(self, message: str) -> Dict:
        """
        Extract contextual information from message
        """
        context = {
            "mentioned_weather": False,
            "mentioned_time": False,
            "mentioned_budget": False,
            "preferences": []
        }

        # Weather mentions
        weather_keywords = {
            "hot": ["nóng", "nắng", "oi"],
            "cold": ["lạnh", "rét", "mát"],
            "rainy": ["mưa"]
        }

        for weather, keywords in weather_keywords.items():
            if any(kw in message for kw in keywords):
                context["mentioned_weather"] = True
                context["weather"] = weather

        # Time mentions
        time_keywords = {
            "morning": ["sáng", "buổi sáng"],
            "lunch": ["trưa", "buổi trưa"],
            "afternoon": ["chiều", "buổi chiều"],
            "dinner": ["tối", "buổi tối"],
            "late_night": ["khuya", "đêm"]
        }

        for time_slot, keywords in time_keywords.items():
            if any(kw in message for kw in keywords):
                context["mentioned_time"] = True
                context["time_preference"] = time_slot

        # Budget mentions
        if any(word in message for word in ["rẻ", "tiết kiệm", "budget", "bao nhiêu"]):
            context["mentioned_budget"] = True
            context["budget_concern"] = "low"

        # Dietary preferences
        dietary_keywords = {
            "vegetarian": ["chay", "vegetarian"],
            "no_spicy": ["không cay", "ít cay"],
            "healthy": ["healthy", "lành mạnh", "diet"]
        }

        for pref, keywords in dietary_keywords.items():
            if any(kw in message for kw in keywords):
                context["preferences"].append(pref)

        return context


def test_intent_recognizer():
    """
    Test function for intent recognizer
    """
    recognizer = IntentRecognizer()

    test_cases = [
        "Xin chào",
        "Hôm nay nên ăn gì nhỉ?",
        "Cho tôi 2 phở bò",
        "Phở bò có cay không?",
        "Có món nào đang giảm giá không?",
        "Thanh toán",
        "Xem giỏ hàng",
        "Trời nóng quá, nên uống gì?",
    ]

    print("=== Testing Intent Recognizer ===\n")
    for message in test_cases:
        result = recognizer.recognize(message)
        print(f"Message: {message}")
        print(f"Intent: {result['intent']} (confidence: {result['confidence']:.2f})")
        print(f"Entities: {result['entities']}")
        print(f"Response type: {result['response_type']}\n")


if __name__ == "__main__":
    test_intent_recognizer()
