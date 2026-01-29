"""Subscription Middleware for Minitake F&B system.

Provides feature gating and subscription checks for API endpoints.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Callable
import logging

from config.database import Database
from config.settings import settings
from services.subscription_service import subscription_service

security = HTTPBearer()

# Feature flags mapping
FEATURE_REQUIREMENTS = {
    "ai_chatbot": "ai_chatbot",
    "ai_reports": "ai_reports",
    "unlimited_tables": "unlimited_tables",
    "priority_support": "priority_support",
    "basic_reports": "basic_reports",
    "qr_menu": "qr_menu",
    "online_payment": "online_payment",
}


class SubscriptionChecker:
    """Dependency class for checking subscription features."""

    def __init__(self, required_feature: Optional[str] = None):
        """Initialize with optional required feature.
        
        Args:
            required_feature: Feature name that must be available
        """
        self.required_feature = required_feature

    async def __call__(
        self,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ) -> dict:
        """Check subscription and return user info.
        
        Args:
            credentials: HTTP Bearer token
            
        Returns:
            User info dict with subscription details
            
        Raises:
            HTTPException: If subscription is invalid or feature not available
        """
        from fastapi import Request
        from config.settings import settings
        import jwt
        from datetime import datetime, timezone
        
        token = credentials.credentials
        
        try:
            # Decode JWT
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            # Check if this is a super admin token
            token_type = payload.get("type")
            if token_type == "super_admin":
                # Super admin bypasses subscription checks
                return {
                    "id": payload.get("sub"),
                    "role": "super_admin",
                    "store_id": "",
                    "is_super_admin": True
                }
            
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid authentication"
                )
            
            # Get database and init service
            db = Database.get_db()
            await subscription_service.init_db(db)
            
            # Get user and store info
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            if not user:
                raise HTTPException(
                    status_code=401,
                    detail="User not found"
                )
            
            store_id = user.get("store_id")
            if not store_id:
                raise HTTPException(
                    status_code=400,
                    detail="User has no associated store"
                )
            
            # Get store
            store = await db.stores.find_one({"id": store_id}, {"_id": 0})
            if not store:
                raise HTTPException(
                    status_code=404,
                    detail="Store not found"
                )
            
            # Check if store is suspended
            if store.get("is_suspended", False):
                raise HTTPException(
                    status_code=403,
                    detail="Store is suspended. Please contact support."
                )
            
            # Get subscription
            subscription = await subscription_service.get_subscription(store_id)
            
            # Add subscription info to user
            user["subscription"] = subscription
            user["store"] = store
            
            # Check required feature
            if self.required_feature:
                has_feature = await subscription_service.check_feature_access(
                    store_id,
                    self.required_feature
                )
                
                if not has_feature:
                    plan_id = subscription.get("plan_id", "starter") if subscription else "starter"
                    raise HTTPException(
                        status_code=403,
                        detail=f"Feature '{self.required_feature}' requires {self.required_feature.upper()} plan. Please upgrade your subscription."
                    )
            
            return user
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=401,
                detail="Token expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )


def require_feature(feature_name: str) -> SubscriptionChecker:
    """Create a dependency that requires a specific feature.
    
    Args:
        feature_name: Name of the required feature
        
    Returns:
        SubscriptionChecker dependency
    """
    return SubscriptionChecker(required_feature=feature_name)


# Pre-configured dependencies for common features
require_ai_chatbot = SubscriptionChecker(required_feature="ai_chatbot")
require_ai_reports = SubscriptionChecker(required_feature="ai_reports")
require_unlimited_tables = SubscriptionChecker(required_feature="unlimited_tables")


class TableLimitChecker:
    """Dependency class for checking table limits."""

    async def __call__(
        self,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ) -> dict:
        """Check if store can add more tables.
        
        Args:
            credentials: HTTP Bearer token
            
        Returns:
            User info with table limit status
            
        Raises:
            HTTPException: If table limit reached
        """
        from config.settings import settings
        import jwt
        
        token = credentials.credentials
        
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            user_id = payload.get("sub")
            store_id = payload.get("store_id")
            
            if not user_id or not store_id:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid token"
                )
            
            db = Database.get_db()
            await subscription_service.init_db(db)
            
            # Check table limit
            limit_status = await subscription_service.check_table_limit(store_id)
            
            if not limit_status.get("allowed"):
                current = limit_status.get("current", 0)
                max_tables = limit_status.get("limit", 10)
                raise HTTPException(
                    status_code=403,
                    detail=f"Table limit reached. You have {current}/{max_tables} tables. Please upgrade to PRO for unlimited tables."
                )
            
            return {
                "store_id": store_id,
                "table_limit": limit_status
            }
            
        except jwt.JWTError:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )


# Dependency for checking table limits
check_table_limit = TableLimitChecker()


async def check_subscription_for_table_creation(
    store_id: str,
    db
) -> dict:
    """Check if store can create more tables (async helper).
    
    Args:
        store_id: Store ID
        db: Database instance
        
    Returns:
        Dict with limit status
        
    Raises:
        HTTPException: If limit reached
    """
    await subscription_service.init_db(db)
    
    limit_status = await subscription_service.check_table_limit(store_id)
    
    if not limit_status.get("allowed"):
        current = limit_status.get("current", 0)
        max_tables = limit_status.get("limit", 10)
        raise HTTPException(
            status_code=403,
            detail=f"Table limit reached ({current}/{max_tables}). Please upgrade to PRO for unlimited tables."
        )
    
    return limit_status
