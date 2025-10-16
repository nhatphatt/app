"""
Direct test chatbot - create a test store first if needed
"""
import requests
import json
import os

BASE_URL = "https://minitake.up.railway.app"

# Test without authentication - just test the chatbot endpoint behavior
def test_chatbot_with_any_slug():
    """Test chatbot to see what error/response we get"""

    # Try various possible slugs
    possible_slugs = [
        "minitake",
        "restaurant",
        "demo",
        "test",
        "store1",
        "default"
    ]

    for slug in possible_slugs:
        url = f"{BASE_URL}/api/chatbot/message"

        payload = {
            "message": "Xin chào",
            "session_id": None,
            "customer_phone": None,
            "table_id": None,
            "cart_items": []
        }

        params = {"store_slug": slug}

        print(f"\nTrying slug: {slug}")

        try:
            response = requests.post(url, json=payload, params=params, timeout=10)

            print(f"Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print(f"✓ FOUND WORKING SLUG: {slug}")
                print(f"\nChatbot Response:")
                print(f"Message: {data.get('message')}")
                print(f"Intent: {data.get('intent')}")
                print(f"Confidence: {data.get('confidence')}")

                # Check if using AI
                msg = data.get('message', '')
                print(f"\nMessage length: {len(msg)} characters")
                print(f"Contains emoji: {'Yes' if any(c for c in msg if ord(c) > 127) else 'No'}")

                # Detailed AI check
                ai_indicators = {
                    'Natural language': len(msg) > 80,
                    'Emojis present': any(c for c in msg if ord(c) > 127),
                    'Multiple sentences': msg.count('.') > 1 or msg.count('!') > 1,
                    'Contextual': 'món' in msg.lower() or 'thực đơn' in msg.lower() or 'giúp' in msg.lower()
                }

                print(f"\n🔍 AI Mode Analysis:")
                for indicator, present in ai_indicators.items():
                    status = "✓" if present else "✗"
                    print(f"  {status} {indicator}: {present}")

                ai_score = sum(ai_indicators.values())
                if ai_score >= 3:
                    print(f"\n🤖 Result: Using GEMINI AI ✅ (Score: {ai_score}/4)")
                elif ai_score >= 2:
                    print(f"\n⚠️  Result: Maybe AI (Score: {ai_score}/4)")
                else:
                    print(f"\n❌ Result: Pattern Matching Fallback (Score: {ai_score}/4)")

                return slug, data
            else:
                print(f"  Error: {response.text[:100]}")

        except Exception as e:
            print(f"  Error: {e}")

    print("\n❌ No working store slug found")
    return None, None

if __name__ == "__main__":
    print("="*60)
    print("🧪 Testing Chatbot API on Railway")
    print("="*60)

    slug, data = test_chatbot_with_any_slug()

    if slug and data:
        print(f"\n{'='*60}")
        print(f"✓ Test successful with slug: {slug}")
        print(f"{'='*60}")
    else:
        print(f"\n{'='*60}")
        print("Need to check:")
        print("1. Railway backend logs for Gemini initialization")
        print("2. Verify GEMINI_API_KEY is set in Railway Variables")
        print("3. Create a test store in the database")
        print(f"{'='*60}")
