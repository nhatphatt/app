"""
Debug carousel data for promoted items
"""
import os
import sys
import asyncio
import json

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

# Set environment variables
os.environ.pop('GEMINI_API_KEY', None)  # No AI to avoid quota
os.environ['MONGO_URL'] = 'mongodb://mongo:szOUkzzUBhFyVylYDUyFyTPzoPQERUUc@maglev.proxy.rlwy.net:51481'
os.environ['DB_NAME'] = 'minitake_db'

from motor.motor_asyncio import AsyncIOMotorClient
from chatbot.response_generator import ResponseGenerator

async def debug_carousel():
    print("=" * 70)
    print("DEBUG: Carousel Data for Promoted Items")
    print("=" * 70)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Get store
    store = await db.stores.find_one({"name": "Quán Cafe abc"})
    store_id = store['id']
    
    # Initialize chatbot (templates only)
    response_gen = ResponseGenerator(db, use_ai=False)
    
    # Get promotion response
    print(f"\n[1] Getting promotion response...")
    response = await response_gen.generate_response(
        intent="ask_promotion",
        entities={},
        context={"store_id": store_id},
        store_id=store_id,
        original_message="Có khuyến mãi gì không?",
        conversation_history=[]
    )
    
    print(f"\n[2] Response text:")
    print(response.get('text'))
    
    print(f"\n[3] Rich content (carousel) data:")
    if response.get('rich_content'):
        rich = response['rich_content']
        print(f"   Type: {rich.get('type')}")
        
        items = rich.get('items', [])
        print(f"   Items: {len(items)}")
        
        for i, item in enumerate(items, 1):
            print(f"\n   Item {i}:")
            print(f"      name: {item.get('name')}")
            print(f"      price: {item.get('price')}")
            print(f"      discounted_price: {item.get('discounted_price')}")
            print(f"      has_promotion: {item.get('has_promotion')}")
            print(f"      promotion_label: {item.get('promotion_label')}")
            
            # Check if discounted_price exists and is valid
            if item.get('discounted_price'):
                original = item.get('price', 0)
                discounted = item.get('discounted_price')
                if discounted < original:
                    discount_pct = ((original - discounted) / original * 100)
                    print(f"      ✅ Discount: {discount_pct:.0f}% ({original:,.0f}đ → {discounted:,.0f}đ)")
                else:
                    print(f"      ❌ discounted_price >= price (WRONG!)")
            else:
                print(f"      ❌ Missing discounted_price (PROBLEM!)")
        
        # Print full JSON for debugging
        print(f"\n[4] Full carousel JSON:")
        print(json.dumps(rich, indent=2, ensure_ascii=False))
    else:
        print("   ❌ No rich_content!")
    
    print("\n" + "=" * 70)
    client.close()

if __name__ == "__main__":
    asyncio.run(debug_carousel())
