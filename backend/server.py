"""Main FastAPI application server."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid
import bcrypt
import jwt
import re
import hmac
import hashlib

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config.settings import settings
from config.database import Database

# Initialize database
db_instance = Database()

# Compatibility: Keep db reference for existing code
db = None  # Will be set in startup event

# Subscription & Super Admin Routers (imported early for CORS)
from routers.subscription_router import api_router as subscription_router
from routers.super_admin_router import api_router as super_admin_router
from routers.webhook_router import api_router as webhook_router

# JWT Settings (from config)
SECRET_KEY = settings.JWT_SECRET
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
FRONTEND_URL = settings.FRONTEND_URL

# Create the main app with metadata
tags_metadata = [
    {
        "name": "Authentication",
        "description": "Đăng ký, đăng nhập và xác thực người dùng",
    },
    {
        "name": "Stores",
        "description": "Quản lý thông tin cửa hàng",
    },
    {
        "name": "Public Menu",
        "description": "API công khai cho khách hàng xem menu và đặt món",
    },
    {
        "name": "Categories",
        "description": "Quản lý danh mục món ăn",
    },
    {
        "name": "Menu Items",
        "description": "Quản lý món ăn trong menu",
    },
    {
        "name": "Orders",
        "description": "Quản lý đơn hàng",
    },
    {
        "name": "Analytics",
        "description": "Thống kê và báo cáo doanh thu",
    },
    {
        "name": "Tables",
        "description": "Quản lý bàn và QR code",
    },
    {
        "name": "Payments",
        "description": "Xử lý thanh toán và quản lý phương thức thanh toán",
    },
    {
        "name": "Promotions",
        "description": "Quản lý chương trình khuyến mãi và giảm giá",
    },
    {
        "name": "AI Recommendations",
        "description": "Hệ thống AI gợi ý món ăn thông minh dựa trên hành vi khách hàng",
    },
    {
        "name": "AI Chatbot",
        "description": "Chatbot AI thông minh cho tư vấn và đặt món tự động",
    },
    {
        "name": "Inventory Management",
        "description": "Quản lý số lượng món ăn trong kho và tồn kho",
    },
    {
        "name": "Staff Management",
        "description": "Quản lý nhân viên, ca làm việc và chấm công",
    },
    {
        "name": "Subscriptions",
        "description": "Quản lý subscription và thanh toán gói dịch vụ",
    },
    {
        "name": "Super Admin",
        "description": "Quản lý toàn bộ hệ thống cho Super Admin",
    },
    {
        "name": "Webhooks",
        "description": "Nhận webhook từ các dịch vụ bên thứ 3 (PayOS)",
    },
]

app = FastAPI(
    title="Minitake F&B API",
    description="API quản lý nhà hàng và menu số - Hỗ trợ đặt món, thanh toán và quản lý cửa hàng",
    version="1.0.0",
    openapi_tags=tags_metadata
)

# Rate Limiter Setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============ MODELS ============

class StoreCreate(BaseModel):
    name: str
    slug: str
    address: Optional[str] = ""
    phone: Optional[str] = ""

class Store(BaseModel):
    id: str
    name: str
    slug: str
    logo: Optional[str] = ""
    address: Optional[str] = ""
    phone: Optional[str] = ""
    plan_id: Optional[str] = "starter"
    created_at: str

class StoreUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    logo: Optional[str] = None

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    store_name: str
    store_slug: str
    
    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password strength for security."""
        if len(v) < 8:
            raise ValueError('Mật khẩu phải có ít nhất 8 ký tự')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Mật khẩu phải chứa ít nhất 1 chữ hoa')
        if not re.search(r'[a-z]', v):
            raise ValueError('Mật khẩu phải chứa ít nhất 1 chữ thường')
        if not re.search(r'[0-9]', v):
            raise ValueError('Mật khẩu phải chứa ít nhất 1 số')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*...)')
        return v
    
    @field_validator('store_slug')
    @classmethod
    def validate_slug(cls, v: str) -> str:
        """Validate store slug format."""
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError('Slug chỉ được chứa chữ thường, số và dấu gạch ngang')
        if len(v) < 3:
            raise ValueError('Slug phải có ít nhất 3 ký tự')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegisterWithPlan(BaseModel):
    email: EmailStr
    password: str
    name: str
    store_name: str
    store_slug: str
    plan_id: str = "starter"

class CheckAvailability(BaseModel):
    email: Optional[str] = None
    store_slug: Optional[str] = None

class User(BaseModel):
    id: str
    email: str
    name: str
    role: str
    store_id: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

class CategoryCreate(BaseModel):
    name: str
    display_order: Optional[int] = 0

class Category(BaseModel):
    id: str
    name: str
    store_id: str
    display_order: int
    created_at: str

class MenuItemCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    price: float
    category_id: str
    image_url: Optional[str] = ""
    is_available: Optional[bool] = True

class CategoryBulkCreate(BaseModel):
    name: str
    display_order: Optional[int] = 0

class MenuItemBulkCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    price: float
    category_name: str  # Use category name instead of ID for easier JSON creation
    image_url: Optional[str] = ""
    is_available: Optional[bool] = True

class BulkMenuImport(BaseModel):
    categories: Optional[List[CategoryBulkCreate]] = []
    items: List[MenuItemBulkCreate]

class MenuItem(BaseModel):
    id: str
    name: str
    description: str
    price: float
    category_id: str
    store_id: str
    image_url: str
    is_available: bool
    created_at: str
    original_price: Optional[float] = None  # Original price if promotion exists
    discounted_price: Optional[float] = None  # Price after discount
    has_promotion: Optional[bool] = False
    promotion_label: Optional[str] = None  # e.g., "Giảm 20%"

class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int

class OrderCreate(BaseModel):
    table_number: Optional[str] = ""
    customer_name: Optional[str] = ""
    customer_phone: Optional[str] = ""
    items: List[OrderItem]
    note: Optional[str] = ""

class Order(BaseModel):
    id: str
    store_id: str
    table_number: str
    customer_name: str
    customer_phone: str
    items: List[OrderItem]
    total: float
    status: str  # pending, preparing, ready, completed, cancelled
    payment_status: str  # pending, paid
    note: str
    created_at: str

class OrderStatusUpdate(BaseModel):
    status: str

class PublicMenu(BaseModel):
    store: Store
    categories: List[Category]
    menu_items: List[MenuItem]

class DashboardStats(BaseModel):
    today_revenue: float
    today_orders: int
    month_revenue: float
    month_orders: int
    pending_orders: int
    total_menu_items: int
    avg_order_value: float
    total_customers: int
    new_customers_month: int
    total_tables: int
    occupied_tables: int
    unpaid_orders: int
    active_promotions: int
    unavailable_items: int

class TableCreate(BaseModel):
    table_number: str
    capacity: Optional[int] = 4

class Table(BaseModel):
    id: str
    store_id: str
    table_number: str
    capacity: int
    qr_code_url: str
    status: str  # available, occupied, reserved
    created_at: str

class TableUpdate(BaseModel):
    table_number: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[str] = None

