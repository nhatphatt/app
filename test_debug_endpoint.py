"""
Test debug endpoint to check AI status
"""
import requests
import json
import time

BASE_URL = "https://minitake.up.railway.app"

def test_debug_endpoint():
    """Test debug endpoint"""
    url = f"{BASE_URL}/api/chatbot/debug/status"

    print("="*70)
    print("🔍 CHECKING AI/GEMINI STATUS ON RAILWAY")
    print("="*70)
    print(f"\nCalling: {url}\n")

    try:
        response = requests.get(url, timeout=15)

        print(f"Status Code: {response.status_code}\n")

        if response.status_code == 200:
            data = response.json()

            print("📊 DEBUG RESULTS:")
            print("-"*70)

            # Check API key
            if data.get("gemini_api_key_set"):
                print(f"✅ GEMINI_API_KEY is SET")
                print(f"   Preview: {data.get('gemini_api_key_preview')}")
            else:
                print(f"❌ GEMINI_API_KEY is NOT SET")
                print(f"   → This is the problem! Add GEMINI_API_KEY to Railway Variables")

            print()

            # Check intent recognizer
            if data.get("intent_recognizer_ai"):
                print(f"✅ Intent Recognizer: Using AI")
            else:
                print(f"❌ Intent Recognizer: Using Pattern Matching (Fallback)")

            # Check response generator
            if data.get("response_generator_ai"):
                print(f"✅ Response Generator: Using AI")
            else:
                print(f"❌ Response Generator: Using Pattern Matching (Fallback)")

            print()

            # Check test result
            test_result = data.get("test_result")
            if test_result:
                if test_result.get("success"):
                    print(f"✅ AI Test Call: SUCCESS")
                    print(f"   Test message: 'Xin chào'")
                    print(f"   Detected intent: {test_result.get('intent')}")
                    print(f"   Confidence: {test_result.get('confidence')}")
                else:
                    print(f"❌ AI Test Call: FAILED")
                    print(f"   Error: {test_result.get('error')}")
            else:
                print(f"⚠️  AI Test Call: NOT EXECUTED (AI not initialized)")

            print()

            # Check for errors
            if data.get("error"):
                print(f"❌ INITIALIZATION ERROR:")
                print(f"   {data.get('error')}")
                if data.get("traceback"):
                    print(f"\nTraceback:")
                    print(data.get("traceback"))

            print("-"*70)
            print()

            # Verdict
            print("🎯 VERDICT:")
            print("-"*70)

            if not data.get("gemini_api_key_set"):
                print("❌ PROBLEM: GEMINI_API_KEY not set on Railway")
                print()
                print("SOLUTION:")
                print("1. Go to Railway Dashboard")
                print("2. Select Backend Service")
                print("3. Go to Variables tab")
                print("4. Add new variable:")
                print("   Name: GEMINI_API_KEY")
                print("   Value: AIzaSyDlmfLVmDNezR2DgNcz4ZbAwgfBE0_-3T8")
                print("5. Railway will auto-redeploy")

            elif not data.get("intent_recognizer_ai") or not data.get("response_generator_ai"):
                print("❌ PROBLEM: AI not initialized properly")
                print()
                print("Possible causes:")
                print("- API key is invalid")
                print("- google-generativeai package not installed")
                print("- Gemini API quota exceeded")
                print("- Network/firewall issues")

                if test_result and not test_result.get("success"):
                    print(f"\nAPI Error: {test_result.get('error')}")

            elif test_result and test_result.get("success"):
                print("✅ AI is WORKING correctly!")
                print()
                print("If chatbot still seems dumb, the issue might be:")
                print("1. Intent detection needs better prompts")
                print("2. Response templates overriding AI responses")
                print("3. Frontend not sending messages correctly")

            else:
                print("⚠️  Status unclear - check error messages above")

            return data

        else:
            print(f"❌ FAILED")
            print(f"Response: {response.text}")
            return None

    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    # Wait a bit for Railway to deploy
    print("⏳ Waiting 30 seconds for Railway to deploy...\n")
    time.sleep(30)

    test_debug_endpoint()

    print()
    print("="*70)
    print("✓ Debug test completed")
    print("="*70)
