"""
Remove old has_promotion flags from menu items
"""
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

async def clean_old_promotions():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 70)
    print("Cleaning Old Promotion Flags from Menu Items")
    print("=" * 70)
    
    # Get store
    store = await db.stores.find_one({"name": "Quán Cafe abc"})
    if not store:
        print("❌ Store not found")
        return
    
    store_id = store["id"]
    print(f"\n✓ Store: {store['name']}")
    
    # Find items with has_promotion flag
    print(f"\n[1] Finding items with old promotion flags...")
    items_with_flag = await db.menu_items.find({
        "store_id": store_id,
        "has_promotion": True
    }).to_list(100)
    
    print(f"   Found {len(items_with_flag)} items with has_promotion=True:")
    for item in items_with_flag:
        print(f"      • {item['name']}")
        if item.get('promotion_discount'):
            print(f"        promotion_discount: {item.get('promotion_discount')}%")
        if item.get('discounted_price'):
            print(f"        discounted_price: {item.get('discounted_price'):,.0f}đ")
    
    # Remove promotion flags
    print(f"\n[2] Removing old promotion flags...")
    result = await db.menu_items.update_many(
        {"store_id": store_id},
        {
            "$unset": {
                "has_promotion": "",
                "promotion_discount": "",
                "discounted_price": "",
                "promotion_label": ""
            }
        }
    )
    
    print(f"   ✓ Updated {result.modified_count} items")
    
    # Verify cleanup
    print(f"\n[3] Verifying cleanup...")
    remaining = await db.menu_items.find({
        "store_id": store_id,
        "has_promotion": True
    }).to_list(100)
    
    if remaining:
        print(f"   ❌ Still {len(remaining)} items with flag (cleanup failed)")
    else:
        print(f"   ✅ All promotion flags removed successfully")
    
    # Show current state
    print(f"\n[4] Current menu items state:")
    all_items = await db.menu_items.find({"store_id": store_id}).to_list(100)
    
    for item in all_items:
        has_flag = item.get('has_promotion', False)
        status = "⚠️ HAS FLAG" if has_flag else "✓"
        print(f"   {status} {item['name']} - {item.get('price', 0):,.0f}đ")
    
    print("\n" + "=" * 70)
    print("✅ CLEANUP COMPLETED!")
    print("=" * 70)
    print("Now menu items only show promotions from 'promotions' collection")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clean_old_promotions())
