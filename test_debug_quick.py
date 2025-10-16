"""
Quick debug endpoint test without waiting
"""
import requests

url = "https://minitake.up.railway.app/api/chatbot/debug/status"

print(f"Testing: {url}\n")

try:
    response = requests.get(url, timeout=10)

    print(f"Status: {response.status_code}\n")

    if response.status_code == 200:
        import json
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))

        print("\n" + "="*60)
        if not data.get("gemini_api_key_set"):
            print("❌ GEMINI_API_KEY NOT SET ON RAILWAY")
            print("\nAction needed: Add GEMINI_API_KEY to Railway Variables")
        elif data.get("intent_recognizer_ai") and data.get("response_generator_ai"):
            print("✅ AI IS ENABLED")
            if data.get("test_result", {}).get("success"):
                print("✅ AI TEST SUCCESSFUL")
            else:
                print("❌ AI TEST FAILED")
                print(f"Error: {data.get('test_result', {}).get('error')}")
        else:
            print("❌ AI NOT INITIALIZED")
    else:
        print(f"Error: {response.text}")
        if response.status_code == 404:
            print("\n⏳ Railway might still be deploying... try again in 1 minute")

except Exception as e:
    print(f"Error: {e}")
    print("\n⏳ Railway might still be deploying... try again in 1 minute")
