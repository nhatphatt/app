"""Subscription Router for Minitake F&B system.

Handles all subscription-related API endpoints for store owners.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone
import jwt
import logging
import uuid
import bcrypt

from config.database import Database
from config.settings import settings
from services.subscription_service import subscription_service
from models.subscription_models import *


class CheckoutRequest(BaseModel):
    """Request model for checkout endpoint."""
    plan_id: str = "pro"


api_router = APIRouter(prefix="/api/subscriptions")
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Verify user token and return user info with subscription."""
    token = credentials.credentials
    
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        store_id = user.get("store_id")
        if store_id:
            store = await db.stores.find_one({"id": store_id}, {"_id": 0})
            if store:
                user["store"] = store
                
                subscription = await subscription_service.get_subscription(store_id)
                user["subscription"] = subscription
                
                if store.get("is_suspended", False):
                    raise HTTPException(
                        status_code=403,
                        detail="Store is suspended"
                    )
        
        return user
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token format")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@api_router.get("/plans", response_model=List[Dict])
async def get_plans():
    """Lấy danh sách các gói subscription.
    
    Returns:
        List of available subscription plans with features and pricing.
    """
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        plans = await subscription_service.get_all_plans()
        
        for plan in plans:
            plan.pop("_id", None)
        
        return plans
    except Exception as e:
        logging.error(f"Error getting plans: {e}")
        raise HTTPException(status_code=500, detail="Failed to get subscription plans")


@api_router.get("/current")
async def get_current_subscription(current_user: dict = Depends(get_current_user)):
    """Lấy subscription hiện tại của store.
    
    Returns:
        Current subscription details including plan info and feature access.
    """
    subscription = current_user.get("subscription")
    store = current_user.get("store", {})
    
    if not subscription:
        # Return default STARTER plan info
        return {
            "has_subscription": False,
            "plan_id": "starter",
            "plan_name": "Gói STARTER",
            "status": "active",
            "features": {
                "qr_menu": True,
                "basic_reports": True,
                "online_payment": True,
                "ai_chatbot": False,
                "ai_reports": False,
                "unlimited_tables": False
            },
            "max_tables": 10,
            "table_usage": {
                "current": 0,
                "limit": 10,
                "remaining": 10
            }
        }
    
    plan = await subscription_service.get_plan(subscription.get("plan_id", "starter"))
    
    # Get table count
    db = Database.get_db()
    table_count = await db.tables.count_documents({
        "store_id": store.get("id")
    })
    
    max_tables = subscription.get("max_tables", 10)
    
    return {
        "has_subscription": True,
        "subscription_id": subscription.get("subscription_id"),
        "plan_id": subscription.get("plan_id"),
        "plan_name": plan.get("name", "Unknown") if plan else "Unknown",
        "status": subscription.get("status"),
        "trial_ends_at": subscription.get("trial_ends_at"),
        "current_period_end": subscription.get("current_period_end"),
        "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
        "features": plan.get("features", {}) if plan else {},
        "max_tables": max_tables,
        "table_usage": {
            "current": table_count,
            "limit": max_tables,
            "remaining": max(0, (max_tables or 999) - table_count) if max_tables else None
        }
    }


