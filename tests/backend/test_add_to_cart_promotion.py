"""
Test add to cart with promotion - verify discounted price is applied
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
from chatbot_service import ChatbotService
from datetime import datetime, timezone
import uuid

async def test_add_to_cart_with_promotion():
    print("=" * 70)
    print("TEST: Add to Cart with Promotion Price")
    print("=" * 70)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Get store
    store = await db.stores.find_one({"name": "Quán Cafe abc"})
    store_id = store['id']
    
    print(f"\n✓ Store: {store['name']} (ID: {store_id})")
    
    # Check active promotions
    print(f"\n[1] Active Promotions in Database:")
    now = datetime.now(timezone.utc).isoformat()
    promotions = await db.promotions.find({
        "store_id": store_id,
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }).to_list(100)
    
    for promo in promotions:
        print(f"   📋 {promo['name']}")
        print(f"      Type: {promo['promotion_type']} - {promo['discount_value']}%")
        print(f"      Apply to: {promo['apply_to']}")
        
        if promo.get('category_ids'):
            for cat_id in promo['category_ids']:
                cat = await db.categories.find_one({"id": cat_id})
                if cat:
                    print(f"      Category: {cat['name']}")
                    
                    # Get items in this category
                    items = await db.menu_items.find({
                        "store_id": store_id,
                        "category_id": cat_id
                    }).to_list(10)
                    
                    print(f"      Items affected:")
                    for item in items:
                        original = item['price']
                        discounted = original * (1 - promo['discount_value'] / 100)
                        print(f"         • {item['name']}: {original:,.0f}đ → {discounted:,.0f}đ")
    
    # Initialize chatbot service
    print(f"\n[2] Initializing Chatbot Service...")
    chatbot = ChatbotService(db)
    
    # Test 1: Add promoted item (Chè Ba Màu - in Tráng Miệng category with 20% off)
    print(f"\n[3] Test 1: Add promoted item (Chè Ba Màu)")
    print("-" * 70)
    
    item_che = await db.menu_items.find_one({
        "store_id": store_id,
        "name": "Chè Ba Màu"
    })
    
    if item_che:
        print(f"   Item: {item_che['name']}")
        print(f"   Original price: {item_che['price']:,.0f}đ")
        print(f"   Expected discounted: {item_che['price'] * 0.8:,.0f}đ (20% off)")
        
        session_id = str(uuid.uuid4())
        
        result = await chatbot.handle_action(
            action_type="add_to_cart",
            action_payload={
                "item_id": item_che['id'],
                "quantity": 2
            },
            session_id=session_id,
            store_id=store_id
        )
        
        print(f"\n   Result:")
        print(f"   Success: {result['success']}")
        print(f"   Message: {result['message']}")
        
        if result.get('discount_info'):
            info = result['discount_info']
            print(f"\n   ✅ Discount Applied:")
            print(f"      Original: {info['original_price']:,.0f}đ")
            print(f"      Discounted: {info['discounted_price']:,.0f}đ")
            print(f"      Discount: {info['discount_percent']:.0f}%")
            print(f"      Promotion: {info['promotion_name']}")
        else:
            print(f"\n   ❌ No discount applied (BUG!)")
        
        if result.get('item'):
            item_result = result['item']
            if item_result.get('discounted_price'):
                print(f"\n   ✅ Item has discounted_price: {item_result['discounted_price']:,.0f}đ")
            else:
                print(f"\n   ❌ Item missing discounted_price (BUG!)")
    
    # Test 2: Add non-promoted item (Phở Bò - in Món Chính, no promotion)
    print(f"\n[4] Test 2: Add non-promoted item (Phở Bò)")
    print("-" * 70)
    
    item_pho = await db.menu_items.find_one({
        "store_id": store_id,
        "name": "Phở Bò"
    })
    
    if item_pho:
        print(f"   Item: {item_pho['name']}")
        print(f"   Price: {item_pho['price']:,.0f}đ")
        print(f"   Expected: No discount (not in promotion)")
        
        session_id = str(uuid.uuid4())
        
        result = await chatbot.handle_action(
            action_type="add_to_cart",
            action_payload={
                "item_id": item_pho['id'],
                "quantity": 1
            },
            session_id=session_id,
            store_id=store_id
        )
        
        print(f"\n   Result:")
        print(f"   Success: {result['success']}")
        print(f"   Message: {result['message']}")
        
        if result.get('discount_info'):
            print(f"\n   ❌ Discount applied (should NOT have discount!)")
        else:
            print(f"\n   ✅ No discount (correct - item not in promotion)")
    
    print("\n" + "=" * 70)
    print("SUMMARY:")
    print("=" * 70)
    print("✓ Promoted items (Tráng Miệng) should get 20% discount")
    print("✓ Non-promoted items (Món Chính, Đồ Uống) should use original price")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_add_to_cart_with_promotion())