# ============ AUTH & SECURITY HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    """
    Verify webhook signature using HMAC-SHA256.
    
    Args:
        payload: Raw webhook payload string
        signature: Signature from webhook header
        secret: Webhook secret key
        
    Returns:
        True if signature is valid, False otherwise
    """
    if not secret:
        # If no secret configured, skip verification in development
        # This should never happen in production due to settings validation
        return settings.ENVIRONMENT != 'production'
    
    computed_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(computed_signature, signature)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Use global db - it's initialized in startup event
    if db is None:
        raise HTTPException(status_code=503, detail="Server initializing")
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")

        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception as e:
        if "signature" in str(e).lower() or "expired" in str(e).lower():
            raise HTTPException(status_code=401, detail="Token expired")
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse, tags=["Authentication"])
@limiter.limit("3/hour")  # Max 3 registrations per hour per IP
async def register(request: Request, input: UserRegister, plan_id: str = "starter"):
    """Register new user and store with optional subscription plan."""
    # Check if email exists
    existing_user = await db.users.find_one({"email": input.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if slug exists
    existing_store = await db.stores.find_one({"slug": input.store_slug})
    if existing_store:
        raise HTTPException(status_code=400, detail="Store slug already taken")

    # Create store
    store_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Get PRO plan if upgrading
    plan = None
    if plan_id == "pro":
        plan = await db.subscription_plans.find_one({"plan_id": "pro"})
        if not plan:
            raise HTTPException(status_code=400, detail="PRO plan not available")

    # Create store with subscription
    store_doc = {
        "id": store_id,
        "name": input.store_name,
        "slug": input.store_slug,
        "logo": "",
        "address": "",
        "phone": "",
        "plan_id": plan_id,
        "subscription_status": "active" if plan_id == "starter" else "pending_payment",
        "max_tables": 10 if plan_id == "starter" else None,
        "is_suspended": False,
        "created_at": now.isoformat()
    }
    await db.stores.insert_one(store_doc)

    # Create subscription for PRO plan
    subscription_id = None
    if plan_id == "pro" and plan:
        subscription_id = f"sub_{uuid.uuid4().hex[:12]}"
        await db.subscriptions.insert_one({
            "subscription_id": subscription_id,
            "store_id": store_id,
            "plan_id": "pro",
            "status": "pending_payment",  # Will be activated after payment
            "trial_ends_at": None,
            "current_period_start": now.isoformat(),
            "current_period_end": (now + timedelta(days=30)).isoformat(),
            "cancel_at_period_end": False,
            "max_tables": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        })
        # Update store with subscription_id
        await db.stores.update_one(
            {"id": store_id},
            {"$set": {"subscription_id": subscription_id}}
        )

    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": input.email,
        "password_hash": hash_password(input.password),
        "name": input.name,
        "role": "admin",
        "store_id": store_id,
        "created_at": now.isoformat()
    }
    await db.users.insert_one(user_doc)

    # Create token
    token = create_access_token({"sub": user_id})

    user_response = User(
        id=user_id,
        email=input.email,
        name=input.name,
        role="admin",
        store_id=store_id
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_response
    )


@api_router.post("/auth/check-availability", tags=["Authentication"])
async def check_availability(request: Request, data: dict):
    """Check if email and store slug are available."""
    email = data.get("email")
    store_slug = data.get("store_slug")

    errors = []

    if email:
        existing = await db.users.find_one({"email": email})
        if existing:
            errors.append("Email already registered")

    if store_slug:
        existing = await db.stores.find_one({"slug": store_slug})
        if existing:
            errors.append("Store slug already taken")

    if errors:
        raise HTTPException(status_code=400, detail=errors[0])

    return {"available": True}


@api_router.post("/auth/complete-registration", response_model=TokenResponse, tags=["Authentication"])
async def complete_registration(request: Request, data: dict):
    """Hoàn tất đăng ký sau khi thanh toán PayOS thành công.
    
    Args:
        data: Contains pending_id or payment_id
    
    Returns:
        Token response with user data
    """
    pending_id = data.get("pending_id")
    payment_id = data.get("payment_id")
    
    if not pending_id and not payment_id:
        raise HTTPException(status_code=400, detail="Missing pending_id or payment_id")
    
    # Find pending registration
    if pending_id:
        pending_reg = await db.pending_registrations.find_one({"pending_id": pending_id})
    else:
        payment = await db.subscription_payments.find_one({"payment_id": payment_id})
        if payment:
            pending_reg = await db.pending_registrations.find_one({
                "payment_id": payment.get("pending_registration_id")
            })
        else:
            pending_reg = None
    
    if not pending_reg:
        raise HTTPException(status_code=404, detail="Pending registration not found")
    
    # Check expiry
    expires_at = pending_reg.get("expires_at")
    if expires_at:
        from datetime import datetime, timezone
        if datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Pending registration has expired")
    
    # Check status
    if pending_reg.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Registration already completed")
    
    if pending_reg.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Registration was cancelled")
    
    # Check payment status
    payment = await db.subscription_payments.find_one({"payment_id": pending_reg.get("payment_id")})
    if not payment or payment.get("status") != "paid":
        raise HTTPException(status_code=400, detail="Payment not completed")
    
    # Create store
    store_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    store_doc = {
        "id": store_id,
        "name": pending_reg["store_name"],
        "slug": pending_reg["store_slug"],
        "logo": "",
        "address": "",
        "phone": "",
        "plan_id": "pro",
        "subscription_status": "active",
        "max_tables": None,
        "is_suspended": False,
        "created_at": now.isoformat()
    }
    await db.stores.insert_one(store_doc)
    
    # Create subscription
    subscription_id = f"sub_{uuid.uuid4().hex[:12]}"
    await db.subscriptions.insert_one({
        "subscription_id": subscription_id,
        "store_id": store_id,
        "plan_id": "pro",
        "status": "active",
        "trial_ends_at": None,
        "current_period_start": now.isoformat(),
        "current_period_end": (now + timedelta(days=30)).isoformat(),
        "cancel_at_period_end": False,
        "max_tables": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    })
    
    # Update store with subscription_id
    await db.stores.update_one(
        {"id": store_id},
        {"$set": {"subscription_id": subscription_id}}
    )
    
    # Update payment with store_id
    await db.subscription_payments.update_one(
        {"payment_id": pending_reg["payment_id"]},
        {"$set": {"store_id": store_id}}
    )
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": pending_reg["email"],
        "password_hash": pending_reg["password_hash"],
        "name": pending_reg["name"],
        "role": "admin",
        "store_id": store_id,
        "created_at": now.isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Mark pending registration as completed
    await db.pending_registrations.update_one(
        {"pending_id": pending_id},
        {"$set": {"status": "completed", "completed_at": now.isoformat()}}
    )
    
    # Create token
    token = create_access_token({"sub": user_id})
    
    user_response = User(
        id=user_id,
        email=pending_reg["email"],
        name=pending_reg["name"],
        role="admin",
        store_id=store_id
    )
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_response
    )

@api_router.post("/auth/login", response_model=TokenResponse, tags=["Authentication"])
@limiter.limit("5/minute")  # Max 5 login attempts per minute per IP
async def login(request: Request, input: UserLogin):
    """Đăng nhập cho cả User thường và Super Admin.
    
    Nếu email là Super Admin, sẽ trả về role="super_admin" để frontend redirect.
    """
    # First check if this is a super admin email
    super_admin = await db.super_admins.find_one({"email": input.email})
    
    if super_admin:
        # Verify super admin password
        password_hash = super_admin.get("password_hash", "")
        if not verify_password(input.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Check if active
        if not super_admin.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account is deactivated")
        
        # Create super admin token
        from datetime import timedelta
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": super_admin["super_admin_id"],
            "type": "super_admin",
            "exp": expire
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        
        # Update last login
        await db.super_admins.update_one(
            {"super_admin_id": super_admin["super_admin_id"]},
            {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Return super admin response
        user_response = User(
            id=super_admin["super_admin_id"],
            email=super_admin["email"],
            name=super_admin["name"],
            role="super_admin",
            store_id=""
        )
        
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_response
        )
    
    # Check regular users
    user = await db.users.find_one({"email": input.email}, {"_id": 0})
    if not user or not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user["id"]})

    user_response = User(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        store_id=user["store_id"]
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_response
    )

# ============ STORE ROUTES ============

@api_router.get("/stores/me", response_model=Store, tags=["Stores"])
async def get_my_store(current_user: dict = Depends(get_current_user)):
    store = await db.stores.find_one({"id": current_user["store_id"]}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store

@api_router.put("/stores/me", response_model=Store, tags=["Stores"])
async def update_my_store(input: StoreUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    await db.stores.update_one(
        {"id": current_user["store_id"]},
        {"$set": update_data}
    )

    store = await db.stores.find_one({"id": current_user["store_id"]}, {"_id": 0})
    return store

# ============ HELPER FUNCTIONS ============

async def deduct_inventory_for_order(store_id: str, order_items: List[dict], order_id: str, user_id: str = "system") -> dict:
    """
    Automatically deduct inventory when order is placed.
    
    Returns:
        dict with status and warnings about low/out of stock items
    """
    warnings = []
    deductions = []
    
    for order_item in order_items:
        # Find matching inventory item by dish name
        # We match menu_item name with inventory dish_name
        item_name = order_item.get("name", "")
        quantity_ordered = order_item.get("quantity", 0)
        
        # Try to find inventory item
        inventory_item = await db.dishes_inventory.find_one({
            "store_id": store_id,
            "dish_name": item_name
        })
        
        if not inventory_item:
            # No inventory tracking for this item, skip
            continue
        
        # Check current stock
        current_stock = inventory_item["quantity_in_stock"]
        
        if current_stock < quantity_ordered:
            warnings.append({
                "dish_name": item_name,
                "warning": f"Không đủ hàng trong kho. Tồn kho: {current_stock}, Đặt hàng: {quantity_ordered}",
                "available": current_stock,
                "ordered": quantity_ordered
            })
            # Deduct what's available
            quantity_to_deduct = current_stock
        else:
            quantity_to_deduct = quantity_ordered
        
        # Deduct inventory
        new_stock = max(0, current_stock - quantity_to_deduct)
        is_low_stock = new_stock <= inventory_item["reorder_threshold"]
        
        await db.dishes_inventory.update_one(
            {"id": inventory_item["id"]},
            {
                "$set": {
                    "quantity_in_stock": new_stock,
                    "is_low_stock": is_low_stock,
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Record history
        history_doc = {
            "id": str(uuid.uuid4()),
            "inventory_id": inventory_item["id"],
            "adjustment_type": "subtract",
            "quantity_before": current_stock,
            "quantity_after": new_stock,
            "quantity_changed": -quantity_to_deduct,
            "reason": f"Bán hàng - Đơn hàng #{order_id[:8]}",
            "reference_order_id": order_id,
            "adjusted_by": user_id,
            "adjusted_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.inventory_history.insert_one(history_doc)
        
        deductions.append({
            "dish_name": item_name,
            "quantity_deducted": quantity_to_deduct,
            "new_stock": new_stock,
            "is_low_stock": is_low_stock
        })
        
        # Add low stock warning
        if is_low_stock and new_stock > 0:
            warnings.append({
                "dish_name": item_name,
                "warning": f"Tồn kho thấp: {new_stock} {inventory_item['unit']}",
                "current_stock": new_stock,
                "threshold": inventory_item["reorder_threshold"]
            })
        elif new_stock == 0:
            warnings.append({
                "dish_name": item_name,
                "warning": "Hết hàng trong kho",
                "current_stock": 0
            })
    
    return {
        "deductions": deductions,
        "warnings": warnings,
        "total_items_deducted": len(deductions)
    }

async def apply_promotions_to_menu_items(store_id: str, menu_items: List[dict]) -> List[dict]:
    """Apply active promotions to menu items and return updated items with pricing info"""
    from datetime import datetime, timezone

    # Get active promotions for this store
    now = datetime.now(timezone.utc).isoformat()
    promotions = await db.promotions.find({
        "store_id": store_id,
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }).to_list(100)

    if not promotions:
        # No active promotions
        return menu_items

    # Process each menu item
    for item in menu_items:
        best_discount = 0
        best_promotion = None

        for promotion in promotions:
            applies = False

            # Check if promotion applies to this item
            if promotion["apply_to"] == "all":
                applies = True
            elif promotion["apply_to"] == "category" and item["category_id"] in promotion.get("category_ids", []):
                applies = True
            elif promotion["apply_to"] == "items" and item["id"] in promotion.get("item_ids", []):
                applies = True

            if applies:
                # Calculate discount
                discount = 0
                if promotion["promotion_type"] == "percentage":
                    discount = item["price"] * (promotion["discount_value"] / 100)
                    # Apply max discount limit if exists
                    if promotion.get("max_discount_amount") and discount > promotion["max_discount_amount"]:
                        discount = promotion["max_discount_amount"]
                elif promotion["promotion_type"] == "fixed_amount":
                    discount = promotion["discount_value"]

                # Keep the best discount
                if discount > best_discount:
                    best_discount = discount
                    best_promotion = promotion

        # Apply the best promotion found
        if best_promotion:
            item["original_price"] = item["price"]
            item["discounted_price"] = max(0, item["price"] - best_discount)
            item["has_promotion"] = True

            # Generate label
            if best_promotion["promotion_type"] == "percentage":
                item["promotion_label"] = f"Giảm {int(best_promotion['discount_value'])}%"
            else:
                item["promotion_label"] = f"Giảm {int(best_discount):,}đ"
        else:
            item["original_price"] = None
            item["discounted_price"] = None
            item["has_promotion"] = False
            item["promotion_label"] = None

    return menu_items

# ============ PUBLIC ROUTES ============

@api_router.get("/public/{store_slug}/menu", response_model=PublicMenu, tags=["Public Menu"])
async def get_public_menu(store_slug: str):
    store = await db.stores.find_one({"slug": store_slug}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    categories = await db.categories.find(
        {"store_id": store["id"]},
        {"_id": 0}
    ).sort("display_order", 1).to_list(1000)

    menu_items = await db.menu_items.find(
        {"store_id": store["id"], "is_available": True},
        {"_id": 0}
    ).to_list(1000)

    # Apply active promotions to menu items
    menu_items = await apply_promotions_to_menu_items(store["id"], menu_items)

    return PublicMenu(
        store=Store(**store),
        categories=[Category(**cat) for cat in categories],
        menu_items=[MenuItem(**item) for item in menu_items]
    )

@api_router.post("/public/{store_slug}/orders", response_model=Order, tags=["Public Menu"])
async def create_public_order(store_slug: str, input: OrderCreate):
    store = await db.stores.find_one({"slug": store_slug}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    if not input.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")

    total = sum(item.price * item.quantity for item in input.items)

    # Auto-detect table_number if not provided (from table_id param will be sent from frontend)
    table_number = input.table_number or ""

    order_id = str(uuid.uuid4())
    order_doc = {
        "id": order_id,
        "store_id": store["id"],
        "table_number": table_number,
        "customer_name": input.customer_name,
        "customer_phone": input.customer_phone,
        "items": [item.model_dump() for item in input.items],
        "total": total,
        "status": "pending",
        "payment_status": "pending",
        "note": input.note,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order_doc)
    
    # Auto-deduct inventory for ordered items
    try:
        inventory_result = await deduct_inventory_for_order(
            store["id"],
            [item.model_dump() for item in input.items],
            order_id,
            "customer"
        )
        
        # Store inventory warnings in order metadata
        if inventory_result["warnings"]:
            await db.orders.update_one(
                {"id": order_id},
                {"$set": {"inventory_warnings": inventory_result["warnings"]}}
            )
    except Exception as e:
        # Log error but don't fail order creation
        print(f"Warning: Inventory deduction failed for order {order_id}: {str(e)}")

    return Order(**order_doc)

@api_router.get("/public/orders/{order_id}", response_model=Order, tags=["Public Menu"])
async def get_public_order(order_id: str):
    """Public endpoint for customers to check their order status"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# ============ CATEGORY ROUTES ============

