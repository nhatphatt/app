from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'minitake-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

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
]

app = FastAPI(
    title="Minitake F&B API",
    description="API quản lý nhà hàng và menu số - Hỗ trợ đặt món, thanh toán và quản lý cửa hàng",
    version="1.0.0",
    openapi_tags=tags_metadata
)
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

class UserLogin(BaseModel):
    email: EmailStr
    password: str

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
    pending_orders: int
    total_menu_items: int

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

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse, tags=["Authentication"])
async def register(input: UserRegister):
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
    store_doc = {
        "id": store_id,
        "name": input.store_name,
        "slug": input.store_slug,
        "logo": "",
        "address": "",
        "phone": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.stores.insert_one(store_doc)

    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": input.email,
        "password_hash": hash_password(input.password),
        "name": input.name,
        "role": "admin",
        "store_id": store_id,
        "created_at": datetime.now(timezone.utc).isoformat()
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

@api_router.post("/auth/login", response_model=TokenResponse, tags=["Authentication"])
async def login(input: UserLogin):
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

    result = await db.orders.update_one(
        {"id": order_id, "store_id": current_user["store_id"]},
        {"$set": {"status": input.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return order

# ============ ANALYTICS ROUTES ============

@api_router.get("/analytics/dashboard", response_model=DashboardStats, tags=["Analytics"])
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Today's start and end
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_iso = today_start.isoformat()

    # Get all orders for today
    today_orders = await db.orders.find({
        "store_id": current_user["store_id"],
        "created_at": {"$gte": today_start_iso}
    }).to_list(1000)

    # Only count revenue from completed orders
    completed_orders = [order for order in today_orders if order.get("status") == "completed"]
    today_revenue = sum(order["total"] for order in completed_orders)
    today_orders_count = len(today_orders)

    # Pending orders count
    pending_orders = await db.orders.count_documents({
        "store_id": current_user["store_id"],
        "status": {"$in": ["pending", "preparing"]}
    })

    # Total menu items
    total_items = await db.menu_items.count_documents({
        "store_id": current_user["store_id"]
    })

    return DashboardStats(
        today_revenue=today_revenue,
        today_orders=today_orders_count,
        pending_orders=pending_orders,
        total_menu_items=total_items
    )

# ============ TABLES ROUTES ============

@api_router.get("/tables", response_model=List[Table], tags=["Tables"])
async def get_tables(current_user: dict = Depends(get_current_user)):
    tables = await db.tables.find(
        {"store_id": current_user["store_id"]},
        {"_id": 0}
    ).sort("table_number", 1).to_list(1000)
    return tables

@api_router.post("/tables", response_model=Table, tags=["Tables"])
async def create_table(input: TableCreate, current_user: dict = Depends(get_current_user)):
    # Check if table number already exists
    existing = await db.tables.find_one({
        "store_id": current_user["store_id"],
        "table_number": input.table_number
    })
    if existing:
        raise HTTPException(status_code=400, detail="Table number already exists")

    # Get store slug for QR code URL
    store = await db.stores.find_one({"id": current_user["store_id"]}, {"_id": 0})

    table_id = str(uuid.uuid4())
    # Generate QR code URL with table parameter
    base_url = os.environ.get('FRONTEND_URL', 'https://menutech-hub.preview.emergentagent.com')
    qr_code_url = f"{base_url}/menu/{store['slug']}?table={table_id}"

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
    return Table(**table_doc)

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

# ============ APP SETUP ============

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