@api_router.post("/activate-trial")
async def activate_trial(current_user: dict = Depends(get_current_user)):
    """Kích hoạt trial 14 ngày cho store.
    
    Returns:
        Trial activation result with subscription details.
    """
    store_id = current_user.get("store_id")
    if not store_id:
        raise HTTPException(status_code=400, detail="No store associated")
    
    admin_email = current_user.get("email")
    store = current_user.get("store", {})
    
    try:
        result = await subscription_service.activate_trial(store_id, admin_email)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to activate trial")
            )
        
        return {
            "success": True,
            "message": "14-day PRO trial activated successfully!",
            "trial_ends_at": result["subscription"]["trial_ends_at"],
            "features": ["AI Chatbot", "AI Reports", "Unlimited Tables"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Activate trial error: {e}")
        raise HTTPException(status_code=500, detail="Failed to activate trial")


@api_router.post("/create-checkout-for-registration")
async def create_checkout_for_registration(
    request_data: dict = Body(...)
):
    """Tạo PayOS checkout link cho PRO subscription đăng ký mới (không cần đăng nhập).
    
    Args:
        request_data: Checkout request body with:
            - plan_id: "pro"
            - store_name: Store name
            - store_slug: Store slug
            - buyer_email: Admin email
            - buyer_name: Admin name
            - password: Plain password (will be hashed)
    
    Returns:
        PayOS payment link for checkout with pending_registration_id.
    """
    import uuid
    from datetime import datetime, timezone, timedelta
    from services.payos_service import payos_service
    from config.settings import settings
    from config.database import Database
    import bcrypt
    
    plan_id = request_data.get("plan_id", "pro")
    store_name = request_data.get("store_name")
    store_slug = request_data.get("store_slug")
    buyer_email = request_data.get("buyer_email")
    buyer_name = request_data.get("buyer_name")
    password = request_data.get("password")
    
    # Validate required fields
    if not all([store_name, store_slug, buyer_email, buyer_name, password]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    if plan_id != "pro":
        raise HTTPException(status_code=400, detail="Only PRO plan requires payment")
    
    # Validate slug format
    import re
    if not re.match(r'^[a-z0-9-]{3,50}$', store_slug):
        raise HTTPException(status_code=400, detail="Slug must be 3-50 characters with lowercase letters, numbers, and hyphens")
    
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        # Check if email and slug are already taken
        existing_user = await db.users.find_one({"email": buyer_email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        existing_store = await db.stores.find_one({"slug": store_slug})
        if existing_store:
            raise HTTPException(status_code=400, detail="Store slug already taken")
        
        # Get PRO plan
        plan = await subscription_service.get_plan("pro")
        if not plan:
            raise HTTPException(status_code=400, detail="PRO plan not available")
        
        # Generate IDs
        pending_id = f"pending_{uuid.uuid4().hex[:12]}"
        order_code = payos_service._generate_order_code(f"reg_{store_slug}")
        payment_id = f"pay_{uuid.uuid4().hex[:12]}"
        
        # Create pending registration document
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=1)
        
        pending_reg_doc = {
            "pending_id": pending_id,
            "email": buyer_email,
            "password_hash": bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            "name": buyer_name,
            "store_name": store_name,
            "store_slug": store_slug,
            "plan_id": "pro",
            "payment_id": payment_id,
            "payos_order_code": order_code,
            "status": "pending_payment",
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat()
        }
        await db.pending_registrations.insert_one(pending_reg_doc)
        
        # Create subscription payment record
        payment_doc = {
            "payment_id": payment_id,
            "pending_registration_id": pending_id,
            "store_id": None,  # Will be set after registration completes
            "amount": plan["price_vat"],
            "amount_vat": plan["price_vat"],
            "amount_without_vat": plan["price"],
            "payment_method": "payos",
            "status": "pending",
            "payos_order_id": order_code,
            "metadata": {
                "type": "new_registration",
                "store_name": store_name,
                "store_slug": store_slug
            },
            "created_at": now.isoformat()
        }
        await db.subscription_payments.insert_one(payment_doc)
        
        # Create PayOS payment link
        result = await payos_service.create_payment_link(
            order_code=order_code,
            amount=plan["price_vat"],
            description=f"Đăng ký gói PRO - {store_name}",
            buyer_name=buyer_name,
            buyer_email=buyer_email,
            buyer_phone="",
            return_url=f"{settings.FRONTEND_URL}/admin/register?payment=success&pending_id={pending_id}",
            cancel_url=f"{settings.FRONTEND_URL}/admin/register?payment=cancelled",
            items=[
                {
                    "name": plan["name"],
                    "quantity": 1,
                    "price": plan["price"]
                },
                {
                    "name": f"VAT (10%)",
                    "quantity": 1,
                    "price": plan["price_vat"] - plan["price"]
                }
            ]
        )
        
        if result.get("success"):
            checkout_url = result.get("checkout_url")
        else:
            # Use mock URL if in mock mode
            if settings.MOCK_PAYOS_ENABLED:
                checkout_url = f"{settings.MOCK_CHECKOUT_URL}&pending_id={pending_id}"
            else:
                raise HTTPException(status_code=500, detail="Failed to create payment link")
        
        logging.info(f"Created checkout for registration - pending_id: {pending_id}, order_code: {order_code}")
        
        return {
            "success": True,
            "pending_id": pending_id,
            "payment_id": payment_id,
            "checkout_url": checkout_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Create checkout for registration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create checkout: {str(e)}")


@api_router.post("/create-checkout")
async def create_checkout(
    request_data: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Tạo PayOS checkout link cho PRO subscription (yêu cầu đăng nhập).
    
    Args:
        request_data: Checkout request body with plan_id
    
    Returns:
        PayOS payment link for checkout.
    """
    plan_id = request_data.get("plan_id", "pro")
    
    logging.info(f"Checkout request - plan_id: {plan_id}, user: {current_user.get('email')}")
    
    if plan_id != "pro":
        raise HTTPException(status_code=400, detail=f"Only PRO plan requires payment, got: {plan_id}")
    
    store_id = current_user.get("store_id")
    if not store_id:
        raise HTTPException(status_code=400, detail=f"No store associated. User: {current_user.get('email')}, User ID: {current_user.get('id')}")
    
    store = current_user.get("store", {})
    subscription = current_user.get("subscription")
    from_plan = subscription.get("plan_id", "starter") if subscription else "starter"
    
    logging.info(f"Checkout - store_id: {store_id}, from_plan: {from_plan}")
    
    try:
        result = await subscription_service.upgrade_subscription(
            store_id=store_id,
            from_plan=from_plan,
            to_plan="pro"
        )
        
        if not result.get("success"):
            error_msg = result.get("error", "Failed to create checkout")
            logging.error(f"Checkout failed: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        return {
            "success": True,
            "payment_id": result.get("payment_id"),
            "checkout_url": result.get("checkout_url"),
            "amount": 218900,
            "description": "Nâng cấp lên gói PRO - 1 tháng"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Create checkout error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create checkout: {str(e)}")


@api_router.post("/cancel")
async def cancel_subscription(
    immediate: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Hủy subscription.
    
    Args:
        immediate: If True, cancel immediately. If False, cancel at period end.
    
    Returns:
        Cancellation result.
    """
    store_id = current_user.get("store_id")
    if not store_id:
        raise HTTPException(status_code=400, detail="No store associated")
    
    try:
        result = await subscription_service.cancel_subscription(
            store_id=store_id,
            cancel_at_period_end=not immediate
        )
        
        return result
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.error(f"Cancel subscription error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")


@api_router.get("/invoices")
async def get_invoices(
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Lấy lịch sử thanh toán.
    
    Args:
        page: Page number
        limit: Items per page
    
    Returns:
        List of payment invoices.
    """
    store_id = current_user.get("store_id")
    if not store_id:
        raise HTTPException(status_code=400, detail="No store associated")
    
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        skip = (page - 1) * limit
        
        payments = await db.subscription_payments.find(
            {"store_id": store_id}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await db.subscription_payments.count_documents({"store_id": store_id})
        
        for payment in payments:
            payment.pop("_id", None)
        
        return {
            "invoices": payments,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
        
    except Exception as e:
        logging.error(f"Get invoices error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get invoices")
