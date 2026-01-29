"""Fix all subscriptions to match their store's plan_id."""
import asyncio
import sys
from datetime import datetime, timezone

sys.path.insert(0, 'D:/Minitake/app/backend')

from config.database import Database


async def fix_subscriptions():
    await Database.connect()
    db = Database.get_db()

    print("Fixing subscriptions...")
    
    # Get all stores
    stores = await db.stores.find({}).to_list(1000)
    
    fixed_count = 0
    for store in stores:
        store_id = store.get('id')
        store_plan = store.get('plan_id', 'starter')
        subscription_status = store.get('subscription_status', 'active')
        
        # Find subscription for this store
        sub = await db.subscriptions.find_one({"store_id": store_id})
        
        if sub:
            needs_update = False
            
            # Fix plan_id if None
            if sub.get('plan_id') is None:
                sub['plan_id'] = store_plan
                needs_update = True
                print(f"  Fixing plan_id: {store.get('name')} -> {store_plan}")
            
            # Fix status if not in allowed list
            if sub.get('status') not in ['active', 'trial']:
                sub['status'] = subscription_status
                needs_update = True
                print(f"  Fixing status: {store.get('name')} -> {subscription_status}")
            
            if needs_update:
                await db.subscriptions.update_one(
                    {"subscription_id": sub.get('subscription_id')},
                    {"$set": {
                        "plan_id": store_plan,
                        "status": subscription_status,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                fixed_count += 1
    
    print(f"\nFixed {fixed_count} subscriptions")
    
    # Verify the fix
    print("\n" + "=" * 50)
    print("VERIFICATION")
    print("=" * 50)
    
    subs = await db.subscriptions.find({}).to_list(1000)
    for sub in subs:
        store = await db.stores.find_one({"id": sub.get('store_id')})
        store_name = store.get('name') if store else 'Unknown'
        
        # Check if this sub will be returned by get_subscription
        is_active = sub.get('status') in ['active', 'trial']
        
        print(f"\n{store_name}:")
        print(f"  Sub plan_id: {sub.get('plan_id')}")
        print(f"  Sub status: {sub.get('status')}")
        print(f"  Store plan_id: {store.get('plan_id')}")
        print(f"  Will show as: {'ACTIVE' if is_active else 'NOT RETURNED'}")
    
    await Database.close()


if __name__ == "__main__":
    asyncio.run(fix_subscriptions())
