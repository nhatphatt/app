import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path

# Load .env manually
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip().strip('"').strip("'")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

async def check_categories():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 70)
    print("Checking Categories and Menu Items")
    print("=" * 70)
    
    # Get store
    store = await db.stores.find_one({"name": "Quán Cafe abc"})
    if not store:
        print("❌ Store not found")
        return
    
    store_id = store["id"]
    print(f"\n✓ Store: {store['name']} (ID: {store_id})")
    
    # Get all categories
    print(f"\n[1] Categories:")
    categories = await db.categories.find({"store_id": store_id}).to_list(100)
    category_map = {}
    for cat in categories:
        category_map[cat['id']] = cat['name']
        print(f"   📁 {cat['name']} (ID: {cat['id']})")
    
    # Get all menu items with their categories
    print(f"\n[2] Menu items by category:")
    menu_items = await db.menu_items.find({"store_id": store_id}).to_list(100)
    
    items_by_category = {}
    for item in menu_items:
        cat_id = item.get('category_id')
        cat_name = category_map.get(cat_id, 'Unknown')
        if cat_name not in items_by_category:
            items_by_category[cat_name] = []
        items_by_category[cat_name].append(item)
    
    for cat_name, items in items_by_category.items():
        print(f"\n   📁 {cat_name}:")
        for item in items:
            print(f"      • {item['name']} - {item.get('price', 0):,.0f}đ (ID: {item['id'][:20]}...)")
    
    # Check active promotion
    print(f"\n[3] Active promotion:")
    promo = await db.promotions.find_one({
        "store_id": store_id,
        "name": "giảm 20% cho món tráng miệng"
    })
    
    if promo:
        print(f"   🎉 {promo['name']}")
        print(f"      Apply to: {promo['apply_to']}")
        print(f"      Category IDs: {promo.get('category_ids', [])}")
        
        # Check which category
        if promo.get('category_ids'):
            for cat_id in promo['category_ids']:
                cat_name = category_map.get(cat_id, 'Unknown')
                print(f"      → Category: {cat_name}")
                if cat_name in items_by_category:
                    print(f"         Items affected:")
                    for item in items_by_category[cat_name]:
                        discounted = item.get('price', 0) * 0.8  # 20% off
                        print(f"         • {item['name']}: {item.get('price', 0):,.0f}đ → {discounted:,.0f}đ")
    
    print("\n" + "=" * 70)
    client.close()

if __name__ == "__main__":
    asyncio.run(check_categories())
