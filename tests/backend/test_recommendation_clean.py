"""
Final test: Recommendation should NOT show fake promotions
"""
import os
import sys
import asyncio

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

# Set environment variables
os.environ['GEMINI_API_KEY'] = 'AIzaSyDzZbJn8z22U0QDhcJYsbMmU-ZFMjaYeRk'
os.environ['MONGO_URL'] = 'mongodb://mongo:szOUkzzUBhFyVylYDUyFyTPzoPQERUUc@maglev.proxy.rlwy.net:51481'
os.environ['DB_NAME'] = 'minitake_db'

from motor.motor_asyncio import AsyncIOMotorClient
from chatbot.response_generator import ResponseGenerator

async def test_recommendation_no_fake_promos():
    print("=" * 70)
    print("TEST: Recommendation - Check for fake promotions")
    print("=" * 70)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Get store
    store = await db.stores.find_one({"name": "Quán Cafe abc"})
    store_id = store['id']
    
    # Initialize chatbot
    print(f"\n[1] Initializing chatbot (template mode to avoid quota)...")
    response_gen = ResponseGenerator(db, use_ai=False)  # Use templates to avoid API quota
    
    # Test recommendation
    print(f"\n[2] Testing: 'Có món gì ngon không?'")
    print("-" * 70)
    
    response = await response_gen.generate_response(
        intent="ask_recommendation",
        entities={},
        context={"store_id": store_id},
        store_id=store_id,
        original_message="Có món gì ngon không?",
        conversation_history=[]
    )
    
    print(f"\n📝 Response:")
    print(response.get('text'))
    
    if response.get('rich_content'):
        items = response['rich_content'].get('items', [])
        print(f"\n📋 Carousel Items: {len(items)}")
        
        has_fake_promo = False
        
        for item in items:
            name = item.get('name')
            price = item.get('price', 0)
            discounted = item.get('discounted_price')
            has_promo = item.get('has_promotion', False)
            
            if discounted and discounted < price:
                # This item shows as promoted
                discount_pct = ((price - discounted) / price * 100)
                print(f"\n   ❌ {name}")
                print(f"      Price: {price:,.0f}đ")
                print(f"      Discounted: {discounted:,.0f}đ ({discount_pct:.0f}% off)")
                print(f"      ⚠️  FAKE PROMOTION (should not show discount!)")
                has_fake_promo = True
            else:
                # Normal item without promotion
                print(f"\n   ✓ {name}")
                print(f"      Price: {price:,.0f}đ")
                if has_promo:
                    print(f"      ⚠️  has_promotion flag still set (cleanup failed!)")
                    has_fake_promo = True
        
        print("\n" + "=" * 70)
        if has_fake_promo:
            print("❌ FAILED: Still showing fake promotions!")
            print("Items should only show original prices (no discounts)")
        else:
            print("✅ PASSED: No fake promotions!")
            print("All items show original prices correctly")
        print("=" * 70)
    else:
        print("\n⚠️  No carousel returned")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_recommendation_no_fake_promos())
