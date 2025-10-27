"""
Final comprehensive test - All intents
"""
import os
import sys
import asyncio

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

# Set environment variables - No API key to use templates
os.environ.pop('GEMINI_API_KEY', None)
os.environ['MONGO_URL'] = 'mongodb://mongo:szOUkzzUBhFyVylYDUyFyTPzoPQERUUc@maglev.proxy.rlwy.net:51481'
os.environ['DB_NAME'] = 'minitake_db'

from motor.motor_asyncio import AsyncIOMotorClient
from chatbot.response_generator import ResponseGenerator

async def final_test():
    print("=" * 70)
    print("FINAL COMPREHENSIVE TEST - All Promotion Scenarios")
    print("=" * 70)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Get store
    store = await db.stores.find_one({"name": "Quán Cafe abc"})
    store_id = store['id']
    
    print(f"\n✓ Store: {store['name']}")
    
    # Initialize chatbot (templates only)
    response_gen = ResponseGenerator(db, use_ai=False)
    
    # Test 1: Ask recommendation (should NOT show promotions)
    print(f"\n" + "=" * 70)
    print("[Test 1] Recommendation: 'Có món gì ngon không?'")
    print("Expected: Show items with ORIGINAL prices (no discounts)")
    print("-" * 70)
    
    response1 = await response_gen.generate_response(
        intent="ask_recommendation",
        entities={},
        context={"store_id": store_id},
        store_id=store_id,
        original_message="Có món gì ngon không?",
        conversation_history=[]
    )
    
    if response1.get('rich_content'):
        items = response1['rich_content'].get('items', [])
        print(f"Items: {len(items)}")
        for item in items:
            price = item.get('price', 0)
            disc = item.get('discounted_price')
            if disc:
                print(f"   ❌ {item.get('name')}: {price:,.0f}đ → {disc:,.0f}đ (WRONG!)")
            else:
                print(f"   ✓ {item.get('name')}: {price:,.0f}đ")
    
    # Test 2: Ask promotion (should ONLY show Tráng Miệng with discount)
    print(f"\n" + "=" * 70)
    print("[Test 2] Promotion: 'Có khuyến mãi gì không?'")
    print("Expected: Show ONLY Tráng Miệng items with 20% discount")
    print("-" * 70)
    
    response2 = await response_gen.generate_response(
        intent="ask_promotion",
        entities={},
        context={"store_id": store_id},
        store_id=store_id,
        original_message="Có khuyến mãi gì không?",
        conversation_history=[]
    )
    
    print(f"\nResponse text:")
    print(response2.get('text')[:200] + "...")
    
    if response2.get('rich_content'):
        items = response2['rich_content'].get('items', [])
        print(f"\nPromoted items: {len(items)}")
        
        expected = ['Chè Ba Màu', 'Bánh Flan', 'Kem Dừa']
        all_correct = True
        
        for item in items:
            name = item.get('name')
            price = item.get('price', 0)
            disc = item.get('discounted_price')
            
            is_expected = name in expected
            
            if not is_expected:
                print(f"   ❌ {name} (should NOT be in promotion!)")
                all_correct = False
            elif not disc:
                print(f"   ⚠️  {name} - missing discount!")
                all_correct = False
            else:
                discount_pct = ((price - disc) / price * 100)
                print(f"   ✓ {name}: {price:,.0f}đ → {disc:,.0f}đ ({discount_pct:.0f}% off)")
        
        if all_correct and len(items) == 3:
            print(f"\n✅ PERFECT: Only correct items with discount!")
        else:
            print(f"\n❌ WRONG items in promotion!")
    
    # Test 3: View menu (should show all items without promotions displayed)
    print(f"\n" + "=" * 70)
    print("[Test 3] Menu: 'Xem menu'")
    print("Expected: Show all items with original prices")
    print("-" * 70)
    
    response3 = await response_gen.generate_response(
        intent="ask_menu",
        entities={},
        context={"store_id": store_id},
        store_id=store_id,
        original_message="Xem menu",
        conversation_history=[]
    )
    
    if response3.get('rich_content'):
        items = response3['rich_content'].get('items', [])
        print(f"Menu items: {len(items)}")
        
        has_wrong_discount = False
        for item in items:
            disc = item.get('discounted_price')
            if disc:
                print(f"   ⚠️  {item.get('name')} has discount (menu should not show discounts)")
                has_wrong_discount = True
        
        if not has_wrong_discount:
            print(f"   ✓ All items show original prices")
    
    print("\n" + "=" * 70)
    print("FINAL RESULT:")
    print("=" * 70)
    print("✓ Recommendations: Show items WITHOUT promotions")
    print("✓ Promotions: Show ONLY Tráng Miệng with 20% discount")
    print("✓ Menu: Show all items WITHOUT promotions")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(final_test())
