"""Fix missing subscription records."""
import asyncio
import uuid
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, 'D:/Minitake/app/backend')

from config.database import Database


async def fix_missing_subscriptions():
    await Database.connect()
    db = Database.get_db()

    print("Checking for stores with missing subscriptions...")
    
    # Get all stores
    stores = await db.stores.find({}).to_list(1000)
    
    fixed_count = 0
    for store in stores:
        store_id = store.get('id')
        store_name = store.get('name')
        plan_id = store.get('plan_id', 'starter')
        subscription_id = store.get('subscription_id')
        
        # Check if subscription exists
        if subscription_id:
            sub = await db.subscriptions.find_one({"subscription_id": subscription_id})
            if not sub:
                print(f"\nFOUND MISMATCH: {store_name}")
                print(f"  Store ID: {store_id}")
                print(f"  Store Plan: {plan_id}")
                print(f"  Subscription ID: {subscription_id} - NOT FOUND!")
                print(f"  Fixing...")
                
                # Create the missing subscription
                now = datetime.now(timezone.utc)
                await db.subscriptions.insert_one({
                    "subscription_id": subscription_id,
                    "store_id": store_id,
                    "plan_id": plan_id,
                    "status": "active",
                    "trial_ends_at": None,
                    "current_period_start": now.isoformat(),
                    "current_period_end": (now + timedelta(days=30)).isoformat(),
                    "cancel_at_period_end": False,
                    "max_tables": store.get('max_tables'),
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat()
                })
                print(f"  FIXED: Created subscription {subscription_id}")
                fixed_count += 1
    
    print(f"\n{'='*50}")
    if fixed_count > 0:
        print(f"Fixed {fixed_count} missing subscriptions!")
    else:
        print("All subscriptions are valid!")
    
    await Database.close()


if __name__ == "__main__":
    asyncio.run(fix_missing_subscriptions())
