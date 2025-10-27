"""
Test intent recognition for different promotion queries
"""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

# Set environment variables
os.environ['GEMINI_API_KEY'] = 'AIzaSyDzZbJn8z22U0QDhcJYsbMmU-ZFMjaYeRk'

from chatbot.intent_recognizer import IntentRecognizer

def test_promotion_intents():
    print("=" * 70)
    print("Testing Intent Recognition for Promotion Queries")
    print("=" * 70)
    
    recognizer = IntentRecognizer(use_ai=False)  # Use pattern matching only
    
    test_queries = [
        "Có khuyến mãi gì không?",
        "Có món nào đang giảm giá không?",
        "Có ưu đãi gì không?",
        "Có sale gì không?",
        "Món nào giảm giá?",
        "Combo gì?",
        "Giảm giá gì?",
        "Khuyến mãi gì?",
        # Potential queries that might fail:
        "Món gì đang khuyến mãi?",
        "Có chương trình giảm giá nào không?",
        "Hôm nay có khuyến mãi gì?",
        "Giảm giá bao nhiêu?",
        "Có món nào rẻ hơn không?",
    ]
    
    print(f"\nTesting {len(test_queries)} queries:\n")
    
    failed_queries = []
    
    for query in test_queries:
        result = recognizer.recognize(query)
        intent = result.get('intent')
        confidence = result.get('confidence', 0)
        
        # Check if promotion intent
        if intent == 'ask_promotion':
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
            failed_queries.append(query)
        
        print(f"{status} '{query}'")
        print(f"     → Intent: {intent} (confidence: {confidence:.2f})")
        print()
    
    print("=" * 70)
    if failed_queries:
        print(f"❌ {len(failed_queries)} queries FAILED to match 'ask_promotion':")
        for q in failed_queries:
            print(f"   • '{q}'")
        print("\nThese queries need to be added to patterns!")
    else:
        print("✅ All queries correctly recognized as 'ask_promotion'")
    print("=" * 70)

if __name__ == "__main__":
    test_promotion_intents()
