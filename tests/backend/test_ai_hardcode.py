"""
Test AI for hardcoded promotions - check if AI generates fake promotions
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
from datetime import datetime, timezone

async def test_hardcoded_promotions():
    print("=" * 70)
    print("TEST: Checking if AI has hardcoded promotions")
    print("=" * 70)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Get store
    store = await db.stores.find_one({"name": "Quán Cafe abc"})
    store_id = store['id']
    
    # Check what's ACTUALLY in database
    print(f"\n[Database Reality Check]")
    print("-" * 70)
    
    # Check active promotions
    now = datetime.now(timezone.utc).isoformat()
    active_promos = await db.promotions.find({
        "store_id": store_id,
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }).to_list(100)
    
    print(f"\n✓ Active promotions in DB: {len(active_promos)}")
    for promo in active_promos:
        print(f"   • {promo['name']} - {promo['discount_value']}% off")
        print(f"     Apply to: {promo['apply_to']}")
        if promo.get('category_ids'):
            # Get category names
            for cat_id in promo['category_ids']:
                cat = await db.categories.find_one({"id": cat_id})
                if cat:
                    print(f"     Category: {cat['name']}")
    
    # Get all menu items
    menu_items = await db.menu_items.find({"store_id": store_id}).to_list(100)
    print(f"\n✓ Total menu items: {len(menu_items)}")
    
    # List items by category
    categories = await db.categories.find({"store_id": store_id}).to_list(100)
    cat_map = {cat['id']: cat['name'] for cat in categories}
    
    for cat_id, cat_name in cat_map.items():
        items_in_cat = [item for item in menu_items if item.get('category_id') == cat_id]
        print(f"   📁 {cat_name}: {len(items_in_cat)} items")
        for item in items_in_cat:
            print(f"      • {item['name']} - {item.get('price', 0):,.0f}đ")
    
    # Initialize chatbot
    print(f"\n[AI Chatbot Tests]")
    print("-" * 70)
    response_gen = ResponseGenerator(db, use_ai=True)
    
    # Test 1: Ask about Món Chính promotions (should say NO)
    print(f"\n🧪 Test 1: 'Món chính có khuyến mãi không?'")
    print("   Expected: NO (only Tráng Miệng has promotion)")
    
    response1 = await response_gen.generate_response(
        intent="ask_promotion",
        entities={},
        context={"store_id": store_id},
        store_id=store_id,
        original_message="Món chính có khuyến mãi không?",
        conversation_history=[]
    )
    
    print(f"\n   AI: {response1.get('text')}")
    
    if response1.get('rich_content'):
        items = response1['rich_content'].get('items', [])
        print(f"\n   Carousel items: {len(items)}")
        for item in items:
            print(f"      • {item.get('name')}")
            # Check if AI promoting wrong items
            if item.get('discounted_price'):
                print(f"        ⚠️  DISCOUNTED: {item.get('price')} → {item.get('discounted_price')}")
    else:
        print(f"   ✓ No carousel (correct - no promotions)")
    
    # Test 2: Ask about Đồ Uống promotions (should say NO)
    print(f"\n🧪 Test 2: 'Đồ uống có giảm giá không?'")
    print("   Expected: NO (only Tráng Miệng has promotion)")
    
    response2 = await response_gen.generate_response(
        intent="ask_promotion",
        entities={},
        context={"store_id": store_id},
        store_id=store_id,
        original_message="Đồ uống có giảm giá không?",
        conversation_history=[]
    )
    
    print(f"\n   AI: {response2.get('text')}")
    
    if response2.get('rich_content'):
        items = response2['rich_content'].get('items', [])
        print(f"\n   Carousel items: {len(items)}")
        for item in items:
            print(f"      • {item.get('name')}")
            if item.get('discounted_price'):
                print(f"        ⚠️  DISCOUNTED: {item.get('price')} → {item.get('discounted_price')}")
    else:
        print(f"   ✓ No carousel (correct - no promotions)")
    
    # Test 3: General promotion query (should only show Tráng Miệng)
    print(f"\n🧪 Test 3: 'Có khuyến mãi gì không?'")
    print("   Expected: Only show 3 Tráng Miệng items")
    
    response3 = await response_gen.generate_response(
        intent="ask_promotion",
        entities={},
        context={"store_id": store_id},
        store_id=store_id,
        original_message="Có khuyến mãi gì không?",
        conversation_history=[]
    )
    
    print(f"\n   AI: {response3.get('text')}")
    
    if response3.get('rich_content'):
        items = response3['rich_content'].get('items', [])
        print(f"\n   Carousel items: {len(items)}")
        expected_items = ['Chè Ba Màu', 'Bánh Flan', 'Kem Dừa']
        for item in items:
            name = item.get('name')
            is_expected = name in expected_items
            status = "✓" if is_expected else "❌ WRONG"
            print(f"      {status} {name}")
            if item.get('discounted_price'):
                print(f"         {item.get('price'):,.0f}đ → {item.get('discounted_price'):,.0f}đ")
    
    print("\n" + "=" * 70)
    print("RESULT:")
    print("=" * 70)
    print("✓ If AI only shows Tráng Miệng items → NO HARDCODE")
    print("❌ If AI shows other items with promotions → HARDCODED!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_hardcoded_promotions())
