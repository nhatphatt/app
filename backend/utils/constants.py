"""Application constants and enums."""
from enum import Enum


class OrderStatus(str, Enum):
    """Order status enumeration."""
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    """Payment status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    PAID = "paid"
    FAILED = "failed"
    EXPIRED = "expired"


class PaymentMethod(str, Enum):
    """Payment method enumeration."""
    CASH = "cash"
    BANK_QR = "bank_qr"
    MOMO = "momo"
    ZALO_PAY = "zalo_pay"


class TableStatus(str, Enum):
    """Table status enumeration."""
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"


class UserRole(str, Enum):
    """User role enumeration."""
    ADMIN = "admin"
    STAFF = "staff"
    MANAGER = "manager"


class PromotionType(str, Enum):
    """Promotion type enumeration."""
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    BUY_X_GET_Y = "buy_x_get_y"


class PromotionApplyTo(str, Enum):
    """What promotion applies to."""
    ALL = "all"
    CATEGORY = "category"
    ITEMS = "items"


# HTTP Status Codes
class HTTPStatus:
    """Common HTTP status codes."""
    OK = 200
    CREATED = 201
    NO_CONTENT = 204
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    CONFLICT = 409
    UNPROCESSABLE_ENTITY = 422
    TOO_MANY_REQUESTS = 429
    INTERNAL_SERVER_ERROR = 500


# Error Messages
class ErrorMessages:
    """Common error messages."""
    # Auth
    INVALID_CREDENTIALS = "Email hoặc mật khẩu không đúng"
    EMAIL_EXISTS = "Email đã được đăng ký"
    UNAUTHORIZED = "Bạn cần đăng nhập để thực hiện thao tác này"
    TOKEN_EXPIRED = "Phiên đăng nhập đã hết hạn"
    INVALID_TOKEN = "Token không hợp lệ"
    
    # Store
    STORE_NOT_FOUND = "Không tìm thấy cửa hàng"
    SLUG_EXISTS = "Slug cửa hàng đã tồn tại"
    
    # Menu
    CATEGORY_NOT_FOUND = "Không tìm thấy danh mục"
    ITEM_NOT_FOUND = "Không tìm thấy món ăn"
    
    # Order
    ORDER_NOT_FOUND = "Không tìm thấy đơn hàng"
    ORDER_ALREADY_PAID = "Đơn hàng đã được thanh toán"
    EMPTY_CART = "Giỏ hàng trống"
    
    # Payment
    PAYMENT_NOT_FOUND = "Không tìm thấy giao dịch thanh toán"
    PAYMENT_EXPIRED = "Giao dịch thanh toán đã hết hạn"
    PAYMENT_METHOD_NOT_CONFIGURED = "Phương thức thanh toán chưa được cấu hình"
    
    # Table
    TABLE_NOT_FOUND = "Không tìm thấy bàn"
    TABLE_OCCUPIED = "Bàn đang được sử dụng"
    
    # Promotion
    PROMOTION_NOT_FOUND = "Không tìm thấy chương trình khuyến mãi"
    PROMOTION_EXPIRED = "Chương trình khuyến mãi đã hết hạn"
    
    # Generic
    NOT_FOUND = "Không tìm thấy tài nguyên"
    FORBIDDEN = "Bạn không có quyền thực hiện thao tác này"
    INTERNAL_ERROR = "Đã xảy ra lỗi hệ thống"
    VALIDATION_ERROR = "Dữ liệu không hợp lệ"


# Success Messages
class SuccessMessages:
    """Common success messages."""
    # Auth
    REGISTER_SUCCESS = "Đăng ký tài khoản thành công"
    LOGIN_SUCCESS = "Đăng nhập thành công"
    
    # Store
    STORE_UPDATED = "Cập nhật thông tin cửa hàng thành công"
    
    # Menu
    CATEGORY_CREATED = "Tạo danh mục thành công"
    CATEGORY_UPDATED = "Cập nhật danh mục thành công"
    CATEGORY_DELETED = "Xóa danh mục thành công"
    ITEM_CREATED = "Tạo món ăn thành công"
    ITEM_UPDATED = "Cập nhật món ăn thành công"
    ITEM_DELETED = "Xóa món ăn thành công"
    
    # Order
    ORDER_CREATED = "Tạo đơn hàng thành công"
    ORDER_UPDATED = "Cập nhật đơn hàng thành công"
    ORDER_CANCELLED = "Hủy đơn hàng thành công"
    
    # Payment
    PAYMENT_INITIATED = "Khởi tạo thanh toán thành công"
    PAYMENT_CONFIRMED = "Xác nhận thanh toán thành công"
    
    # Table
    TABLE_CREATED = "Tạo bàn thành công"
    TABLE_UPDATED = "Cập nhật bàn thành công"
    TABLE_DELETED = "Xóa bàn thành công"
    
    # Promotion
    PROMOTION_CREATED = "Tạo khuyến mãi thành công"
    PROMOTION_UPDATED = "Cập nhật khuyến mãi thành công"
    PROMOTION_DELETED = "Xóa khuyến mãi thành công"


# Time Constants
class TimeConstants:
    """Time-related constants."""
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
    PAYMENT_EXPIRE_MINUTES = 15  # 15 minutes
    SESSION_EXPIRE_HOURS = 24  # 24 hours


# Pagination
class PaginationDefaults:
    """Default pagination values."""
    PAGE = 1
    PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
