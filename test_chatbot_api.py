"""
Test chatbot API on Railway production
"""
import requests
import json

BASE_URL = "https://minitake.up.railway.app"

# Try to get stores first by checking if there's an endpoint
def get_stores():
    """Try to get stores"""
    try:
        # Try common endpoints
        endpoints = ["/api/stores", "/stores", "/api/public/stores"]
        for endpoint in endpoints:
            try:
                response = requests.get(f"{BASE_URL}{endpoint}")
                if response.status_code == 200:
                    stores = response.json()
                    print(f"✓ Found stores at {endpoint}")
                    return stores
            except:
                continue
        print("⚠ No public stores endpoint found")
        return None
    except Exception as e:
        print(f"Error getting stores: {e}")
        return None

def test_chatbot(store_slug, message):
    """Test chatbot API"""
    url = f"{BASE_URL}/api/chatbot/message"

    payload = {
        "message": message,
        "session_id": None,
        "customer_phone": None,
        "table_id": None,
        "cart_items": []
    }

    params = {"store_slug": store_slug}

    print(f"\n{'='*60}")
    print(f"Testing chatbot with store_slug: {store_slug}")
    print(f"Message: {message}")
    print(f"{'='*60}\n")

    try:
        response = requests.post(url, json=payload, params=params)

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"\n✓ SUCCESS - Chatbot Response:")
            print(f"Session ID: {data.get('session_id')}")
            print(f"Intent: {data.get('intent')}")
            print(f"Confidence: {data.get('confidence')}")
            print(f"\nMessage:\n{data.get('message')}")

            if data.get('rich_content'):
                print(f"\nRich Content: {json.dumps(data.get('rich_content'), indent=2)}")

            # Analyze if it's using AI or pattern matching
            message_text = data.get('message', '')
            if any(word in message_text.lower() for word in ['xin chào', 'giúp bạn', 'có thể']):
                if len(message_text) > 100 and '😊' in message_text:
                    print("\n🤖 Status: Using AI (Gemini) ✅")
                else:
                    print("\n⚠️  Status: Using Pattern Matching (Fallback)")

            return data
        else:
            print(f"\n✗ FAILED")
            print(f"Error: {response.text}")
            return None

    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("🧪 Testing Chatbot API on Railway Production\n")

    # Try to get actual store slug
    stores = get_stores()

    if stores and len(stores) > 0:
        store_slug = stores[0].get('slug', 'test-store')
        print(f"Using store slug: {store_slug}")
    else:
        # Try common slug patterns
        test_slugs = ["test-store", "my-restaurant", "restaurant", "demo"]
        store_slug = test_slugs[0]
        print(f"⚠ Using default slug: {store_slug}")

    # Test messages
    test_messages = [
        "Xin chào",
        "Gợi ý món ngon cho tôi",
        "Món gì đang khuyến mãi?"
    ]

    for i, message in enumerate(test_messages, 1):
        print(f"\n{'#'*60}")
        print(f"Test {i}/{len(test_messages)}")
        print(f"{'#'*60}")
        test_chatbot(store_slug, message)

        if i < len(test_messages):
            print("\nWaiting before next test...")
            import time
            time.sleep(2)

    print(f"\n{'='*60}")
    print("✓ Testing completed")
    print(f"{'='*60}")
