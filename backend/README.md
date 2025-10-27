# Minitake Backend

Backend API cho hệ thống quản lý nhà hàng thông minh Minitake.

## 📁 Cấu trúc Project

```
backend/
├── config/                 # Configuration và settings
│   ├── __init__.py
│   ├── settings.py        # Application settings
│   └── database.py        # Database connection manager
│
├── chatbot/               # AI Chatbot module
│   ├── __init__.py
│   ├── conversation_manager.py    # Quản lý hội thoại
│   ├── gemini_service.py         # Google Gemini AI integration
│   ├── intent_recognizer.py      # Nhận diện ý định người dùng
│   └── response_generator.py     # Tạo phản hồi chatbot
│
├── chatbot_service.py     # Main chatbot service orchestrator
├── payment_service.py     # Payment processing service
├── server.py              # FastAPI main application
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
└── .env                  # Environment variables (gitignored)
```

## 🚀 Tech Stack

- **Framework**: FastAPI
- **Database**: MongoDB (Motor - async driver)
- **AI**: Google Gemini 2.0 Flash
- **Authentication**: JWT (bcrypt)
- **Payment**: MoMo, ZaloPay integration

## 🔧 Setup

### 1. Cài đặt dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment variables

Copy `.env.example` to `.env` và điền thông tin:

```env
MONGO_URL=mongodb://...
DB_NAME=minitake_db
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=http://localhost:3000
```

### 3. Chạy server

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

API sẽ chạy tại: http://localhost:8000

API Docs: http://localhost:8000/docs

## 📚 API Endpoints

### Authentication
- `POST /api/register` - Đăng ký tài khoản
- `POST /api/login` - Đăng nhập

### Stores
- `GET /api/stores` - Lấy danh sách cửa hàng
- `POST /api/stores` - Tạo cửa hàng mới
- `PUT /api/stores/{store_id}` - Cập nhật cửa hàng

### Public Menu
- `GET /api/public/menu/{store_slug}` - Xem menu công khai
- `GET /api/public/menu/{store_slug}/table/{table_number}` - Menu cho bàn cụ thể

### Categories & Menu Items
- `GET /api/categories` - Lấy danh mục
- `POST /api/categories` - Tạo danh mục
- `GET /api/menu-items` - Lấy món ăn
- `POST /api/menu-items` - Tạo món ăn

### Orders
- `GET /api/orders` - Lấy đơn hàng
- `POST /api/orders` - Tạo đơn hàng
- `PATCH /api/orders/{order_id}/status` - Cập nhật trạng thái

### Promotions
- `GET /api/promotions` - Lấy khuyến mãi
- `POST /api/promotions` - Tạo khuyến mãi
- `GET /api/promotions/active` - Khuyến mãi đang hoạt động

### AI Chatbot
- `POST /api/chatbot/message` - Gửi tin nhắn cho chatbot
- `GET /api/chatbot/history/{conversation_id}` - Lấy lịch sử chat
- `GET /api/chatbot/status` - Kiểm tra trạng thái chatbot

### Payments
- `POST /api/payments/initiate` - Khởi tạo thanh toán
- `POST /api/payments/webhook` - Webhook từ payment gateway
- `GET /api/payments/{payment_id}` - Chi tiết thanh toán

## 🤖 Chatbot Features

### Intent Recognition
Chatbot nhận diện các intent:
- `greeting` - Chào hỏi
- `ask_recommendation` - Xin gợi ý món
- `ask_item_info` - Hỏi thông tin món
- `ask_menu` - Xem menu
- `ask_promotion` - Hỏi khuyến mãi
- `order_item` - Đặt món
- `view_cart` - Xem giỏ hàng
- `checkout` - Thanh toán

### AI-Powered Response
- Sử dụng Google Gemini AI cho phản hồi tự nhiên
- Fallback template khi AI không khả dụng
- Context-aware conversations

### Promotion System
- Category-based promotions
- Percentage & fixed amount discounts
- Time-based activation
- Auto-apply to cart

## 🧪 Testing

Test files được tổ chức trong `tests/backend/`:

```bash
# Run specific test
python tests/backend/test_intent_promotion.py

# Run comprehensive test
python tests/backend/test_final_comprehensive.py
```

## 📝 Best Practices

### Code Style
- Follow PEP 8
- Type hints cho functions
- Docstrings cho classes và methods
- Async/await cho database operations

### Error Handling
- Use HTTPException với status codes rõ ràng
- Log errors với context đầy đủ
- Return user-friendly error messages

### Security
- JWT authentication cho protected routes
- Password hashing với bcrypt
- Environment variables cho sensitive data
- CORS configuration

## 🔄 Database Schema

### Collections
- `users` - User accounts
- `stores` - Store information
- `categories` - Menu categories
- `menu_items` - Menu items
- `orders` - Customer orders
- `promotions` - Promotion campaigns
- `payments` - Payment records
- `chatbot_conversations` - Chat history

## 🌟 Key Features

1. **Smart Chatbot**
   - AI-powered natural language understanding
   - Multi-intent handling
   - Context preservation across conversation

2. **Dynamic Promotions**
   - Real-time promotion application
   - Category & item-based targeting
   - Automatic discount calculation

3. **Flexible Payment**
   - Multiple payment methods
   - Webhook verification
   - QR code generation

4. **Real-time Analytics**
   - Revenue tracking
   - Order statistics
   - Popular items analysis

## 📞 Support

For issues or questions, contact the development team.
