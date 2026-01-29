"""Check all subscriptions and stores."""
import asyncio
import sys

sys.path.insert(0, 'D:/Minitake/app/backend')

from config.database import Database


async def check_all():
    await Database.connect()
    db = Database.get_db()

    print("=" * 60)
    print("SUBSCRIPTIONS COLLECTION")
    print("=" * 60)
    subs = await db.subscriptions.find({}).to_list(1000)
    print(f"Total subscriptions: {len(subs)}")
    for sub in subs:
        print(f"\n  ID: {sub.get('subscription_id')}")
        print(f"  Store ID: {sub.get('store_id')}")
        print(f"  Plan: {sub.get('plan_id')}")
        print(f"  Status: {sub.get('status')}")
        print(f"  Trial ends: {sub.get('trial_ends_at')}")

    print("\n" + "=" * 60)
    print("STORES vs SUBSCRIPTIONS MAPPING")
    print("=" * 60)
    stores = await db.stores.find({}).to_list(100)
    for store in stores:
        store_id = store.get('id')
        store_plan = store.get('plan_id')

        # Check if subscription exists
        sub = await db.subscriptions.find_one({"store_id": store_id})
        sub_status = sub.get('status') if sub else "NO SUB"

        match = "✅" if store_plan == sub.get('plan_id') else "❌ MISMATCH"

        print(f"\n{store.get('name')}:")
        print(f"  Store plan_id: {store_plan}")
        print(f"  Subscription: {sub_status}")
        print(f"  Sub plan: {sub.get('plan_id') if sub else 'N/A'}")
        print(f"  {match}")

    await Database.close()


if __name__ == "__main__":
    asyncio.run(check_all())
