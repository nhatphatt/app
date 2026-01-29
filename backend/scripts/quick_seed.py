"""Quick seed script for Minitake subscription data."""
import asyncio
import bcrypt
from datetime import datetime, timezone
import uuid
import sys

sys.path.insert(0, 'D:/Minitake/app/backend')

from config.database import Database
from config.settings import settings


async def seed_all():
    print("=" * 50)
    print("MINITAKE SUBSCRIPTION DATA SEED")
    print("=" * 50)
    
    await Database.connect()
    db = Database.get_db()
    print(f"Connected to: {settings.DB_NAME}")
    
    # 1. Create subscription plans
    print("\n[1/4] Creating subscription plans...")
    
    starter_plan = {
        "plan_id": "starter",
        "name": "Goi STARTER",
        "description": "Danh cho cua hang nho",
        "price": 0,
        "price_vat": 0,
        "max_tables": 10,
        "features": {
            "qr_menu": True,
            "basic_reports": True,
            "online_payment": True,
            "ai_chatbot": False,
            "ai_reports": False,
            "unlimited_tables": False,
            "priority_support": False
        },
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    pro_plan = {
        "plan_id": "pro",
        "name": "Goi PRO",
        "description": "Day du tinh nang",
        "price": 199000,
        "price_vat": 218900,
        "max_tables": None,
        "features": {
            "qr_menu": True,
            "basic_reports": True,
            "online_payment": True,
            "ai_chatbot": True,
            "ai_reports": True,
            "unlimited_tables": True,
            "priority_support": True
        },
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    for plan in [starter_plan, pro_plan]:
        result = await db.subscription_plans.update_one(
            {"plan_id": plan["plan_id"]},
            {"$set": plan},
            upsert=True
        )
        print(f"  [OK] Plan '{plan['plan_id']}' upserted")
    
    # 2. Create indexes
    print("\n[2/4] Creating indexes...")
    try:
        await db.subscription_plans.create_index("plan_id", unique=True)
        await db.subscriptions.create_index("subscription_id", unique=True)
        await db.subscriptions.create_index("store_id")
        await db.subscription_payments.create_index("payment_id", unique=True)
        await db.subscription_payments.create_index("store_id")
        await db.stores.create_index("subscription_id")
        print("  [OK] Indexes created")
    except Exception as e:
        print(f"  [WARN] Index error (may already exist): {e}")
    
    # 3. List all stores
    print("\n[3/4] Existing stores:")
    stores = await db.stores.find({}).to_list(1000)
    for store in stores:
        print(f"  - Store ID: {store.get('id')}")
        print(f"    Name: {store.get('name')}")
        print(f"    Current plan_id: {store.get('plan_id', 'None')}")
        print(f"    Admin email: {store.get('admin_email', 'None')}")
        print()
    
    # 4. Instructions for updating to PRO
    print("[4/4] To update a store to PRO, run:")
    print("""
# In a Python script:
from config.database import Database
from datetime import datetime, timezone

await Database.connect()
db = Database.get_db()

# Update store to PRO (replace STORE_ID_HERE with actual store ID)
store_id = "STORE_ID_HERE"  # <-- Replace this!

await db.stores.update_one(
    {"id": store_id},
    {"$set": {
        "plan_id": "pro",
        "subscription_status": "active",
        "max_tables": None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }}
)

# Create subscription record
subscription_id = f"sub_{uuid.uuid4().hex[:12]}"
await db.subscriptions.insert_one({
    "subscription_id": subscription_id,
    "store_id": store_id,
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

# Update store with subscription_id
await db.stores.update_one(
    {"id": store_id},
    {"$set": {"subscription_id": subscription_id}}
)

print("Store updated to PRO!")
""")
    
    await Database.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(seed_all())
