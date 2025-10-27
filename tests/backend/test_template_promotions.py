"""
Test promotion WITHOUT AI (template fallback only) - check if hardcoded data removed
"""
import os
import sys
import asyncio

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

# Set environment variables - NO GEMINI_API_KEY to force template fallback
os.environ.pop('GEMINI_API_KEY', None)  # Remove API key to test templates
os.environ['MONGO_URL'] = 'mongodb://mongo:szOUkzzUBhFyVylYDUyFyTPzoPQERUUc@maglev.proxy.rlwy.net:51481'
os.environ['DB_NAME'] = 'minitake_db'

from motor.motor_asyncio import AsyncIOMotorClient
from chatbot.response_generator import ResponseGenerator
from datetime import datetime, timezone

async def test_template_promotions():
    print("=" * 70)
    print("TEST: Template Fallback (NO AI) - Checking for hardcoded data")
    print("=" * 70)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Get store
    store = await db.stores.find_one({"name": "Quán Cafe abc"})
    store_id = store['id']
    
    # Check database reality
    print(f"\n[Database Reality]")
    now = datetime.now(timezone.utc).isoformat()
    active_promos = await db.promotions.find({
        "store_id": store_id,
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }).to_list(100)
    
    print(f"✓ Active promotions: {len(active_promos)}")
    for promo in active_promos:
        print(f"   • {promo['name']} ({promo['apply_to']})")
        if promo.get('category_ids'):
            cat = await db.categories.find_one({"id": promo['category_ids'][0]})
            if cat:
                print(f"     Category: {cat['name']}")
    
    # Initialize chatbot WITHOUT AI (use_ai=False)
    print(f"\n[Initializing Chatbot with Templates Only]")
    response_gen = ResponseGenerator(db, use_ai=False)
    
    # Test promotion query
    print(f"\n[Test: 'Có khuyến mãi gì không?']")
    print("Expected: Only show Tráng Miệng items (Chè Ba Màu, Bánh Flan, Kem Dừa)")
    print("-" * 70)
    
    response = await response_gen.generate_response(
        intent="ask_promotion",
        entities={},
        context={"store_id": store_id},
        store_id=store_id,
        original_message="Có khuyến mãi gì không?",
        conversation_history=[]
    )
    
    print(f"\n📝 Response Text:")
    print(response.get('text'))
    
    if response.get('rich_content'):
        items = response['rich_content'].get('items', [])
        print(f"\n📋 Carousel Items: {len(items)}")
        
        expected_items = ['Chè Ba Màu', 'Bánh Flan', 'Kem Dừa']
        all_correct = True
        
        for item in items:
            name = item.get('name')
            is_expected = name in expected_items
            status = "✓" if is_expected else "❌ WRONG"
            
            if not is_expected:
                all_correct = False
            
            print(f"   {status} {name}")
            
            if item.get('discounted_price'):
                original = item.get('price', 0)
                discounted = item.get('discounted_price')
                discount_pct = ((original - discounted) / original * 100) if original > 0 else 0
                print(f"       {original:,.0f}đ → {discounted:,.0f}đ ({discount_pct:.0f}% off)")
        
        print("\n" + "=" * 70)
        if all_correct and len(items) == 3:
            print("✅ PASSED: No hardcoded data! Only real promotions from database")
        else:
            print("❌ FAILED: Still has hardcoded data or wrong items!")
    else:
        print("\n❌ No carousel returned")
    
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_template_promotions())
