"""Check user subscription status in detail."""
import asyncio
import sys

sys.path.insert(0, 'D:/Minitake/app/backend')

from config.database import Database


async def check_all_users():
    """Check all users and their subscription status."""
    await Database.connect()
    db = Database.get_db()

    print("=" * 70)
    print("ALL USERS WITH THEIR STORES AND SUBSCRIPTIONS")
    print("=" * 70)

    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    
    for u in users:
        user_id = u.get('id')
        email = u.get('email')
        store_id = u.get('store_id')
        
        print(f"\n{'='*70}")
        print(f"USER: {email}")
        print(f"  User ID: {user_id}")
        print(f"  Store ID: {store_id}")
        
        if store_id:
            # Check store
            store = await db.stores.find_one({"id": store_id}, {"_id": 0})
            if store:
                print(f"  Store Name: {store.get('name')}")
                print(f"  Store Plan: {store.get('plan_id')}")
                print(f"  Subscription ID: {store.get('subscription_id')}")
                
                # Check subscription
                subscription_id = store.get('subscription_id')
                if subscription_id:
                    sub = await db.subscriptions.find_one({"subscription_id": subscription_id}, {"_id": 0})
                    if sub:
                        print(f"  Subscription Plan: {sub.get('plan_id')}")
                        print(f"  Subscription Status: {sub.get('status')}")
                    else:
                        print(f"  Subscription: NOT FOUND (ID: {subscription_id})")
                else:
                    print(f"  Subscription: NONE")
            else:
                print(f"  Store: NOT FOUND (ID: {store_id})")
        else:
            print(f"  Store: NONE")

    print("\n" + "=" * 70)
    print("USERS WITHOUT STORE_ID:")
    print("=" * 70)
    users_no_store = await db.users.find({"store_id": {"$exists": False}}, {"_id": 0, "email": 1, "id": 1}).to_list(100)
    users_null_store = await db.users.find({"store_id": None}, {"_id": 0, "email": 1, "id": 1}).to_list(100)
    
    all_no_store = users_no_store + users_null_store
    for u in all_no_store:
        print(f"  - {u.get('email')} (ID: {u.get('id')})")
    
    if not all_no_store:
        print("  All users have store_id!")
    
    await Database.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(check_all_users())
