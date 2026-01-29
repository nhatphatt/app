"""Ensure all stores have proper subscription records."""
import asyncio
import uuid
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, 'D:/Minitake/app/backend')

from config.database import Database


async def ensure_all():
    await Database.connect()
    db = Database.get_db()

    print("Ensuring all stores have subscription records...")
    
    stores = await db.stores.find({}).to_list(1000)
    
    for store in stores:
        store_id = store.get('id')
        store_plan = store.get('plan_id', 'starter')
        
        # Check if subscription exists
        sub = await db.subscriptions.find_one({"store_id": store_id})
        
        if not sub:
            # Create new subscription
            subscription_id = f"sub_{uuid.uuid4().hex[:12]}"
            now = datetime.now(timezone.utc)
            
            await db.subscriptions.insert_one({
                "subscription_id": subscription_id,
                "store_id": store_id,
                "plan_id": store_plan,
                "status": store.get('subscription_status', 'active'),
                "trial_ends_at": None,
                "current_period_start": now.isoformat(),
                "current_period_end": (now + timedelta(days=30)).isoformat(),
                "cancel_at_period_end": False,
                "max_tables": store.get('max_tables'),
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            })
            
            # Update store with subscription_id
            await db.stores.update_one(
                {"id": store_id},
                {"$set": {"subscription_id": subscription_id}}
            )
            
            print(f"  Created: {store.get('name')} -> {store_plan}")
        else:
            # Ensure subscription has correct plan_id
            if sub.get('plan_id') != store_plan:
                await db.subscriptions.update_one(
                    {"subscription_id": sub.get('subscription_id')},
                    {"$set": {
                        "plan_id": store_plan,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                print(f"  Updated: {store.get('name')} -> {store_plan}")
            else:
                print(f"  OK: {store.get('name')} -> {store_plan}")
    
    # Final verification
    print("\n" + "=" * 50)
    print("FINAL STATUS")
    print("=" * 50)
    
    for store in stores:
        sub = await db.subscriptions.find_one({"store_id": store.get('id')})
        print(f"\n{store.get('name')}:")
        print(f"  Store plan_id: {store.get('plan_id')}")
        print(f"  Has subscription_id: {bool(store.get('subscription_id'))}")
        print(f"  Sub plan_id: {sub.get('plan_id') if sub else 'None'}")
        print(f"  Sub status: {sub.get('status') if sub else 'None'}")
    
    await Database.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(ensure_all())
