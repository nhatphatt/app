import os
import sys

# Add backend to path
sys.path.insert(0, 'backend')

os.environ['GEMINI_API_KEY'] = 'AIzaSyDlmfLVmDNezR2DgNcz4ZbAwgfBE0_-3T8'

try:
    import google.generativeai as genai

    print("✓ google.generativeai imported successfully")

    genai.configure(api_key=os.environ['GEMINI_API_KEY'])
    print("✓ API key configured")

    # Test with the correct model name from code
    model = genai.GenerativeModel('gemini-flash-latest')
    print("✓ Model initialized: gemini-flash-latest")

    response = model.generate_content('Say hello in Vietnamese')
    print("✓ API call successful")
    print(f"\nResponse: {response.text}")

except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