@api_router.get("/categories", response_model=List[Category], tags=["Categories"])
async def get_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.categories.find(
        {"store_id": current_user["store_id"]},
        {"_id": 0}
    ).sort("display_order", 1).to_list(1000)
    return categories

@api_router.post("/categories", response_model=Category, tags=["Categories"])
async def create_category(input: CategoryCreate, current_user: dict = Depends(get_current_user)):
    category_id = str(uuid.uuid4())
    category_doc = {
        "id": category_id,
        "name": input.name,
        "store_id": current_user["store_id"],
        "display_order": input.display_order,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categories.insert_one(category_doc)
    return Category(**category_doc)

@api_router.put("/categories/{category_id}", response_model=Category, tags=["Categories"])
async def update_category(category_id: str, input: CategoryCreate, current_user: dict = Depends(get_current_user)):
    result = await db.categories.update_one(
        {"id": category_id, "store_id": current_user["store_id"]},
        {"$set": input.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")

    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return category

@api_router.delete("/categories/{category_id}", tags=["Categories"])
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.categories.delete_one({"id": category_id, "store_id": current_user["store_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# ============ MENU ITEMS ROUTES ============

@api_router.get("/menu-items", response_model=List[MenuItem], tags=["Menu Items"])
async def get_menu_items(current_user: dict = Depends(get_current_user)):
    items = await db.menu_items.find(
        {"store_id": current_user["store_id"]},
        {"_id": 0}
    ).to_list(1000)

    # Apply active promotions to menu items
    items = await apply_promotions_to_menu_items(current_user["store_id"], items)

    return items

@api_router.post("/menu-items", response_model=MenuItem, tags=["Menu Items"])
async def create_menu_item(input: MenuItemCreate, current_user: dict = Depends(get_current_user)):
    # Verify category belongs to this store
    category = await db.categories.find_one({
        "id": input.category_id,
        "store_id": current_user["store_id"]
    })
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    item_id = str(uuid.uuid4())
    item_doc = {
        "id": item_id,
        "name": input.name,
        "description": input.description,
        "price": input.price,
        "category_id": input.category_id,
        "store_id": current_user["store_id"],
        "image_url": input.image_url,
        "is_available": input.is_available,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.menu_items.insert_one(item_doc)
    return MenuItem(**item_doc)

@api_router.put("/menu-items/{item_id}", response_model=MenuItem, tags=["Menu Items"])
async def update_menu_item(item_id: str, input: MenuItemCreate, current_user: dict = Depends(get_current_user)):
    result = await db.menu_items.update_one(
        {"id": item_id, "store_id": current_user["store_id"]},
        {"$set": input.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")

    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    return item

@api_router.delete("/menu-items/{item_id}", tags=["Menu Items"])
async def delete_menu_item(item_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.menu_items.delete_one({"id": item_id, "store_id": current_user["store_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted"}

@api_router.delete("/menu-items", tags=["Menu Items"])
async def delete_all_menu_items(current_user: dict = Depends(get_current_user)):
    """Delete all menu items for the current store"""
    result = await db.menu_items.delete_many({"store_id": current_user["store_id"]})
    return {
        "message": f"Deleted {result.deleted_count} menu items",
        "deleted_count": result.deleted_count
    }

@api_router.post("/menu-items/bulk-import", tags=["Menu Items"])
async def bulk_import_menu_items(input: BulkMenuImport, current_user: dict = Depends(get_current_user)):
    """
    Bulk import categories and menu items from JSON.

    Example JSON format:
    {
      "categories": [
        {
          "name": "Món Chính",
          "display_order": 1
        },
        {
          "name": "Đồ Uống",
          "display_order": 2
        }
      ],
      "items": [
        {
          "name": "Phở Bò",
          "description": "Traditional Vietnamese beef noodle soup",
          "price": 65000,
          "category_name": "Món Chính",
          "image_url": "https://example.com/pho.jpg",
          "is_available": true
        }
      ]
    }
    """
    created_categories = []

    # Step 1: Create categories if provided
    if input.categories:
        for cat_data in input.categories:
            # Check if category already exists (case-insensitive)
            existing = await db.categories.find_one({
                "store_id": current_user["store_id"],
                "name": {"$regex": f"^{cat_data.name}$", "$options": "i"}
            })

            if not existing:
                category_id = str(uuid.uuid4())
                category_doc = {
                    "id": category_id,
                    "name": cat_data.name,
                    "store_id": current_user["store_id"],
                    "display_order": cat_data.display_order,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.categories.insert_one(category_doc)
                created_categories.append(Category(**category_doc))

    # Step 2: Get all categories for this store (including newly created ones)
    categories = await db.categories.find(
        {"store_id": current_user["store_id"]},
        {"_id": 0}
    ).to_list(1000)

    if not categories:
        raise HTTPException(
            status_code=400,
            detail="Không tìm thấy danh mục nào. Vui lòng thêm danh mục vào JSON hoặc tạo danh mục trước."
        )

    # Create a mapping of category names to IDs (case-insensitive)
    category_map = {cat["name"].lower(): cat["id"] for cat in categories}

    created_items = []
    errors = []

    for idx, item_data in enumerate(input.items):
        # Find category by name (case-insensitive)
        category_id = category_map.get(item_data.category_name.lower())

        if not category_id:
            errors.append({
                "index": idx,
                "item_name": item_data.name,
                "error": f"Category '{item_data.category_name}' not found"
            })
            continue

        # Create menu item
        item_id = str(uuid.uuid4())
        item_doc = {
            "id": item_id,
            "name": item_data.name,
            "description": item_data.description,
            "price": item_data.price,
            "category_id": category_id,
            "store_id": current_user["store_id"],
            "image_url": item_data.image_url,
            "is_available": item_data.is_available,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        try:
            await db.menu_items.insert_one(item_doc)
            created_items.append(MenuItem(**item_doc))
        except Exception as e:
            errors.append({
                "index": idx,
                "item_name": item_data.name,
                "error": str(e)
            })

    return {
        "categories_created": len(created_categories),
        "items_success": len(created_items),
        "items_failed": len(errors),
        "created_categories": created_categories,
        "created_items": created_items,
        "errors": errors
    }

# ============ ORDER ROUTES ============

@api_router.get("/orders", response_model=List[Order], tags=["Orders"])
async def get_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find(
        {"store_id": current_user["store_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)

    # Enrich orders with payment method info
    for order in orders:
        payment = await db.payments.find_one(
            {"order_id": order["id"]},
            {"_id": 0, "payment_method": 1, "status": 1}
        )
        if payment:
            order["payment_method"] = payment.get("payment_method", "unknown")
            order["payment_status_detail"] = payment.get("status", "pending")
        else:
            # If no payment record, check order status
            # If completed, assume it was cash payment
            if order.get("status") == "completed" and order.get("payment_status") == "paid":
                order["payment_method"] = "cash"
            else:
                order["payment_method"] = "pending"

    return orders

@api_router.get("/orders/{order_id}", response_model=Order, tags=["Orders"])
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one(
        {"id": order_id, "store_id": current_user["store_id"]},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.put("/orders/{order_id}/status", response_model=Order, tags=["Orders"])
async def update_order_status(order_id: str, input: OrderStatusUpdate, current_user: dict = Depends(get_current_user)):
    valid_statuses = ["pending", "preparing", "ready", "completed", "cancelled"]
    if input.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    # Get order first
    order = await db.orders.find_one(
        {"id": order_id, "store_id": current_user["store_id"]},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Update order status
    result = await db.orders.update_one(
        {"id": order_id, "store_id": current_user["store_id"]},
        {"$set": {"status": input.status}}
    )

    # If status changed to "completed", auto-confirm cash payment
    if input.status == "completed":
        # Find payment for this order
        payment = await db.payments.find_one({"order_id": order_id})

        if payment:
            # If payment exists but not yet paid
            if payment.get("status") != "paid":
                # Only auto-confirm cash payments or pending payments
                # Don't touch bank_qr/momo/zalopay that need external confirmation
                payment_method = payment.get("payment_method", "pending")
                if payment_method in ["cash", "pending"]:
                    await db.payments.update_one(
                        {"id": payment["id"]},
                        {
                            "$set": {
                                "payment_method": "cash",  # If it was pending, mark as cash
                                "status": "paid",
                                "paid_at": datetime.now(timezone.utc).isoformat(),
                                "confirmed_by": current_user["id"],
                                "confirmation_note": "Tự động xác nhận khi hoàn thành đơn hàng"
                            }
                        }
                    )

                    # Also update order payment_status
                    await db.orders.update_one(
                        {"id": order_id},
                        {"$set": {"payment_status": "paid"}}
                    )
        else:
            # If no payment record exists, create one for cash payment
            payment_id = str(uuid.uuid4())
            payment_doc = {
                "id": payment_id,
                "order_id": order_id,
                "store_id": current_user["store_id"],
                "amount": order["total"],
                "payment_method": "cash",
                "status": "paid",
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "confirmed_by": current_user["id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.payments.insert_one(payment_doc)

            # Update order payment_status
            await db.orders.update_one(
                {"id": order_id},
                {"$set": {"payment_status": "paid"}}
            )

    # Return updated order
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return order

# ============ ANALYTICS ROUTES ============

@api_router.get("/analytics/dashboard", response_model=DashboardStats, tags=["Analytics"])
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Today's start and end
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_iso = today_start.isoformat()

    # Month's start (first day of current month)
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_start_iso = month_start.isoformat()

    # Get all orders for today
    today_orders = await db.orders.find({
        "store_id": current_user["store_id"],
        "created_at": {"$gte": today_start_iso}
    }).to_list(1000)

    # Only count revenue from completed orders
    completed_orders = [order for order in today_orders if order.get("status") == "completed"]
    today_revenue = sum(order["total"] for order in completed_orders)
    today_orders_count = len(today_orders)

    # Get all orders for this month
    month_orders = await db.orders.find({
        "store_id": current_user["store_id"],
        "created_at": {"$gte": month_start_iso}
    }).to_list(10000)

    # Only count revenue from completed orders
    month_completed_orders = [order for order in month_orders if order.get("status") == "completed"]
    month_revenue = sum(order["total"] for order in month_completed_orders)
    month_orders_count = len(month_orders)

    # Pending orders count
    pending_orders = await db.orders.count_documents({
        "store_id": current_user["store_id"],
        "status": {"$in": ["pending", "preparing"]}
    })

    # Total menu items
    total_items = await db.menu_items.count_documents({
        "store_id": current_user["store_id"]
    })

    # Average order value
    avg_order_value = month_revenue / month_orders_count if month_orders_count > 0 else 0

    # Customer statistics
    all_orders = await db.orders.find(
        {"store_id": current_user["store_id"]},
        {"customer_phone": 1, "created_at": 1, "_id": 0}
    ).to_list(100000)

    unique_customers = set()
    new_customers = set()
    for order in all_orders:
        phone = order.get("customer_phone", "")
        if phone:
            unique_customers.add(phone)
            if order.get("created_at", "") >= month_start_iso:
                # Check if this is their first order
                customer_orders = [o for o in all_orders if o.get("customer_phone") == phone]
                if len(customer_orders) == 1 or min(o.get("created_at", "") for o in customer_orders) >= month_start_iso:
                    new_customers.add(phone)

    # Table statistics
    total_tables_count = await db.tables.count_documents({
        "store_id": current_user["store_id"]
    })
    occupied_tables_count = await db.tables.count_documents({
        "store_id": current_user["store_id"],
        "status": "occupied"
    })

    # Unpaid orders
    unpaid_orders_count = await db.orders.count_documents({
        "store_id": current_user["store_id"],
        "payment_status": "pending"
    })

    # Active promotions
    now = datetime.now(timezone.utc).isoformat()
    active_promotions_count = await db.promotions.count_documents({
        "store_id": current_user["store_id"],
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    })

    # Unavailable menu items
    unavailable_items_count = await db.menu_items.count_documents({
        "store_id": current_user["store_id"],
        "is_available": False
    })

    return DashboardStats(
        today_revenue=today_revenue,
        today_orders=today_orders_count,
        month_revenue=month_revenue,
        month_orders=month_orders_count,
        pending_orders=pending_orders,
        total_menu_items=total_items,
        avg_order_value=avg_order_value,
        total_customers=len(unique_customers),
        new_customers_month=len(new_customers),
        total_tables=total_tables_count,
        occupied_tables=occupied_tables_count,
        unpaid_orders=unpaid_orders_count,
        active_promotions=active_promotions_count,
        unavailable_items=unavailable_items_count
    )

@api_router.get("/analytics/revenue-chart", tags=["Analytics"])
async def get_revenue_chart(current_user: dict = Depends(get_current_user), days: int = 7):
    """Get revenue data for chart (last N days)"""
    result = []

    for i in range(days - 1, -1, -1):
        day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
        day_end = day_start + timedelta(days=1)

        day_start_iso = day_start.isoformat()
        day_end_iso = day_end.isoformat()

        # Get orders for this day
        day_orders = await db.orders.find({
            "store_id": current_user["store_id"],
            "created_at": {"$gte": day_start_iso, "$lt": day_end_iso}
        }).to_list(10000)

        completed_orders = [o for o in day_orders if o.get("status") == "completed"]
        revenue = sum(o["total"] for o in completed_orders)

        result.append({
            "date": day_start.strftime("%d/%m"),
            "revenue": revenue,
            "orders": len(day_orders)
        })

    return result

@api_router.get("/analytics/top-items", tags=["Analytics"])
async def get_top_selling_items(current_user: dict = Depends(get_current_user), limit: int = 5):
    """Get top selling menu items"""

    # Get all completed orders
    orders = await db.orders.find({
        "store_id": current_user["store_id"],
        "status": "completed"
    }).to_list(100000)

    # Count items
    item_stats = {}
    for order in orders:
        for item in order.get("items", []):
            item_id = item.get("menu_item_id")
            if item_id:
                if item_id not in item_stats:
                    item_stats[item_id] = {
                        "item_id": item_id,
                        "name": item.get("name", ""),
                        "quantity": 0,
                        "revenue": 0
                    }
                item_stats[item_id]["quantity"] += item.get("quantity", 0)
                item_stats[item_id]["revenue"] += item.get("price", 0) * item.get("quantity", 0)

    # Sort by quantity
    sorted_items = sorted(item_stats.values(), key=lambda x: x["quantity"], reverse=True)

    return {
        "top_selling": sorted_items[:limit],
        "least_selling": sorted_items[-limit:] if len(sorted_items) >= limit else []
    }

@api_router.get("/analytics/recent-orders", tags=["Analytics"])
async def get_recent_orders(current_user: dict = Depends(get_current_user), limit: int = 10):
    """Get recent orders with payment method info"""
    orders = await db.orders.find(
        {"store_id": current_user["store_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    # Enrich orders with payment method info
    for order in orders:
        # Find payment for this order
        payment = await db.payments.find_one(
            {"order_id": order["id"]},
            {"_id": 0, "payment_method": 1, "status": 1}
        )
        if payment:
            order["payment_method"] = payment.get("payment_method", "unknown")
            order["payment_status_detail"] = payment.get("status", "pending")
        else:
            # If no payment record, check order status
            # If completed, assume it was cash payment
            if order.get("status") == "completed" and order.get("payment_status") == "paid":
                order["payment_method"] = "cash"
            else:
                order["payment_method"] = "pending"

    return orders

@api_router.get("/analytics/payment-methods", tags=["Analytics"])
async def get_payment_method_stats(current_user: dict = Depends(get_current_user)):
    """Get payment method statistics"""

    # Get all payments
    payments = await db.payments.find({
        "store_id": current_user["store_id"],
        "status": "paid"
    }).to_list(100000)

    # Count by method
    method_stats = {}
    for payment in payments:
        method = payment.get("payment_method", "unknown")
        if method not in method_stats:
            method_stats[method] = {
                "method": method,
                "count": 0,
                "total": 0
            }
        method_stats[method]["count"] += 1
        method_stats[method]["total"] += payment.get("amount", 0)

    return list(method_stats.values())

@api_router.get("/analytics/alerts", tags=["Analytics"])
async def get_alerts(current_user: dict = Depends(get_current_user)):
    """Get system alerts and warnings"""
    alerts = []

    # Check unavailable items
    unavailable_items = await db.menu_items.count_documents({
        "store_id": current_user["store_id"],
        "is_available": False
    })
    if unavailable_items > 0:
        alerts.append({
            "type": "warning",
            "title": "Món ăn hết hàng",
            "message": f"Có {unavailable_items} món đang không khả dụng",
            "action": "/admin/menu"
        })

    # Check pending orders over 30 minutes
    thirty_min_ago = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
    old_pending = await db.orders.count_documents({
        "store_id": current_user["store_id"],
        "status": "pending",
        "created_at": {"$lt": thirty_min_ago}
    })
    if old_pending > 0:
        alerts.append({
            "type": "error",
            "title": "Đơn hàng chậm xử lý",
            "message": f"Có {old_pending} đơn đang chờ quá 30 phút",
            "action": "/admin/orders"
        })

    # Check expiring promotions (within 3 days)
    three_days_later = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    now = datetime.now(timezone.utc).isoformat()
    expiring_promos = await db.promotions.count_documents({
        "store_id": current_user["store_id"],
        "is_active": True,
        "end_date": {"$gte": now, "$lte": three_days_later}
    })
    if expiring_promos > 0:
        alerts.append({
            "type": "info",
            "title": "Khuyến mãi sắp hết hạn",
            "message": f"Có {expiring_promos} chương trình sắp kết thúc trong 3 ngày tới",
            "action": "/admin/promotions"
        })

    # Check unpaid orders
    unpaid = await db.orders.count_documents({
        "store_id": current_user["store_id"],
        "payment_status": "pending",
        "status": {"$in": ["completed", "ready"]}
    })
    if unpaid > 0:
        alerts.append({
            "type": "warning",
            "title": "Đơn hàng chưa thanh toán",
            "message": f"Có {unpaid} đơn đã hoàn thành nhưng chưa thanh toán",
            "action": "/admin/orders"
        })

    return alerts

# ============ TABLES ROUTES ============

@api_router.get("/tables", tags=["Tables"])
async def get_tables(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    tables = await db.tables.find(
        {"store_id": current_user["store_id"]},
        {"_id": 0}
    ).sort("table_number", 1).to_list(1000)
    
    # Get store slug for dynamic QR code URL
    store = await db.stores.find_one({"id": current_user["store_id"]}, {"_id": 0, "slug": 1})
    store_slug = store.get("slug", "") if store else ""
    
    # Get frontend URL from request headers (supports both dev and prod)
    frontend_url = request.headers.get("x-frontend-url", FRONTEND_URL).rstrip('/')
    
    # Update QR code URLs to match current environment
    for table in tables:
        table["qr_code_url"] = f"{frontend_url}/menu/{store_slug}?table={table['id']}"
    
    return tables

@api_router.post("/tables", response_model=Table, tags=["Tables"])
async def create_table(
    request: Request,
    input: TableCreate,
    current_user: dict = Depends(get_current_user)
):
    # ============ CHECK TABLE LIMIT ============
    # Get store subscription to check max_tables
    store = await db.stores.find_one({"id": current_user["store_id"]}, {"_id": 0, "plan_id": 1, "max_tables": 1})
    if store:
        max_tables = store.get("max_tables")
        if max_tables is not None and max_tables > 0:
            # Count current tables
            current_count = await db.tables.count_documents({
                "store_id": current_user["store_id"]
            })
            if current_count >= max_tables:
                raise HTTPException(
                    status_code=403,
                    detail=f"Bạn đã đạt giới hạn {max_tables} bàn. Vui lòng nâng cấp lên gói PRO để thêm bàn không giới hạn."
                )
    # ===========================================

    # Check if table number already exists
    existing = await db.tables.find_one({
        "store_id": current_user["store_id"],
        "table_number": input.table_number
    })
    if existing:
        raise HTTPException(status_code=400, detail="Table number already exists")

    # Get store slug for QR code URL
    store = await db.stores.find_one({"id": current_user["store_id"]}, {"_id": 0})
    store_slug = store.get("slug", "") if store else ""

    table_id = str(uuid.uuid4())
    
    # Generate QR code URL - use dynamic URL from request headers
    # This allows QR codes to work in both local and production environments
    frontend_url = request.headers.get("x-frontend-url", FRONTEND_URL).rstrip('/')
    qr_code_url = f"{frontend_url}/menu/{store_slug}?table={table_id}"

    table_doc = {
        "id": table_id,
        "store_id": current_user["store_id"],
        "table_number": input.table_number,
        "capacity": input.capacity,
        "qr_code_url": qr_code_url,
        "status": "available",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tables.insert_one(table_doc)
    
    return table_doc

@api_router.put("/tables/{table_id}", response_model=Table, tags=["Tables"])
async def update_table(table_id: str, input: TableUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    result = await db.tables.update_one(
        {"id": table_id, "store_id": current_user["store_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")

    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    return table

@api_router.delete("/tables/{table_id}", tags=["Tables"])
async def delete_table(table_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tables.delete_one({"id": table_id, "store_id": current_user["store_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted"}

@api_router.get("/tables/{table_id}", response_model=Table, tags=["Tables"])
async def get_table_by_id(table_id: str):
    """Public endpoint to get table info by ID (for QR code scanning)"""
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table

# ============ PAYMENT MODELS ============

class PaymentInitiate(BaseModel):
    order_id: str
    payment_method: str  # cash, bank_qr, momo, zalopay
    customer_info: Optional[dict] = {}

class PaymentResponse(BaseModel):
    payment_id: str
    order_id: str
    status: str
    amount: float
    payment_method: str
    expires_at: Optional[str] = None
    qr_code_url: Optional[str] = None
    bank_info: Optional[dict] = None
    requires_confirmation: Optional[bool] = False
    message: Optional[str] = ""

class PaymentConfirmation(BaseModel):
    amount_received: float
    change_given: Optional[float] = 0
    note: Optional[str] = ""

# ============ PAYMENT ROUTES ============

from payment_service import PaymentService

@api_router.post("/payments/initiate", response_model=PaymentResponse, tags=["Payments"])
async def initiate_payment(input: PaymentInitiate):
    """Initialize payment process - public endpoint"""

    # Get order to find store_id
    order = await db.orders.find_one({"id": input.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")

    try:
        payment_service = PaymentService(db, order["store_id"])
        result = await payment_service.initiate_payment(
            input.order_id,
            input.payment_method,
            input.customer_info
        )
        return result
    except Exception as e:
        raise HTTPException(400, str(e))

@api_router.get("/payments/{payment_id}", tags=["Payments"])
async def get_payment_status(payment_id: str):
    """Get payment status - public endpoint for customers"""

    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(404, "Payment not found")

    return {
        "payment_id": payment["id"],
        "order_id": payment["order_id"],
        "status": payment["status"],
        "amount": payment["amount"],
        "payment_method": payment["payment_method"],
        "paid_at": payment.get("paid_at"),
        "expires_at": payment.get("expires_at")
    }

@api_router.get("/payments/{payment_id}/poll", tags=["Payments"])
async def poll_payment_status(payment_id: str):
    """Poll payment status - for frontend to check updates"""

    try:
        payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
        if not payment:
            raise HTTPException(404, "Payment not found")

        payment_service = PaymentService(db, payment["store_id"])
        result = await payment_service.poll_payment_status(payment_id)
        return result
    except Exception as e:
        raise HTTPException(400, str(e))

@api_router.post("/payments/{payment_id}/confirm", tags=["Payments"])
async def confirm_cash_payment(
    payment_id: str,
    confirmation: PaymentConfirmation,
    current_user: dict = Depends(get_current_user)
):
    """Staff confirms cash payment - requires authentication"""

    if current_user["role"] not in ["admin", "staff"]:
        raise HTTPException(403, "Not authorized")

    try:
        payment = await db.payments.find_one({"id": payment_id})
        if not payment:
            raise HTTPException(404, "Payment not found")

        payment_service = PaymentService(db, payment["store_id"])
        result = await payment_service.confirm_cash_payment(
            payment_id,
            current_user["id"],
            confirmation.model_dump()
        )
        return result
    except Exception as e:
        raise HTTPException(400, str(e))

@api_router.get("/payments", tags=["Payments"])
async def get_payments(current_user: dict = Depends(get_current_user)):
    """Get all payments for the current user's store - requires authentication"""

    if current_user["role"] not in ["admin", "staff"]:
        raise HTTPException(403, "Not authorized")

    try:
        payments = await db.payments.find(
            {"store_id": current_user["store_id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(1000)

        return payments
    except Exception as e:
        raise HTTPException(400, str(e))

@api_router.post("/webhooks/bank-transfer", tags=["Payments"])
async def bank_transfer_webhook(
    request: Request,
    webhook_data: dict,
    x_webhook_signature: Optional[str] = Header(None)
):
    """
    Webhook endpoint for bank transfer notifications

    Supports Casso and similar banking webhook services.
    Configure this URL in your banking service:
    https://yourdomain.com/api/webhooks/bank-transfer

    Security:
    - In production, requires X-Webhook-Signature header for verification
    - Signature is HMAC-SHA256 of request body using WEBHOOK_SECRET

    Expected webhook format:
    {
        "id": "transaction_id",
        "amount": 50000,
        "description": "MINITAKE ABCD1234 thanh toan don hang",
        "when": "2025-01-15T10:30:00Z",
        ...
    }
    """
    try:
        # Verify webhook signature in production
        if settings.ENVIRONMENT == 'production':
            if not x_webhook_signature:
                return {"status": "error", "message": "Missing webhook signature"}
            
            # Get raw request body for signature verification
            body = await request.body()
            payload_str = body.decode('utf-8')
            
            if not verify_webhook_signature(payload_str, x_webhook_signature, settings.WEBHOOK_SECRET):
                return {"status": "error", "message": "Invalid webhook signature"}

        # Try to extract store_id from description or use first store
        # This is a simplified approach - in production, use proper routing
        store = await db.stores.find_one()
        if not store:
            return {"status": "error", "message": "No store found"}

        payment_service = PaymentService(db, store["id"])
        result = await payment_service.process_bank_webhook(webhook_data)

        return result
    except Exception as e:
        # Don't raise HTTPException - banking services expect 200 OK
        # Log error instead
        import logging
        logging.error(f"Webhook processing error: {str(e)}", exc_info=True)
        return {"status": "error", "message": str(e)}

@api_router.post("/webhooks/test-payment", tags=["Payments"])
async def test_payment_webhook(payment_id: str, amount: int):
    """
    TEST ONLY - Simulate bank webhook for development/testing
    
    This endpoint simulates a successful bank transfer webhook.
    Use this to test payment flow without actual bank transfer.
    
    Usage:
    POST /api/webhooks/test-payment
    {
        "payment_id": "abc123...",
        "amount": 50000
    }
    """
    try:
        # Find payment
        payment = await db.payments.find_one({"id": payment_id})
        if not payment:
            raise HTTPException(404, "Payment not found")
        
        # Verify amount
        if int(amount) != int(payment["amount"]):
            return {
                "status": "failed",
                "reason": f"Amount mismatch. Expected {payment['amount']}, got {amount}"
            }
        
        # Simulate webhook data
        webhook_data = {
            "id": f"TEST_{uuid.uuid4().hex[:8]}",
            "amount": amount,
            "description": f"MINITAKE {payment_id[:8].upper()} TEST PAYMENT",
            "when": datetime.now(timezone.utc).isoformat(),
            "transaction_type": "in"
        }
        
        # Process webhook
        payment_service = PaymentService(db, payment["store_id"])
        result = await payment_service.process_bank_webhook(webhook_data)
        
        return {
            **result,
            "note": "This is a TEST webhook simulation. In production, use real bank webhooks."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

# ============ PROMOTION MANAGEMENT ============

class PromotionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    promotion_type: str  # percentage, fixed_amount, buy_x_get_y, combo
    discount_value: float
    start_date: str
    end_date: str
    apply_to: str  # all, category, items, order_total
    category_ids: Optional[List[str]] = []
    item_ids: Optional[List[str]] = []
    min_order_value: Optional[float] = None
    max_discount_amount: Optional[float] = None
    payment_methods: Optional[List[str]] = []
    member_only: Optional[bool] = False
    is_active: Optional[bool] = True
    usage_limit: Optional[int] = None

class PromotionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    promotion_type: Optional[str] = None
    discount_value: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    apply_to: Optional[str] = None
    category_ids: Optional[List[str]] = None
    item_ids: Optional[List[str]] = None
    min_order_value: Optional[float] = None
    max_discount_amount: Optional[float] = None
    payment_methods: Optional[List[str]] = None
    member_only: Optional[bool] = None
    is_active: Optional[bool] = None
    usage_limit: Optional[int] = None

@api_router.get("/promotions", tags=["Promotions"])
async def get_promotions(current_user: dict = Depends(get_current_user)):
    """Get all promotions for current user's store"""
    promotions = await db.promotions.find(
        {"store_id": current_user["store_id"]},
        {"_id": 0}
    ).to_list(100)
    return promotions

@api_router.get("/promotions/active", tags=["Promotions"])
async def get_active_promotions(store_slug: str):
    """Get active promotions for a store (public endpoint for customer menu)"""
    # Get store by slug
    store = await db.stores.find_one({"slug": store_slug})
    if not store:
        raise HTTPException(404, "Store not found")

    # Get active promotions
    now = datetime.now(timezone.utc).isoformat()
    promotions = await db.promotions.find({
        "store_id": store["id"],
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }, {"_id": 0}).to_list(100)

    return promotions

@api_router.post("/promotions", tags=["Promotions"])
async def create_promotion(
    promotion: PromotionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new promotion"""
    if current_user["role"] not in ["admin"]:
        raise HTTPException(403, "Not authorized")

    promotion_id = str(uuid.uuid4())
    promotion_doc = {
        "id": promotion_id,
        "store_id": current_user["store_id"],
        **promotion.model_dump(),
        "usage_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.promotions.insert_one(promotion_doc)

    promotion_doc.pop("_id", None)
    return promotion_doc

@api_router.put("/promotions/{promotion_id}", tags=["Promotions"])
async def update_promotion(
    promotion_id: str,
    promotion_update: PromotionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update promotion"""
    if current_user["role"] not in ["admin"]:
        raise HTTPException(403, "Not authorized")

    # Check if promotion exists and belongs to user's store
    existing = await db.promotions.find_one({
        "id": promotion_id,
        "store_id": current_user["store_id"]
    })
    if not existing:
        raise HTTPException(404, "Promotion not found")

    # Update only provided fields
    update_data = {
        k: v for k, v in promotion_update.model_dump().items()
        if v is not None
    }
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.promotions.update_one(
        {"id": promotion_id},
        {"$set": update_data}
    )

    updated = await db.promotions.find_one({"id": promotion_id}, {"_id": 0})
    return updated

@api_router.delete("/promotions/{promotion_id}", tags=["Promotions"])
async def delete_promotion(
    promotion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete promotion"""
    if current_user["role"] not in ["admin"]:
        raise HTTPException(403, "Not authorized")

    result = await db.promotions.delete_one({
        "id": promotion_id,
        "store_id": current_user["store_id"]
    })

    if result.deleted_count == 0:
        raise HTTPException(404, "Promotion not found")

    return {"message": "Promotion deleted successfully"}

# ============ PAYMENT METHODS MANAGEMENT ============

class PaymentMethodConfig(BaseModel):
    method_type: str  # cash, bank_qr, momo, zalopay, vnpay
    is_enabled: bool
    display_name: str
    display_order: Optional[int] = 0

    # Bank QR Config
    bank_name: Optional[str] = None
    bank_bin: Optional[str] = None
    account_number: Optional[str] = None
    account_name: Optional[str] = None

    # E-wallet Config (Momo, ZaloPay, etc)
    merchant_id: Optional[str] = None
    api_key: Optional[str] = None
    secret_key: Optional[str] = None
    partner_code: Optional[str] = None

class PaymentMethodResponse(BaseModel):
    id: str
    store_id: str
    method_type: str
    is_enabled: bool
    display_name: str
    display_order: int
    config: dict
    created_at: str
    updated_at: Optional[str] = None

@api_router.get("/payment-methods", tags=["Payments"])
async def get_payment_methods(current_user: dict = Depends(get_current_user)):
    """Get all payment methods for store"""
    methods = await db.payment_methods.find(
        {"store_id": current_user["store_id"]},
        {"_id": 0}
    ).sort("display_order", 1).to_list(100)

    # If no methods exist, create defaults
    if not methods:
        default_methods = [
            {
                "id": str(uuid.uuid4()),
                "store_id": current_user["store_id"],
                "method_type": "cash",
                "is_enabled": True,
                "display_name": "Tiền mặt",
                "display_order": 1,
                "config": {},
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "store_id": current_user["store_id"],
                "method_type": "bank_qr",
                "is_enabled": False,
                "display_name": "Chuyển khoản QR",
                "display_order": 2,
                "config": {
                    "bank_name": "",
                    "bank_bin": "",
                    "account_number": "",
                    "account_name": ""
                },
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.payment_methods.insert_many(default_methods)
        methods = default_methods

    return methods

@api_router.put("/payment-methods/{method_id}", tags=["Payments"])
async def update_payment_method(
    method_id: str,
    input: PaymentMethodConfig,
    current_user: dict = Depends(get_current_user)
):
    """Update payment method configuration"""

    # Build config
    config = {}
    if input.method_type == "bank_qr":
        config = {
            "bank_name": input.bank_name or "",
            "bank_bin": input.bank_bin or "",
            "account_number": input.account_number or "",
            "account_name": input.account_name or ""
        }
    elif input.method_type in ["momo", "zalopay", "vnpay"]:
        config = {
            "merchant_id": input.merchant_id or "",
            "api_key": input.api_key or "",
            "secret_key": input.secret_key or "",
            "partner_code": input.partner_code or ""
        }

    update_data = {
        "is_enabled": input.is_enabled,
        "display_name": input.display_name,
        "display_order": input.display_order,
        "config": config,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    result = await db.payment_methods.update_one(
        {"id": method_id, "store_id": current_user["store_id"]},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Payment method not found")

    method = await db.payment_methods.find_one({"id": method_id}, {"_id": 0})
    return method

# ============ AI RECOMMENDATION SYSTEM ============
# Note: Old recommendation system removed, now using Gemini AI in chatbot

class RecommendationContext(BaseModel):
    customer_phone: Optional[str] = None
    cart_items: Optional[List[str]] = []
    limit: Optional[int] = 5

class InteractionTrack(BaseModel):
    store_id: str
    customer_phone: Optional[str] = None
    item_id: str
    interaction_type: str  # viewed, cart_added, purchased
    session_id: Optional[str] = None
    order_id: Optional[str] = None
    quantity: Optional[int] = 1
    price_paid: Optional[float] = 0
    context: Optional[dict] = {}

# DEPRECATED: Old recommendation endpoints - now using Gemini AI in chatbot
# Kept for reference, remove later if not needed

# @api_router.get("/recommendations/{store_slug}", tags=["AI Recommendations"])
# async def get_recommendations(...):
#     """Old recommendation system - replaced by Gemini AI chatbot"""
#     pass

# @api_router.post("/recommendations/track", tags=["AI Recommendations"])
# async def track_recommendation_interaction(...):
#     """Old tracking system - no longer needed"""
#     pass

@api_router.get("/recommendations/trending/{store_slug}", tags=["AI Recommendations"])
async def get_trending_items(
    store_slug: str,
    period: str = "hourly",
    limit: int = 10
):
    """
    Get trending menu items for a store

    Parameters:
    - period: hourly, daily, or weekly
    - limit: Number of items to return
    """
    # Get store
    store = await db.stores.find_one({"slug": store_slug}, {"_id": 0})
    if not store:
        raise HTTPException(404, "Store not found")

    # Get trending items
    trending = await db.trending_items.find({
        "store_id": store['id'],
        "period_type": period
    }, {"_id": 0}).sort("metrics.trend_score", -1).limit(limit).to_list(limit)

    # Enrich with item details
    result = []
    for trend in trending:
        item = await db.menu_items.find_one({"id": trend['item_id']}, {"_id": 0})
        if item:
            result.append({
                "item": item,
                "metrics": trend['metrics'],
                "period": {
                    "type": trend['period_type'],
                    "start": trend['period_start'],
                    "end": trend.get('period_end')
                }
            })

    return {
        "store_id": store['id'],
        "period": period,
        "trending_items": result
    }

@api_router.get("/recommendations/profile/{store_slug}/{customer_phone}", tags=["AI Recommendations"])
async def get_customer_profile(store_slug: str, customer_phone: str):
    """
    Get customer profile and preferences (for debugging/admin)
    """
    # Get store
    store = await db.stores.find_one({"slug": store_slug}, {"_id": 0})
    if not store:
        raise HTTPException(404, "Store not found")

    # Get profile
    profile = await db.customer_profiles.find_one({
        "store_id": store['id'],
        "phone": customer_phone
    }, {"_id": 0})

    if not profile:
        return {
            "exists": False,
            "message": "Customer profile not found. Will be created after first purchase."
        }

    return {
        "exists": True,
        "profile": profile
    }

# ============ AI CHATBOT SYSTEM ============

from chatbot_service import ChatbotService

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    customer_phone: Optional[str] = None
    table_id: Optional[str] = None
    cart_items: Optional[list] = None

class ChatAction(BaseModel):
    action_type: str  # add_to_cart, remove_from_cart, view_detail
    action_payload: dict
    session_id: str

@api_router.post("/chatbot/message", tags=["AI Chatbot"])
async def process_chatbot_message(
    store_slug: str,
    input: ChatMessage
):
    """
    Process chatbot message and return AI response

    Query Parameters:
    - store_slug: Store identifier

    Request Body:
    - message: User's message text
    - session_id: Existing session ID (optional, will create new if not provided)
    - customer_phone: Customer phone number (optional, for personalization)
    - table_id: Table ID from QR scan (optional)

    Returns AI response with:
    - session_id: Session identifier for following messages
    - message: AI response text
    - rich_content: Structured content (cards, carousels, buttons)
    - suggested_actions: Quick reply buttons
    - intent: Detected user intent
    - confidence: Intent detection confidence score

    Example:
    ```
    POST /api/chatbot/message?store_slug=my-restaurant
    {
      "message": "Xin chào",
      "session_id": null
    }
    ```
    """
    # Get store
    store = await db.stores.find_one({"slug": store_slug}, {"_id": 0})
    if not store:
        raise HTTPException(404, "Store not found")

    try:
        # Initialize chatbot service
        chatbot = ChatbotService(db)

        # Process message
        response = await chatbot.process_message(
            message=input.message,
            session_id=input.session_id,
            store_id=store['id'],
            customer_phone=input.customer_phone,
            table_id=input.table_id,
            cart_items=input.cart_items
        )

        return response
    except Exception as e:
        raise HTTPException(500, f"Chatbot error: {str(e)}")

@api_router.post("/chatbot/action", tags=["AI Chatbot"])
async def handle_chatbot_action(
    store_slug: str,
    input: ChatAction
):
    """
    Handle chatbot action (add to cart, remove from cart, view detail)

    Action types:
    - add_to_cart: Add item to cart
    - remove_from_cart: Remove item from cart
    - view_detail: View item details

    Example:
    ```
    POST /api/chatbot/action?store_slug=my-restaurant
    {
      "action_type": "add_to_cart",
      "action_payload": {
        "item_id": "uuid",
        "quantity": 2
      },
      "session_id": "session-uuid"
    }
    ```
    """
    store = await db.stores.find_one({"slug": store_slug}, {"_id": 0})
    if not store:
        raise HTTPException(404, "Store not found")

    try:
        chatbot = ChatbotService(db)

        result = await chatbot.handle_action(
            action_type=input.action_type,
            action_payload=input.action_payload,
            session_id=input.session_id,
            store_id=store['id']
        )

        return result
    except Exception as e:
        raise HTTPException(500, f"Action error: {str(e)}")

@api_router.get("/chatbot/conversation/{session_id}", tags=["AI Chatbot"])
async def get_conversation_history(
    session_id: str,
    limit: int = 20
):
    """
    Get conversation history for a session

    Parameters:
    - session_id: Session identifier
    - limit: Maximum number of messages to return (default: 20)

    Returns:
    - session_id: Session identifier
    - messages: List of messages with role, content, timestamp
    """
    try:
        chatbot = ChatbotService(db)
        history = await chatbot.get_conversation_history(session_id, limit)
        return history
    except Exception as e:
        raise HTTPException(500, f"Error fetching conversation: {str(e)}")

@api_router.delete("/chatbot/conversation/{session_id}", tags=["AI Chatbot"])
async def close_conversation(session_id: str):
    """
    Close a conversation session

    Marks the conversation as completed.
    """
    try:
        from chatbot.conversation_manager import ConversationManager
        manager = ConversationManager(db)
        await manager.close_session(session_id)
        return {"message": "Conversation closed successfully"}
    except Exception as e:
        raise HTTPException(500, f"Error closing conversation: {str(e)}")

@api_router.get("/chatbot/debug/status", tags=["AI Chatbot"])
async def get_chatbot_ai_status():
    """
    Debug endpoint to check AI/Gemini status

    Returns information about:
    - Whether GEMINI_API_KEY is set
    - Whether AI services are initialized
    - Test AI functionality
    """
    import os
    from chatbot.intent_recognizer import IntentRecognizer
    from chatbot.response_generator import ResponseGenerator

    status = {
        "gemini_api_key_set": False,
        "gemini_api_key_preview": "",
        "intent_recognizer_ai": False,
        "response_generator_ai": False,
        "test_result": None,
        "error": None,
        "initialization_logs": []
    }

    # Capture stdout to see initialization logs
    import sys
    from io import StringIO
    old_stdout = sys.stdout
    sys.stdout = captured_output = StringIO()

    try:
        # Check if API key exists
        api_key = os.environ.get('GEMINI_API_KEY')
        if api_key:
            status["gemini_api_key_set"] = True
            status["gemini_api_key_preview"] = f"{api_key[:10]}...{api_key[-4:]}"

        # Check intent recognizer
        try:
            intent_recognizer = IntentRecognizer()
            status["intent_recognizer_ai"] = intent_recognizer.use_ai
            status["intent_recognizer_error"] = None
        except Exception as e:
            status["intent_recognizer_ai"] = False
            status["intent_recognizer_error"] = str(e)
            import traceback
            status["intent_recognizer_traceback"] = traceback.format_exc()
            intent_recognizer = None

        # Check response generator
        try:
            response_generator = ResponseGenerator(db)
            status["response_generator_ai"] = response_generator.use_ai
            status["response_generator_error"] = None
        except Exception as e:
            status["response_generator_ai"] = False
            status["response_generator_error"] = str(e)
            import traceback
            status["response_generator_traceback"] = traceback.format_exc()
            response_generator = None

        # Test Gemini API call
        if intent_recognizer and intent_recognizer.use_ai and intent_recognizer.gemini_service:
            try:
                test_result = intent_recognizer.gemini_service.detect_intent("Xin chào")
                status["test_result"] = {
                    "success": True,
                    "intent": test_result.get("intent"),
                    "confidence": test_result.get("confidence")
                }
            except Exception as test_error:
                status["test_result"] = {
                    "success": False,
                    "error": str(test_error)
                }

    except Exception as e:
        status["error"] = str(e)
        import traceback
        status["traceback"] = traceback.format_exc()
    finally:
        # Restore stdout and capture logs
        sys.stdout = old_stdout
        status["initialization_logs"] = captured_output.getvalue().split('\n')

    return status

# ============ INVENTORY & STAFF MANAGEMENT ============

from routers.inventory_router import create_inventory_router
from routers.staff_router import create_staff_routers

# Initialize routers (will be registered after db is available in startup)
inventory_router = None
employee_router = None
shift_router = None
attendance_router = None

# ============ APP SETUP ============

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.get_cors_origins(),
    allow_origin_regex=settings.get_cors_origin_regex(),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(api_router)
# Register Super Admin router BEFORE startup event so CORS works
app.include_router(super_admin_router)
app.include_router(webhook_router)
app.include_router(subscription_router)

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    global db, inventory_router, employee_router, shift_router, attendance_router
    await db_instance.connect()
    db = db_instance.get_db()
    
    # Initialize and register inventory & staff routers
    inventory_router = create_inventory_router(db, get_current_user)
    employee_router, shift_router, attendance_router = create_staff_routers(db, get_current_user)
    
    # Include routers in API
    app.include_router(inventory_router, prefix="/api")
    app.include_router(employee_router, prefix="/api")
    app.include_router(shift_router, prefix="/api")
    app.include_router(attendance_router, prefix="/api")
    
    print("Minitake F&B System is ready!")
    print("Inventory Management: Enabled")
    print("Staff Management: Enabled")
    print("Subscription System: Enabled")
    print("Super Admin: Enabled")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    await db_instance.close()

