"""Check user's store and update to PRO if needed."""
import asyncio
import sys

sys.path.insert(0, 'D:/Minitake/app/backend')

from config.database import Database


async def check_user_store(user_email: str = None):
    """Check user's store and subscription status."""
    await Database.connect()
    db = Database.get_db()

    # Find user by email
    user = None
    if user_email:
        user = await db.users.find_one({"email": user_email})

    if not user:
        # List all users with their stores
        print("Users in database:")
        users = await db.users.find({}).to_list(100)
        for u in users:
            print(f"\n  Email: {u.get('email')}")
            print(f"  User ID: {u.get('id')}")
            print(f"  Store ID: {u.get('store_id')}")
            if u.get('store_id'):
                store = await db.stores.find_one({"id": u.get('store_id')})
                if store:
                    print(f"  Store Name: {store.get('name')}")
                    print(f"  Store Plan: {store.get('plan_id')}")
                    print(f"  Subscription: {store.get('subscription_status')}")
        await Database.close()
        return

    print(f"User found:")
    print(f"  Email: {user.get('email')}")
    print(f"  User ID: {user.get('id')}")
    print(f"  Store ID: {user.get('store_id')}")

    if user.get('store_id'):
        store = await db.stores.find_one({"id": user.get('store_id')})
        if store:
            print(f"\nStore info:")
            print(f"  Name: {store.get('name')}")
            print(f"  Plan ID: {store.get('plan_id')}")
            print(f"  Subscription Status: {store.get('subscription_status')}")
            print(f"  Max Tables: {store.get('max_tables')}")

            # Check subscription collection too
            subscription = await db.subscriptions.find_one({"store_id": user.get('store_id')})
            if subscription:
                print(f"\nSubscription record:")
                print(f"  Subscription ID: {subscription.get('subscription_id')}")
                print(f"  Plan: {subscription.get('plan_id')}")
                print(f"  Status: {subscription.get('status')}")
            else:
                print("\n  No subscription record found!")

    await Database.close()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Check user store status')
    parser.add_argument('--email', type=str, help='User email')
    args = parser.parse_args()

    if not args.email:
        print("Usage: py scripts/check_user_store.py --email user@example.com")
        print()
        asyncio.run(check_user_store())
    else:
        asyncio.run(check_user_store(args.email))
