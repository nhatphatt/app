"""Subscription Service for Minitake F&B system.

Handles all subscription-related business logic including:
- Subscription creation, upgrade, downgrade, cancellation
- Trial activation
- Feature gating based on plan
- Payment processing coordination
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from bson import ObjectId
import logging

from config.database import Database
from config.settings import settings
from services.payos_service import payos_service
from services.email_service import email_service

logger = logging.getLogger(__name__)


class SubscriptionService:
    """Service for managing subscriptions."""

    def __init__(self):
        self.db = None  # Will be set via init method

    async def init_db(self, db):
        """Initialize service with database instance."""
        self.db = db

    # ============ PLAN MANAGEMENT ============

    async def get_plan(self, plan_id: str) -> Optional[Dict[str, Any]]:
        """Get subscription plan by ID."""
        return await self.db.subscription_plans.find_one({"plan_id": plan_id})

    async def get_all_plans(self) -> List[Dict[str, Any]]:
        """Get all active subscription plans."""
        return await self.db.subscription_plans.find(
            {"is_active": True}
        ).to_list(100)

    # ============ SUBSCRIPTION MANAGEMENT ============

    async def create_subscription(
        self,
        store_id: str,
        plan_id: str,
        is_trial: bool = False
    ) -> Dict[str, Any]:
        """Create a new subscription for a store.

        Args:
            store_id: Store ID
            plan_id: Plan ID (starter or pro)
            is_trial: Whether this is a trial subscription

        Returns:
            Dict with subscription details
        """
        now = datetime.now(timezone.utc)
        trial_ends_at = None
        period_start = now.isoformat()
        period_end = (now + timedelta(days=30)).isoformat()

        # Calculate max tables based on plan
        plan = await self.get_plan(plan_id)
        if not plan:
            raise ValueError(f"Plan not found: {plan_id}")

        max_tables = plan.get("max_tables")

        # If trial, set trial end date
        if is_trial:
            trial_ends_at = (now + timedelta(days=settings.TRIAL_DAYS)).isoformat()
            period_start = now.isoformat()
            period_end = trial_ends_at  # Trial ends at same time as period

        subscription_id = f"sub_{uuid.uuid4().hex[:12]}"

        subscription_doc = {
            "subscription_id": subscription_id,
            "store_id": store_id,
            "plan_id": plan_id,
            "status": "trial" if is_trial else "active",
            "trial_ends_at": trial_ends_at,
            "current_period_start": period_start,
            "current_period_end": period_end,
            "cancel_at_period_end": False,
            "max_tables": max_tables,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }

        # Insert subscription
        await self.db.subscriptions.insert_one(subscription_doc)

        # Update store with subscription info
        await self.db.stores.update_one(
            {"id": store_id},
            {
                "$set": {
                    "subscription_id": subscription_id,
                    "plan_id": plan_id,
                    "subscription_status": "trial" if is_trial else "active",
                    "max_tables": max_tables,
                    "updated_at": now.isoformat()
                }
            }
        )

        return subscription_doc

    async def get_subscription(self, store_id: str) -> Optional[Dict[str, Any]]:
        """Get active subscription for a store."""
        return await self.db.subscriptions.find_one({
            "store_id": store_id,
            "status": {"$in": ["active", "trial"]}
        })

    async def get_subscription_by_id(self, subscription_id: str) -> Optional[Dict[str, Any]]:
        """Get subscription by ID."""
        return await self.db.subscriptions.find_one({
            "subscription_id": subscription_id
        })

    async def upgrade_subscription(
        self,
        store_id: str,
        from_plan: str,
        to_plan: str
    ) -> Dict[str, Any]:
        """Upgrade subscription to a higher plan.

        Args:
            store_id: Store ID
            from_plan: Current plan ID
            to_plan: New plan ID

        Returns:
            Dict with payment link details
        """
        now = datetime.now(timezone.utc)
        
        # DETAILED DEBUG LOGGING
        logger.info("=" * 60)
        logger.info("UPGRADE SUBSCRIPTION CALLED")
        logger.info(f"store_id: {store_id}")
        logger.info(f"from_plan: {from_plan}")
        logger.info(f"to_plan: {to_plan}")
        logger.info("=" * 60)

        # Get store info
        store = await self.db.stores.find_one({"id": store_id})
        logger.info(f"Store found: {store}")
        
        if not store:
            logger.error("Store not found!")
            return {"success": False, "error": "Store not found"}

        # Get new plan
        new_plan = await self.get_plan(to_plan)
        logger.info(f"New plan (PRO) found: {new_plan}")
        
        if not new_plan:
            logger.error("PRO plan not found in database!")
            return {"success": False, "error": "Plan not found: pro"}

        # Check if store has subscription_id
        subscription_id = store.get("subscription_id")
        logger.info(f"Store subscription_id: {subscription_id}")
        
        if not subscription_id:
            logger.info("No subscription_id found, creating one...")
            # Create subscription first
            subscription_id = f"sub_{uuid.uuid4().hex[:12]}"
            await self.db.subscriptions.insert_one({
                "subscription_id": subscription_id,
                "store_id": store_id,
                "plan_id": from_plan,
                "status": "active",
                "trial_ends_at": None,
                "current_period_start": now.isoformat(),
                "current_period_end": (now + timedelta(days=30)).isoformat(),
                "cancel_at_period_end": False,
                "max_tables": store.get("max_tables", 10),
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            })
            # Update store with subscription_id
            await self.db.stores.update_one(
                {"id": store_id},
                {"$set": {"subscription_id": subscription_id}}
            )
            logger.info(f"Created new subscription: {subscription_id}")

        # Generate order code
        order_code = payos_service._generate_order_code(f"upgrade_{from_plan}_{to_plan}")
        logger.info(f"Generated order code: {order_code}")

        # Create payment
        payment_id = f"pay_{uuid.uuid4().hex[:12]}"
        payment_doc = {
            "payment_id": payment_id,
            "subscription_id": subscription_id,
            "store_id": store_id,
            "amount": new_plan["price_vat"],
            "amount_vat": new_plan["price_vat"],
            "amount_without_vat": new_plan["price"],
            "payment_method": "payos",
            "status": "pending",
            "payos_order_id": order_code,
            "metadata": {
                "type": "upgrade",
                "from_plan": from_plan,
                "to_plan": to_plan
            },
            "created_at": now.isoformat()
        }
        logger.info(f"Payment document created: {payment_id}")

        await self.db.subscription_payments.insert_one(payment_doc)

        # Create PayOS payment link
        result = await payos_service.create_payment_link(
            order_code=order_code,
            amount=new_plan["price_vat"],
            description=f"Nâng cấp lên {new_plan['name']}",
            buyer_name=store.get("name", ""),
            buyer_email=store.get("admin_email", ""),
            buyer_phone=store.get("phone", ""),
            return_url=settings.SUBSCRIPTION_RETURN_URL,
            cancel_url=settings.SUBSCRIPTION_CANCEL_URL,
            items=[
                {
                    "name": new_plan["name"],
                    "quantity": 1,
                    "price": new_plan["price"]
                },
                {
                    "name": f"VAT (10%)",
                    "quantity": 1,
                    "price": new_plan["price_vat"] - new_plan["price"]
                }
            ]
        )

        if result.get("success"):
            # Update payment with PayOS link
            await self.db.subscription_payments.update_one(
                {"payment_id": payment_id},
                {"$set": {
                    "payos_payment_link": result.get("checkout_url")
                }}
            )
            result["payment_id"] = payment_id
        else:
            result["payment_id"] = payment_id

        return result

    async def activate_trial(self, store_id: str, admin_email: str) -> Dict[str, Any]:
        """Activate 14-day trial for a store.

        Args:
            store_id: Store ID
            admin_email: Admin email for notifications

        Returns:
            Dict with trial activation result
        """
        # Check if store already has subscription
        existing = await self.get_subscription(store_id)
        if existing:
            if existing["status"] == "trial":
                return {
                    "success": False,
                    "error": "Store already has active trial"
                }
            if existing["status"] == "active":
                return {
                    "success": False,
                    "error": "Store already has active subscription"
                }

        # Create trial subscription
        subscription = await self.create_subscription(
            store_id=store_id,
            plan_id="pro",
            is_trial=True
        )

        # Get store info for email
        store = await self.db.stores.find_one({"id": store_id})

        # Calculate trial end date
        trial_end = datetime.fromisoformat(subscription["trial_ends_at"])
        trial_end_str = trial_end.strftime("%d/%m/%Y %H:%M")

        # Send confirmation email
        await email_service.send_trial_activation_email(
            to=admin_email,
            store_name=store.get("name", ""),
            trial_end_date=trial_end_str
        )

        return {
            "success": True,
            "subscription": subscription,
            "message": "Trial activated successfully"
        }

    async def cancel_subscription(self, store_id: str, cancel_at_period_end: bool = True) -> Dict[str, Any]:
        """Cancel subscription.

        Args:
            store_id: Store ID
            cancel_at_period_end: If True, cancel at end of current period

        Returns:
            Dict with cancellation result
        """
        now = datetime.now(timezone.utc)

        subscription = await self.get_subscription(store_id)
        if not subscription:
            raise ValueError("No active subscription found")

        # Get store for email
        store = await self.db.stores.find_one({"id": store_id})

        if cancel_at_period_end:
            # Mark to cancel at period end
            await self.db.subscriptions.update_one(
                {"subscription_id": subscription["subscription_id"]},
                {"$set": {
                    "cancel_at_period_end": True,
                    "updated_at": now.isoformat()
                }}
            )

            # Send confirmation email (don't fail if email fails)
            try:
                period_end_str = subscription.get("current_period_end")
                if period_end_str:
                    try:
                        period_end = datetime.fromisoformat(period_end_str)
                        end_date = period_end.strftime("%d/%m/%Y")
                    except (ValueError, TypeError):
                        end_date = period_end_str
                else:
                    end_date = "N/A"

                await email_service.send_subscription_cancelled_email(
                    to=store.get("admin_email", "") if store else "",
                    store_name=store.get("name", "") if store else "",
                    end_date=end_date
                )
            except Exception as email_error:
                logger.warning(f"Failed to send cancellation email: {email_error}")
                # Don't fail the cancellation, just log the error

            return {
                "success": True,
                "message": "Subscription will be cancelled at end of billing period",
                "cancel_at": subscription.get("current_period_end", "N/A")
            }
        else:
            # Immediate cancellation
            await self.db.subscriptions.update_one(
                {"subscription_id": subscription["subscription_id"]},
                {"$set": {
                    "status": "cancelled",
                    "updated_at": now.isoformat()
                }}
            )

            # Downgrade store to STARTER
            await self.downgrade_to_starter(store_id)

            return {
                "success": True,
                "message": "Subscription cancelled immediately"
            }

    async def downgrade_to_starter(self, store_id: str):
        """Downgrade store to STARTER plan.

        Args:
            store_id: Store ID
        """
        now = datetime.now(timezone.utc)
        starter_plan = await self.get_plan("starter")

        await self.db.stores.update_one(
            {"id": store_id},
            {"$set": {
                "plan_id": "starter",
                "max_tables": starter_plan.get("max_tables", 10),
                "subscription_status": "cancelled",
                "updated_at": now.isoformat()
            }}
        )

        logger.info(f"Store {store_id} downgraded to STARTER")

    async def process_payment_success(
        self,
        payment_id: str,
        payos_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process successful payment.

        Args:
            payment_id: Internal payment ID
            payos_data: PayOS payment data

        Returns:
            Dict with processing result
        """
        now = datetime.now(timezone.utc)

        # Get payment
        payment = await self.db.subscription_payments.find_one({
            "payment_id": payment_id
        })
        if not payment:
            raise ValueError("Payment not found")

        # Update payment status
        await self.db.subscription_payments.update_one(
            {"payment_id": payment_id},
            {"$set": {
                "status": "paid",
                "paid_at": now.isoformat(),
                "payos_transaction_id": payos_data.get("transactionId"),
                "updated_at": now.isoformat()
            }}
        )

        store_id = payment["store_id"]
        metadata = payment.get("metadata", {})

        # Check if this is an upgrade
        if metadata.get("type") == "upgrade":
            from_plan = metadata.get("from_plan")
            to_plan = metadata.get("to_plan")

            # Get subscription
            subscription = await self.get_subscription(store_id)
            if subscription:
                # Extend subscription period
                new_end = datetime.fromisoformat(subscription["current_period_end"]) + timedelta(days=30)

                await self.db.subscriptions.update_one(
                    {"subscription_id": subscription["subscription_id"]},
                    {"$set": {
                        "plan_id": to_plan,
                        "max_tables": (await self.get_plan(to_plan)).get("max_tables"),
                        "status": "active",
                        "current_period_start": now.isoformat(),
                        "current_period_end": new_end.isoformat(),
                        "updated_at": now.isoformat()
                    }}
                )

                # Update store
                await self.db.stores.update_one(
                    {"id": store_id},
                    {"$set": {
                        "plan_id": to_plan,
                        "max_tables": (await self.get_plan(to_plan)).get("max_tables"),
                        "subscription_status": "active",
                        "updated_at": now.isoformat()
                    }}
                )

            # Send upgrade email
            store = await self.db.stores.find_one({"id": store_id})
            if store:
                await email_service.send_upgrade_success_email(
                    to=store.get("admin_email", ""),
                    store_name=store.get("name", ""),
                    old_plan=from_plan,
                    new_plan=to_plan,
                    effective_date=now.strftime("%d/%m/%Y")
                )

        else:
            # New subscription or initial PRO subscription
            subscription = await self.get_subscription(store_id)
            if subscription:
                # Extend period
                new_end = datetime.fromisoformat(subscription["current_period_end"]) + timedelta(days=30)

                await self.db.subscriptions.update_one(
                    {"subscription_id": subscription["subscription_id"]},
                    {"$set": {
                        "status": "active",
                        "trial_ends_at": None,
                        "current_period_start": now.isoformat(),
                        "current_period_end": new_end.isoformat(),
                        "updated_at": now.isoformat()
                    }}
                )

                # Update store
                await self.db.stores.update_one(
                    {"id": store_id},
                    {"$set": {
                        "subscription_status": "active",
                        "updated_at": now.isoformat()
                    }}
                )

            # Send payment confirmation
            store = await self.db.stores.find_one({"id": store_id})
            if store:
                await email_service.send_payment_confirmation_email(
                    to=store.get("admin_email", ""),
                    store_name=store.get("name", ""),
                    payment_id=payment_id,
                    amount=payment["amount"],
                    payment_method="PayOS",
                    paid_at=now.strftime("%d/%m/%Y %H:%M"),
                    start_date=now.strftime("%d/%m/%Y"),
                    end_date=new_end.strftime("%d/%m/%Y")
                )

        return {
            "success": True,
            "message": "Payment processed successfully"
        }

    # ============ FEATURE GATING ============

    async def check_feature_access(self, store_id: str, feature: str) -> bool:
        """Check if store has access to a specific feature.

        Args:
            store_id: Store ID
            feature: Feature name to check

        Returns:
            True if feature is accessible
        """
        subscription = await self.get_subscription(store_id)
        if not subscription:
            return False

        # Check if trial expired
        if subscription["status"] == "trial":
            trial_end = datetime.fromisoformat(subscription["trial_ends_at"])
            if datetime.now(timezone.utc) > trial_end:
                return False

        # Get plan features
        plan = await self.get_plan(subscription["plan_id"])
        if not plan:
            return False

        return plan.get("features", {}).get(feature, False)

    async def check_table_limit(self, store_id: str) -> Dict[str, Any]:
        """Check if store can add more tables.

        Args:
            store_id: Store ID

        Returns:
            Dict with limit status
        """
        subscription = await self.get_subscription(store_id)
        if not subscription:
            return {
                "allowed": False,
                "reason": "No active subscription"
            }

        # Check if trial expired
        if subscription["status"] == "trial":
            trial_end = datetime.fromisoformat(subscription["trial_ends_at"])
            if datetime.now(timezone.utc) > trial_end:
                return {
                    "allowed": False,
                    "reason": "Trial expired"
                }

        max_tables = subscription.get("max_tables")
        if max_tables is None:
            return {
                "allowed": True,
                "limit": None,
                "current": 0,
                "remaining": None
            }

        # Count current tables
        current_count = await self.db.tables.count_documents({
            "store_id": store_id
        })

        return {
            "allowed": current_count < max_tables,
            "limit": max_tables,
            "current": current_count,
            "remaining": max(0, max_tables - current_count)
        }

    # ============ SUPER ADMIN METHODS ============

    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """Get dashboard statistics for super admin."""
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

        # Total stores
        total_stores = await self.db.stores.count_documents({})

        # Subscriptions by status
        active_subs = await self.db.subscriptions.count_documents({
            "status": "active"
        })
        trial_subs = await self.db.subscriptions.count_documents({
            "status": "trial"
        })

        # Subscriptions by plan
        starter_subs = await self.db.subscriptions.count_documents({
            "plan_id": "starter",
            "status": {"$in": ["active", "trial"]}
        })
        pro_subs = await self.db.subscriptions.count_documents({
            "plan_id": "pro",
            "status": {"$in": ["active", "trial"]}
        })

        # Revenue (month)
        month_payments = await self.db.subscription_payments.find({
            "status": "paid",
            "paid_at": {"$gte": month_start.isoformat()}
        }).to_list(10000)
        total_revenue_month = sum(p.get("amount", 0) for p in month_payments)

        # Revenue (year)
        year_payments = await self.db.subscription_payments.find({
            "status": "paid",
            "paid_at": {"$gte": year_start.isoformat()}
        }).to_list(100000)
        total_revenue_year = sum(p.get("amount", 0) for p in year_payments)

        # Pending payments
        pending_payments = await self.db.subscription_payments.count_documents({
            "status": "pending"
        })

        # Recent payments
        recent_payments = await self.db.subscription_payments.find(
            {"status": "paid"}
        ).sort("paid_at", -1).limit(10).to_list(10)

        return {
            "total_stores": total_stores,
            "active_subscriptions": active_subs,
            "trial_subscriptions": trial_subs,
            "starter_subscriptions": starter_subs,
            "pro_subscriptions": pro_subs,
            "total_revenue_month": total_revenue_month,
            "total_revenue_year": total_revenue_year,
            "pending_payments": pending_payments,
            "recent_payments": recent_payments
        }

    async def get_all_stores(self, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        """Get all stores with pagination."""
        skip = (page - 1) * limit

        stores = await self.db.stores.find({}).skip(skip).limit(limit).to_list(limit)
        total = await self.db.stores.count_documents({})

        # Enrich with subscription info
        for store in stores:
            subscription = await self.get_subscription(store["id"])
            store["subscription"] = subscription

        return {
            "stores": stores,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }

    async def suspend_store(self, store_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """Suspend a store."""
        now = datetime.now(timezone.utc)

        await self.db.stores.update_one(
            {"id": store_id},
            {"$set": {
                "is_suspended": True,
                "suspended_reason": reason,
                "suspended_at": now.isoformat(),
                "updated_at": now.isoformat()
            }}
        )

        return {"success": True, "message": "Store suspended"}

    async def activate_store(self, store_id: str) -> Dict[str, Any]:
        """Activate a suspended store."""
        now = datetime.now(timezone.utc)

        await self.db.stores.update_one(
            {"id": store_id},
            {"$set": {
                "is_suspended": False,
                "suspended_reason": None,
                "suspended_at": None,
                "updated_at": now.isoformat()
            }}
        )

        return {"success": True, "message": "Store activated"}

    async def get_all_payments(
        self,
        page: int = 1,
        limit: int = 20,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get all subscription payments with pagination."""
        skip = (page - 1) * limit

        query = {}
        if status:
            query["status"] = status

        payments = await self.db.subscription_payments.find(query).skip(skip).limit(limit).to_list(limit)
        total = await self.db.subscription_payments.count_documents(query)

        return {
            "payments": payments,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }

    async def get_revenue_analytics(
        self,
        period: str = "month"
    ) -> List[Dict[str, Any]]:
        """Get revenue analytics by period."""
        now = datetime.now(timezone.utc)

        if period == "month":
            # Daily revenue for current month
            days_in_month = (now.replace(day=1, month=now.month + 1) - timedelta(days=1)).day
            result = []

            for day in range(1, days_in_month + 1):
                day_start = now.replace(day=day, hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)

                payments = await self.db.subscription_payments.find({
                    "status": "paid",
                    "paid_at": {
                        "$gte": day_start.isoformat(),
                        "$lt": day_end.isoformat()
                    }
                }).to_list(1000)

                total = sum(p.get("amount", 0) for p in payments)

                result.append({
                    "date": day_start.strftime("%d/%m"),
                    "revenue": total,
                    "count": len(payments)
                })

            return result

        elif period == "year":
            # Monthly revenue for current year
            result = []

            for month in range(1, now.month + 1):
                month_start = now.replace(month=month, day=1, hour=0, minute=0, second=0, microsecond=0)
                month_end = month_start + timedelta(days=32)
                month_end = month_end.replace(day=1)

                payments = await self.db.subscription_payments.find({
                    "status": "paid",
                    "paid_at": {
                        "$gte": month_start.isoformat(),
                        "$lt": month_end.isoformat()
                    }
                }).to_list(10000)

                total = sum(p.get("amount", 0) for p in payments)

                result.append({
                    "month": month_start.strftime("%m/%Y"),
                    "revenue": total,
                    "count": len(payments)
                })

            return result

        return []

    async def get_all_subscriptions(
        self,
        page: int = 1,
        limit: int = 20,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get all subscriptions with pagination."""
        skip = (page - 1) * limit

        query = {}
        if status:
            query["status"] = status

        subscriptions = await self.db.subscriptions.find(query).skip(skip).limit(limit).to_list(limit)
        total = await self.db.subscriptions.count_documents(query)

        return {
            "subscriptions": subscriptions,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }


# Create service instance
subscription_service = SubscriptionService()
