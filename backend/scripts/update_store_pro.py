"""Update store to PRO subscription."""
import asyncio
import uuid
import sys

sys.path.insert(0, 'D:/Minitake/app/backend')

from config.database import Database
from datetime import datetime, timezone, timedelta


async def update_store_to_pro(store_id: str = None, store_name: str = None):
    """Update a store to PRO subscription."""
    await Database.connect()
    db = Database.get_db()
    
    # Find store by ID or name
    query = {}
    if store_id:
        query["id"] = store_id
    elif store_name:
        query["name"] = {"$regex": store_name, "$options": "i"}
    
    store = await db.stores.find_one(query)
    
    if not store:
        print(f"Store not found!")
        print(f"Available stores:")
        stores = await db.stores.find({}).to_list(100)
        for s in stores:
            print(f"  - ID: {s.get('id')} | Name: {s.get('name')}")
        await Database.close()
        return
    
    print(f"Found store:")
    print(f"  ID: {store.get('id')}")
    print(f"  Name: {store.get('name')}")
    print(f"  Current plan: {store.get('plan_id', 'None')}")
    print()
    
    # Check if already PRO
    if store.get('plan_id') == 'pro':
        print("Store is already on PRO!")
        await Database.close()
        return
    
    # Update store
    subscription_id = f"sub_{uuid.uuid4().hex[:12]}"
    
    await db.stores.update_one(
        {"id": store.get("id")},
        {"$set": {
            "plan_id": "pro",
            "subscription_id": subscription_id,
            "subscription_status": "active",
            "max_tables": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create subscription record
    await db.subscriptions.insert_one({
        "subscription_id": subscription_id,
        "store_id": store.get("id"),
        "plan_id": "pro",
        "status": "active",
        "trial_ends_at": None,
        "current_period_start": datetime.now(timezone.utc).isoformat(),
        "current_period_end": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "cancel_at_period_end": False,
        "max_tables": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    
    print(f"SUCCESS! Store updated to PRO:")
    print(f"  Subscription ID: {subscription_id}")
    print(f"  Plan: PRO (unlimited tables)")
    print(f"  Status: active")
    
    await Database.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Update store to PRO')
    parser.add_argument('--store-id', type=str, help='Store ID')
    parser.add_argument('--name', type=str, help='Store name (partial match)')
    
    args = parser.parse_args()
    
    if not args.store_id and not args.name:
        print("Usage:")
        print("  py scripts/update_store_pro.py --store-id <store_id>")
        print("  py scripts/update_store_pro.py --name <partial_name>")
        print()
        print("Example:")
        print("  py scripts/update_store_pro.py --name \"Cafe\"")
    else:
        asyncio.run(update_store_to_pro(
            store_id=args.store_id,
            store_name=args.name
        ))
