"""
Quick test script for Gemini AI integration
"""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

# Set environment variable for testing
os.environ['GEMINI_API_KEY'] = 'AIzaSyDzZbJn8z22U0QDhcJYsbMmU-ZFMjaYeRk'

print("=" * 60)
print("Testing Gemini AI Integration")
print("=" * 60)

try:
    # Test 1: Import google.generativeai
    print("\n[1] Testing google.generativeai import...")
    import google.generativeai as genai
    print("✓ google.generativeai imported successfully")
    
    # Test 2: Configure and create model
    print("\n[2] Testing Gemini configuration...")
    genai.configure(api_key=os.environ['GEMINI_API_KEY'])
    print("✓ Gemini configured successfully")
    
    print("\n[3] Testing model initialization...")
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    print("✓ Model 'gemini-2.0-flash-exp' initialized successfully")
    
    # Test 3: Simple generation
    print("\n[4] Testing response generation...")
    prompt = "Chào bạn! Hôm nay tôi muốn ăn gì ngon?"
    response = model.generate_content(prompt)
    print("✓ Response generated successfully")
    print(f"\nPrompt: {prompt}")
    print(f"Response: {response.text[:200]}...")
    
    # Test 4: Import GeminiService
    print("\n[5] Testing GeminiService import...")
    from chatbot.gemini_service import GeminiService
    print("✓ GeminiService imported successfully")
    
    # Test 5: Initialize GeminiService
    print("\n[6] Testing GeminiService initialization...")
    gemini_service = GeminiService()
    print("✓ GeminiService initialized successfully")
    
    # Test 6: Generate response with context
    print("\n[7] Testing contextual response generation...")
    test_response = gemini_service.generate_response(
        intent="greeting",
        message="Xin chào, cho tôi gợi ý món ăn",
        context={},
        menu_items=None,
        conversation_history=[]
    )
    print("✓ Contextual response generated successfully")
    print(f"\nResponse: {test_response}")
    
    print("\n" + "=" * 60)
    print("✓ ALL TESTS PASSED!")
    print("=" * 60)
    print("\nGemini AI is ready to use in the chatbot! 🎉")
    
except ImportError as e:
    print(f"\n❌ Import Error: {e}")
    print("\nPlease install required package:")
    print("  pip install google-generativeai==0.8.3")
    sys.exit(1)
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
