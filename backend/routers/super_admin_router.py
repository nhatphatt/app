"""Super Admin Router for Minitake F&B system.

Handles all Super Admin API endpoints for platform management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
import jwt
import bcrypt
import logging

from config.database import Database
from config.settings import settings
from services.subscription_service import subscription_service
from models.subscription_models import *

api_router = APIRouter(prefix="/api/super-admin")
security = HTTPBearer()


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == "_id":
                continue  # Skip _id field
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, list):
                result[key] = serialize_doc(value)
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            else:
                result[key] = value
        return result
    return doc


def verify_super_admin_password(plain_password: str, hashed_password: str) -> bool:
    """Verify Super Admin password."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def create_super_admin_token(super_admin_id: str) -> str:
    """Create JWT token for Super Admin."""
    expire = datetime.now(timezone.utc) + \
        (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    payload = {
        "sub": super_admin_id,
        "type": "super_admin",
        "exp": expire
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def get_current_super_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Verify Super Admin token and return super admin info."""
    token = credentials.credentials
    
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        if payload.get("type") != "super_admin":
            raise HTTPException(
                status_code=401,
                detail="Invalid token type"
            )
        
        super_admin_id = payload.get("sub")
        if not super_admin_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication"
            )
        
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        super_admin = await db.super_admins.find_one(
            {"super_admin_id": super_admin_id},
            {"_id": 0, "password_hash": 0}
        )
        
        if not super_admin:
            raise HTTPException(
                status_code=401,
                detail="Super Admin not found"
            )
        
        if not super_admin.get("is_active", True):
            raise HTTPException(
                status_code=401,
                detail="Account is deactivated"
            )
        
        return super_admin
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token format")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@api_router.post("/login", response_model=TokenResponse)
async def super_admin_login(input: SuperAdminLogin):
    """Đăng nhập Super Admin.
    
    Args:
        input: Login credentials (email, password)
    
    Returns:
        JWT token and super admin info.
    """
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        # Find super admin by email
        super_admin = await db.super_admins.find_one(
            {"email": input.email}
        )
        
        if not super_admin:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        # Store password hash before removing it
        password_hash = super_admin.get("password_hash", "")
        
        # Remove _id and password_hash from super_admin for response
        super_admin.pop("_id", None)
        super_admin.pop("password_hash", None)
        
        # Verify password
        if not verify_super_admin_password(
            input.password,
            password_hash
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        # Check if active
        if not super_admin.get("is_active", True):
            raise HTTPException(
                status_code=401,
                detail="Account is deactivated"
            )
        
        # Update last login
        await db.super_admins.update_one(
            {"super_admin_id": super_admin["super_admin_id"]},
            {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Create token
        token = create_super_admin_token(super_admin["super_admin_id"])
        
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=SuperAdminResponse(**super_admin)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Super admin login error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Login failed"
        )


@api_router.get("/dashboard")
async def get_dashboard(current_super_admin: dict = Depends(get_current_super_admin)):
    """Lấy dashboard statistics cho Super Admin.
    
    Returns:
        Dashboard statistics including store count, revenue, etc.
    """
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        stats = await subscription_service.get_dashboard_stats()
        return stats
        
    except Exception as e:
        logging.error(f"Dashboard error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get dashboard data"
        )


@api_router.get("/stores")
async def get_stores(
    page: int = 1,
    limit: int = 20,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """Lấy danh sách tất cả stores.
    
    Args:
        page: Page number (1-indexed)
        limit: Items per page
    
    Returns:
        Paginated list of stores with subscription info.
    """
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        result = await subscription_service.get_all_stores(page, limit)
        
        # Serialize all documents properly
        result["stores"] = serialize_doc(result.get("stores", []))
        
        return result
        
    except Exception as e:
        logging.error(f"Get stores error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get stores"
        )


@api_router.get("/stores/{store_id}")
async def get_store_detail(
    store_id: str,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """Lấy chi tiết một store.
    
    Args:
        store_id: Store ID
    
    Returns:
        Store details with subscription info.
    """
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        store = await db.stores.find_one({"id": store_id}, {"_id": 0})
        
        if not store:
            raise HTTPException(
                status_code=404,
                detail="Store not found"
            )
        
        # Get subscription
        subscription = await subscription_service.get_subscription(store_id)
        store["subscription"] = subscription
        
        return store
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get store detail error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get store details"
        )


@api_router.put("/stores/{store_id}/suspend")
async def suspend_store(
    store_id: str,
    reason: Optional[str] = None,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """Suspend một store.
    
    Args:
        store_id: Store ID
        reason: Lý do suspend
    
    Returns:
        Suspension result.
    """
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        result = await subscription_service.suspend_store(store_id, reason)
        return result
        
    except Exception as e:
        logging.error(f"Suspend store error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to suspend store"
        )


@api_router.put("/stores/{store_id}/activate")
async def activate_store(
    store_id: str,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """Activate một store đã bị suspend.
    
    Args:
        store_id: Store ID
    
    Returns:
        Activation result.
    """
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        result = await subscription_service.activate_store(store_id)
        return result
        
    except Exception as e:
        logging.error(f"Activate store error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to activate store"
        )


@api_router.get("/subscriptions")
async def get_subscriptions(
    page: int = 1,
    limit: int = 20,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """Lấy danh sách subscriptions.
    
    Args:
        page: Page number
        limit: Items per page
    
    Returns:
        Paginated list of subscriptions.
    """
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        result = await subscription_service.get_all_subscriptions(page, limit)
        return result
        
    except Exception as e:
        logging.error(f"Get subscriptions error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get subscriptions"
        )


@api_router.get("/payments")
async def get_payments(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """Lấy danh sách payments.
    
    Args:
        page: Page number
        limit: Items per page
        status: Filter by payment status
    
    Returns:
        Paginated list of payments.
    """
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        result = await subscription_service.get_all_payments(page, limit, status)
        
        # Serialize all documents properly
        result["payments"] = serialize_doc(result.get("payments", []))
        
        return result
        
    except Exception as e:
        logging.error(f"Get payments error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get payments"
        )


@api_router.get("/revenue")
async def get_revenue(
    period: str = "month",
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """Lấy revenue analytics.
    
    Args:
        period: "month" or "year"
    
    Returns:
        Revenue data by period.
    """
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        data = await subscription_service.get_revenue_analytics(period)
        return {
            "period": period,
            "data": data
        }
        
    except Exception as e:
        logging.error(f"Get revenue error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get revenue data"
        )


# ============ USER MANAGEMENT ============

@api_router.get("/users")
async def get_users(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """Lấy danh sách tất cả users.
    
    Args:
        page: Page number (1-indexed)
        limit: Items per page
        search: Search by email or name
        role: Filter by role
        status: Filter by status
    
    Returns:
        Paginated list of users.
    """
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        skip = (page - 1) * limit
        
        # Build query
        query = {}
        if search:
            query["$or"] = [
                {"email": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}}
            ]
        if role:
            query["role"] = role
        if status:
            query["status"] = status
        
        # Exclude super admins from regular user list
        if "role" not in query:
            query["role"] = {"$ne": "super_admin"}
        
        # Get total count
        total = await db.users.count_documents(query)
        
        # Get users
        users = await db.users.find(
            query,
            {"_id": 0, "password_hash": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        # Get store names for each user
        for user in users:
            if user.get("store_id"):
                store = await db.stores.find_one({"id": user["store_id"]}, {"_id": 0, "name": 1})
                user["store_name"] = store["name"] if store else None
        
        return {
            "users": serialize_doc(users),
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
        
    except Exception as e:
        logging.error(f"Get users error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get users"
        )


@api_router.get("/users/{user_id}")
async def get_user_detail(
    user_id: str,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """Lấy thông tin chi tiết của một user.
    
    Args:
        user_id: User ID
    
    Returns:
        User details with store info.
    """
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        user = await db.users.find_one(
            {"id": user_id},
            {"_id": 0, "password_hash": 0}
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get store info if exists
        if user.get("store_id"):
            store = await db.stores.find_one({"id": user["store_id"]}, {"_id": 0})
            user["store"] = serialize_doc(store)
        
        return serialize_doc(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get user detail error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get user details"
        )


@api_router.put("/users/{user_id}/status")
async def toggle_user_status(
    user_id: str,
    input: dict,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """Thay đổi trạng thái của user.
    
    Args:
        user_id: User ID
        input: {"status": "active" | "inactive"}
    
    Returns:
        Updated user.
    """
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        # Check if user exists
        existing = await db.users.find_one({"id": user_id})
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent changing super admin status
        if existing.get("role") == "super_admin":
            raise HTTPException(status_code=403, detail="Cannot change super admin status")
        
        new_status = input.get("status")
        if new_status not in ["active", "inactive"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"message": "User status updated successfully", "status": new_status}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Toggle user status error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update user status"
        )


@api_router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """Xóa một user.
    
    Args:
        user_id: User ID
    
    Returns:
        Success message.
    """
    try:
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        # Check if user exists
        existing = await db.users.find_one({"id": user_id})
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent deleting super admin
        if existing.get("role") == "super_admin":
            raise HTTPException(status_code=403, detail="Cannot delete super admin")
        
        # Delete user
        await db.users.delete_one({"id": user_id})
        
        return {"message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Delete user error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete user"
        )
