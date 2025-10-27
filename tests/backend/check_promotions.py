import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
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

async def check_promotions():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 70)
    print("Checking Promotions Data")
    print("=" * 70)
    
    # Get store
    store = await db.stores.find_one({"name": "Quán Cafe abc"})
    if not store:
        print("❌ Store not found")
        return
    
    store_id = store["id"]
    print(f"\n✓ Store: {store['name']}")
    print(f"  ID: {store_id}")
    print(f"  Slug: {store.get('slug', 'N/A')}")
    
    # Check promotions collection
    print(f"\n[1] Checking 'promotions' collection...")
    promotions = await db.promotions.find({"store_id": store_id}).to_list(100)
    print(f"   Total promotions: {len(promotions)}")
    
    if promotions:
        for promo in promotions:
            print(f"\n   📋 {promo['name']}")
            print(f"      Type: {promo['promotion_type']}")
            print(f"      Discount: {promo['discount_value']}")
            print(f"      Apply to: {promo['apply_to']}")
            print(f"      Active: {promo.get('is_active', False)}")
            print(f"      Start: {promo.get('start_date')}")
            print(f"      End: {promo.get('end_date')}")
            if promo.get('item_ids'):
                print(f"      Items: {promo['item_ids']}")
    else:
        print("   ⚠️  No promotions found in 'promotions' collection")
    
    # Check menu items with has_promotion
    print(f"\n[2] Checking 'menu_items' with has_promotion flag...")
    menu_items = await db.menu_items.find({
        "store_id": store_id,
        "has_promotion": True
    }).to_list(100)
    print(f"   Items with promotion flag: {len(menu_items)}")
    
    if menu_items:
        for item in menu_items:
            original = item.get('price', 0)
            discount = item.get('promotion_discount', 0)
            discounted = original * (1 - discount / 100)
            print(f"\n   🎉 {item['name']}")
            print(f"      Original: {original:,.0f}đ")
            print(f"      Discount: {discount}%")
            print(f"      Discounted: {discounted:,.0f}đ")
    
    # Check active promotions (like the API does)
    print(f"\n[3] Simulating /api/promotions/active endpoint...")
    now = datetime.now(timezone.utc).isoformat()
    active_promos = await db.promotions.find({
        "store_id": store_id,
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }).to_list(100)
    print(f"   Active promotions (API result): {len(active_promos)}")
    
    if active_promos:
        for promo in active_promos:
            print(f"\n   ✓ {promo['name']} - {promo['discount_value']}% off")
    else:
        print("   ❌ No active promotions (this is why chatbot shows nothing!)")
    
    print("\n" + "=" * 70)
    client.close()

if __name__ == "__main__":
    asyncio.run(check_promotions())
