"""Subscription models for Minitake F&B system."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class PlanType(str, Enum):
    STARTER = "starter"
    PRO = "pro"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    TRIAL = "trial"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    SUSPENDED = "suspended"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class SubscriptionPlan(BaseModel):
    """Subscription plan configuration"""
    plan_id: str
    name: str
    description: str
    price: int  # Price without VAT
    price_vat: int  # Price with VAT
    max_tables: Optional[int] = None  # None = unlimited
    features: Dict[str, bool]
    is_active: bool = True
    created_at: str


class SubscriptionPlanCreate(BaseModel):
    """Create subscription plan request"""
    plan_id: str
    name: str
    description: str
    price: int
    max_tables: Optional[int] = None
    features: Dict[str, bool]


class Subscription(BaseModel):
    """Store subscription"""
    subscription_id: str
    store_id: str
    plan_id: str
    status: str
    trial_ends_at: Optional[str] = None
    current_period_start: str
    current_period_end: str
    cancel_at_period_end: bool = False
    max_tables: Optional[int] = None
    created_at: str
    updated_at: str


class SubscriptionCreate(BaseModel):
    """Create subscription request"""
    store_id: str
    plan_id: str
    is_trial: bool = False


class SubscriptionUpdate(BaseModel):
    """Update subscription request"""
    plan_id: Optional[str] = None
    status: Optional[str] = None
    cancel_at_period_end: Optional[bool] = None
    max_tables: Optional[int] = None


class SubscriptionPayment(BaseModel):
    """Subscription payment transaction"""
    payment_id: str
    subscription_id: str
    store_id: str
    amount: int
    amount_vat: int
    amount_without_vat: int
    payment_method: str
    status: str
    payos_order_id: Optional[str] = None
    payos_payment_link: Optional[str] = None
    payos_transaction_id: Optional[str] = None
    paid_at: Optional[str] = None
    created_at: str
    metadata: Optional[Dict[str, Any]] = None


class SubscriptionPaymentCreate(BaseModel):
    """Create payment request"""
    subscription_id: str
    store_id: str
    amount: int
    amount_vat: int
    amount_without_vat: int
    payment_method: str = "payos"


class PayOSPaymentRequest(BaseModel):
    """PayOS payment link creation request"""
    order_code: str
    amount: int
    description: str
    buyer_name: str
    buyer_email: str
    buyer_phone: str
    items: List[Dict[str, Any]]
    return_url: str
    cancel_url: str


class PayOSPaymentResponse(BaseModel):
    """PayOS payment link response"""
    code: str
    data: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class SuperAdmin(BaseModel):
    """Super admin account"""
    super_admin_id: str
    email: str
    name: str
    role: str = "super_admin"
    is_active: bool = True
    created_at: str
    last_login_at: Optional[str] = None


class SuperAdminLogin(BaseModel):
    """Super admin login request"""
    email: str
    password: str


class SuperAdminCreate(BaseModel):
    """Create super admin request"""
    email: str
    password: str
    name: str


class SuperAdminResponse(BaseModel):
    """Super admin response (without password)"""
    super_admin_id: str
    email: str
    name: str
    role: str
    is_active: bool
    created_at: str
    last_login_at: Optional[str] = None


class TokenResponse(BaseModel):
    """Token response for super admin login"""
    access_token: str
    token_type: str = "bearer"
    user: SuperAdminResponse


class SuperAdminDashboardStats(BaseModel):
    """Dashboard statistics for super admin"""
    total_stores: int
    active_subscriptions: int
    trial_subscriptions: int
    starter_subscriptions: int
    pro_subscriptions: int
    total_revenue_month: int
    total_revenue_year: int
    pending_payments: int
    recent_payments: List[Dict[str, Any]]


class SubscriptionWithStore(BaseModel):
    """Subscription with store details"""
    subscription: Subscription
    store: Dict[str, Any]
    plan: Optional[SubscriptionPlan] = None


class CheckoutRequest(BaseModel):
    """Checkout request model"""
    plan_id: str = "pro"

