"""
Test chatbot API with cafe-abc store
"""
import requests
import json

BASE_URL = "https://minitake.up.railway.app"
STORE_SLUG = "cafe-abc"

def test_chatbot(message, session_id=None):
    """Test chatbot API"""
    url = f"{BASE_URL}/api/chatbot/message"

    payload = {
        "message": message,
        "session_id": session_id,
        "customer_phone": None,
        "table_id": "343914bf-eba2-41f0-a094-d086d159f3f1",
        "cart_items": []
    }

    params = {"store_slug": STORE_SLUG}

    print(f"\n{'='*70}")
    print(f"📤 Sending message: '{message}'")
    print(f"{'='*70}")

    try:
        response = requests.post(url, json=payload, params=params, timeout=15)

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()

            print(f"\n✓ SUCCESS")
            print(f"Session ID: {data.get('session_id')}")
            print(f"Intent: {data.get('intent')}")
            print(f"Confidence: {data.get('confidence')}")

            message_text = data.get('message', '')
            print(f"\n📥 Bot Response:")
            print(f"{'-'*70}")
            print(message_text)
            print(f"{'-'*70}")

            # Analyze response quality
            print(f"\n🔍 Response Analysis:")
            print(f"  • Length: {len(message_text)} characters")
            print(f"  • Word count: {len(message_text.split())} words")
            print(f"  • Has emoji: {'✓' if any(ord(c) > 127 for c in message_text) else '✗'}")
            print(f"  • Multiple sentences: {'✓' if message_text.count('.') + message_text.count('!') + message_text.count('?') > 1 else '✗'}")
            print(f"  • Contains context: {'✓' if any(word in message_text.lower() for word in ['món', 'menu', 'gợi ý', 'khuyến mãi', 'giá', 'quán']) else '✗'}")

            # AI Detection
            ai_indicators = [
                len(message_text) > 80,  # Natural responses are longer
                any(ord(c) > 127 for c in message_text),  # Has emoji
                message_text.count('.') + message_text.count('!') > 1,  # Multiple sentences
                any(word in message_text.lower() for word in ['món', 'gợi ý', 'khuyến mãi', 'menu']),  # Contextual
                'Tôi có thể giúp bạn' not in message_text  # Not generic template
            ]

            ai_score = sum(ai_indicators)

            print(f"\n🤖 AI Detection Score: {ai_score}/5")

            if ai_score >= 4:
                print("✅ Result: Using GEMINI AI - Responses are natural and contextual")
            elif ai_score >= 3:
                print("⚠️  Result: Possibly using AI - Some natural elements")
            else:
                print("❌ Result: Using PATTERN MATCHING - Generic template responses")

            if data.get('rich_content'):
                print(f"\n📦 Rich Content Present: Yes")
                print(json.dumps(data.get('rich_content'), indent=2, ensure_ascii=False))

            return data
        else:
            print(f"\n✗ FAILED")
            print(f"Response: {response.text}")
            return None

    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("="*70)
    print("🧪 TESTING CHATBOT AI ON RAILWAY PRODUCTION")
    print(f"Store: {STORE_SLUG}")
    print("="*70)

    # Test 1: Greeting
    print("\n" + "🔷"*35)
    print("TEST 1: GREETING")
    print("🔷"*35)
    result1 = test_chatbot("Xin chào")

    # Test 2: Ask for recommendation
    print("\n" + "🔷"*35)
    print("TEST 2: ASK RECOMMENDATION")
    print("🔷"*35)
    session_id = result1.get('session_id') if result1 else None
    result2 = test_chatbot("Gợi ý món ngon cho tôi", session_id=session_id)

    # Test 3: Ask about promotion
    print("\n" + "🔷"*35)
    print("TEST 3: ASK PROMOTION")
    print("🔷"*35)
    session_id = result2.get('session_id') if result2 else session_id
    result3 = test_chatbot("Món gì đang khuyến mãi?", session_id=session_id)

    # Test 4: Complex question
    print("\n" + "🔷"*35)
    print("TEST 4: COMPLEX QUESTION")
    print("🔷"*35)
    session_id = result3.get('session_id') if result3 else session_id
    result4 = test_chatbot("Tôi muốn uống cà phê, có loại nào ngon không?", session_id=session_id)

    print("\n" + "="*70)
    print("✓ ALL TESTS COMPLETED")
    print("="*70)

    # Final verdict
    print("\n" + "📊 FINAL ANALYSIS:")
    print("-"*70)

    all_results = [r for r in [result1, result2, result3, result4] if r]

    if len(all_results) == 0:
        print("❌ All tests failed - Check backend logs and API configuration")
    else:
        total_length = sum(len(r.get('message', '')) for r in all_results)
        avg_length = total_length / len(all_results)

        print(f"Tests passed: {len(all_results)}/4")
        print(f"Average response length: {avg_length:.1f} characters")

        if avg_length > 100:
            print("\n✅ VERDICT: Chatbot is using GEMINI AI")
            print("   Responses are detailed, natural, and contextual")
        elif avg_length > 50:
            print("\n⚠️  VERDICT: Chatbot might be using AI partially")
            print("   Some responses are natural but not all")
        else:
            print("\n❌ VERDICT: Chatbot is using PATTERN MATCHING (Fallback)")
            print("   Responses are short and template-based")

        print("\n💡 To confirm, check Railway backend logs for:")
        print("   • '✓ Gemini AI enabled' - AI is active")
        print("   • '⚠ Gemini AI not available' - Fallback mode")
        print("   • '🤖 Calling Gemini API' - AI is being called")
