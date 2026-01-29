"""Seed script for Minitake subscription data.

This script creates:
1. Super Admin account
2. Subscription plans (STARTER, PRO)
"""

import asyncio
import bcrypt
from datetime import datetime, timezone
import uuid
import sys
import os

# Fix Unicode for Windows console
os.environ['PYTHONIOENCODING'] = 'utf-8'

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import Database
from config.settings import settings


async def seed_super_admin(db):
    """Create Super Admin account."""
    print("Creating Super Admin account...")

    # Check if already exists
    existing = await db.super_admins.find_one({
        "email": "superadmin@minitake.vn"
    })

    if existing:
        print("  [OK] Super Admin already exists")
        return existing

    # Create Super Admin
    super_admin_id = f"sa_{uuid.uuid4().hex[:12]}"
    password_hash = bcrypt.hashpw("Admin@123456".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    super_admin_doc = {
        "super_admin_id": super_admin_id,
        "email": "superadmin@minitake.vn",
        "name": "Super Admin",
        "password_hash": password_hash,
        "role": "super_admin",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login_at": None
    }

    await db.super_admins.insert_one(super_admin_doc)
    print(f"  [OK] Super Admin created: superadmin@minitake.vn")
    print(f"  [OK] Password: Admin@123456")

    return super_admin_doc


async def seed_subscription_plans(db):
    """Create subscription plans."""
    print("\nCreating Subscription Plans...")

    plans = [
        {
            "plan_id": "starter",
            "name": "Goi STARTER",
            "description": "Danh cho cua hang nho voi nhu cau co ban",
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
        },
        {
            "plan_id": "pro",
            "name": "Goi PRO",
            "description": "Danh cho cua hang muon phat trien voi day du tinh nang",
            "price": 199000,
            "price_vat": 218900,  # 199000 + 10% VAT
            "max_tables": None,  # Unlimited
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
    ]

    for plan in plans:
        # Check if plan already exists
        existing = await db.subscription_plans.find_one({"plan_id": plan["plan_id"]})

        if existing:
            print(f"  [OK] Plan '{plan['plan_id']}' already exists")
            # Update existing plan
            await db.subscription_plans.update_one(
                {"plan_id": plan["plan_id"]},
                {"$set": plan}
            )
            print(f"  [OK] Plan '{plan['plan_id']}' updated")
        else:
            await db.subscription_plans.insert_one(plan)
            print(f"  [OK] Plan '{plan['plan_id']}' created: {plan['name']}")

    return plans


async def create_indexes(db):
    """Create indexes for performance."""
    print("\nCreating indexes...")

    # Super Admin indexes
    await db.super_admins.create_index("email", unique=True)
    await db.super_admins.create_index("super_admin_id")
    print("  [OK] super_admins indexes created")

    # Subscription Plans indexes
    await db.subscription_plans.create_index("plan_id", unique=True)
    print("  [OK] subscription_plans indexes created")

    # Subscriptions indexes - handle existing collection
    try:
        # First, update documents with null subscription_id to have unique values
        subscriptions = await db.subscriptions.find({}).to_list(10000)
        for sub in subscriptions:
            if sub.get("subscription_id") is None:
                new_id = f"sub_legacy_{uuid.uuid4().hex[:8]}"
                await db.subscriptions.update_one(
                    {"_id": sub["_id"]},
                    {"$set": {"subscription_id": new_id}}
                )
        # Now create unique index
        await db.subscriptions.create_index("subscription_id", unique=True)
        await db.subscriptions.create_index("store_id")
        await db.subscriptions.create_index("status")
        await db.subscriptions.create_index([("store_id", 1), ("status", 1)])
        print("  [OK] subscriptions indexes created")
    except Exception as e:
        print(f"  [WARN] subscriptions indexes: {e}")

    # Subscription Payments indexes - handle existing collection
    try:
        await db.subscription_payments.create_index("payment_id", unique=True)
        await db.subscription_payments.create_index("subscription_id")
        await db.subscription_payments.create_index("store_id")
        await db.subscription_payments.create_index("status")
        await db.subscription_payments.create_index("payos_order_id")
        await db.subscription_payments.create_index("paid_at")
        print("  [OK] subscription_payments indexes created")
    except Exception as e:
        print(f"  [WARN] subscription_payments indexes: {e}")

    # Super Admins indexes - handle existing collection
    try:
        await db.super_admins.create_index("email", unique=True)
        print("  [OK] super_admins indexes created")
    except Exception as e:
        print(f"  [WARN] super_admins indexes: {e}")

    # Stores indexes (for subscription fields)
    try:
        await db.stores.create_index("subscription_id")
        await db.stores.create_index("is_suspended")
        print("  [OK] stores indexes created (subscription fields)")
    except Exception as e:
        print(f"  [WARN] stores indexes: {e}")


async def seed_store_fields(db):
    """Add subscription fields to existing stores."""
    print("\nUpdating existing stores with subscription fields...")

    result = await db.stores.update_many(
        {},
        {
            "$set": {
                "subscription_id": None,
                "plan_id": "starter",
                "subscription_status": "active",
                "max_tables": 10,
                "is_suspended": False,
                "suspended_reason": None,
                "suspended_at": None
            }
        }
    )

    print(f"  [OK] Updated {result.modified_count} stores")


async def main():
    """Main seed function."""
    print("=" * 60)
    print("MINITAKE SUBSCRIPTION DATA SEED")
    print("=" * 60)

    # Connect to database
    print("\nConnecting to MongoDB...")
    await Database.connect()
    db = Database.get_db()
    print(f"  [OK] Connected to database: {settings.DB_NAME}")

    # Run seed operations
    await seed_super_admin(db)
    await seed_subscription_plans(db)
    await create_indexes(db)
    await seed_store_fields(db)

    print("\n" + "=" * 60)
    print("SEED COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    print("\nSuper Admin Credentials:")
    print("  Email: superadmin@minitake.vn")
    print("  Password: Admin@123456")
    print("\nSubscription Plans:")
    print("  - STARTER: Free (max 10 tables)")
    print("  - PRO: 199,000 VND/thang (218,900 VND with VAT)")
    print("  - Trial: 14 days free")

    # Close connection
    await Database.close()
    print("\nDatabase connection closed.")


if __name__ == "__main__":
    asyncio.run(main())
