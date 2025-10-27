"""
Add promotion to menu items for testing
"""
import os
import sys
import asyncio

sys.path.insert(0, os.path.dirname(__file__))

os.environ['MONGO_URL'] = 'mongodb://mongo:szOUkzzUBhFyVylYDUyFyTPzoPQERUUc@maglev.proxy.rlwy.net:51481'
os.environ['DB_NAME'] = 'minitake_db'

from motor.motor_asyncio import AsyncIOMotorClient

async def add_promotions():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Get store
    store = await db.stores.find_one({}, {"_id": 0})
    print(f"Store: {store.get('name')}")
    
    # Get some menu items to add promotions
    items = await db.menu_items.find(
        {"store_id": store['id']},
        {"_id": 0}
    ).limit(3).to_list(3)
    
    print("\nAdding promotions to items:")
    for item in items:
        original_price = item.get('price', 0)
        discounted_price = int(original_price * 0.8)  # 20% off
        
        await db.menu_items.update_one(
            {"id": item['id']},
            {"$set": {
                "has_promotion": True,
                "discounted_price": discounted_price,
                "promotion_label": "Giảm 20%",
                "original_price": original_price
            }}
        )
        
        print(f"✓ {item['name']}: {original_price:,}đ → {discounted_price:,}đ")
    
    print("\n✓ Promotions added!")
    client.close()

if __name__ == "__main__":
    asyncio.run(add_promotions())
