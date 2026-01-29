"""Link all stores to their subscriptions."""
import asyncio
import sys
from datetime import datetime, timezone

sys.path.insert(0, 'D:/Minitake/app/backend')

from config.database import Database


async def link_all():
    await Database.connect()
    db = Database.get_db()

    print("Linking stores to subscriptions...")
    
    stores = await db.stores.find({}).to_list(1000)
    
    for store in stores:
        store_id = store.get('id')
        
        # Find subscription
        sub = await db.subscriptions.find_one({"store_id": store_id})
        
        if sub:
            # Update store with subscription_id if not present
            if not store.get('subscription_id'):
                await db.stores.update_one(
                    {"id": store_id},
                    {"$set": {
                        "subscription_id": sub.get('subscription_id'),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                print(f"  Linked: {store.get('name')} -> {sub.get('subscription_id')}")
            else:
                print(f"  Already linked: {store.get('name')}")
        else:
            print(f"  NO SUBSCRIPTION: {store.get('name')}")
    
    # Final check
    print("\n" + "=" * 50)
    print("FINAL CHECK")
    print("=" * 50)
    
    for store in stores:
        sub = await db.subscriptions.find_one({"store_id": store.get('id')})
        status = "OK" if store.get('subscription_id') == sub.get('subscription_id') else "MISMATCH"
        print(f"{store.get('name')}: {status}")
    
    await Database.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(link_all())
