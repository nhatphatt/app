# 🍽️ Minitake - Hệ thống Quản lý Nhà hàng & Menu Số

**Minitake** là một hệ thống quản lý nhà hàng toàn diện với menu số, cho phép khách hàng quét mã QR để xem menu, đặt món và thanh toán trực tuyến. Hệ thống cung cấp dashboard quản lý cho chủ cửa hàng để theo dõi đơn hàng, menu, bàn và doanh thu.

## ✨ Tính năng chính

### 👥 Dành cho Khách hàng
- 📱 **Menu số thông minh**: Quét QR code để xem menu trên điện thoại
- 🛒 **Đặt món trực tuyến**: Thêm món vào giỏ hàng và đặt món ngay
- 💳 **Đa dạng phương thức thanh toán**: Tiền mặt, chuyển khoản QR, ví điện tử
- 📊 **Theo dõi đơn hàng**: Xem trạng thái đơn hàng real-time
- 🔍 **Xem chi tiết món**: Click vào món để xem mô tả đầy đủ và hình ảnh lớn

### 🎛️ Dành cho Quản lý
- 📈 **Dashboard thống kê**: Doanh thu, đơn hàng theo ngày
- 📋 **Quản lý Menu**: Thêm/sửa/xóa danh mục và món ăn
- 🪑 **Quản lý Bàn**: Tạo QR code cho từng bàn
- 📦 **Quản lý Đơn hàng**: Cập nhật trạng thái đơn hàng (pending → preparing → ready → completed)
- ⚙️ **Cài đặt Cửa hàng**: Logo, thông tin liên hệ, cấu hình thanh toán
- 💰 **Quản lý Thanh toán**: Cấu hình phương thức thanh toán

## 🛠️ Công nghệ sử dụng

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - NoSQL database (Motor async driver)
- **JWT** - Authentication & Authorization
- **bcrypt** - Password hashing
- **Python 3.8+**

### Frontend
- **React 19** - UI library
- **React Router v7** - Routing
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Shadcn/ui** - Beautiful component library
- **Axios** - HTTP client
- **Lucide React** - Icons
- **Sonner** - Toast notifications

## 📦 Yêu cầu hệ thống

- **Node.js** >= 16.x
- **Python** >= 3.8
- **MongoDB** (Local hoặc Cloud - MongoDB Atlas)
- **npm/yarn** - Package manager
- **pip** - Python package manager

## 🚀 Cài đặt & Chạy dự án

### 1. Clone repository

```bash
git clone https://github.com/nhatphatt/app.git
cd app
```

### 2. Cài đặt Backend

```bash
cd backend

# Tạo virtual environment (khuyến nghị)
python -m venv venv

# Kích hoạt virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt

# Tạo file .env (copy từ .env.example hoặc tạo mới)
# Chỉnh sửa thông tin MongoDB và các cấu hình khác
```

**File `.env` cần có:**
```env
MONGO_URL="mongodb://localhost:27017"  # Hoặc MongoDB Atlas URL
DB_NAME="minitake_db"
CORS_ORIGINS="*"
JWT_SECRET="your-super-secret-key-change-this"
FRONTEND_URL="http://localhost:3000"
```

**Chạy backend:**
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Backend sẽ chạy tại: `http://localhost:8000`

API Docs: `http://localhost:8000/docs`

### 3. Cài đặt Frontend

```bash
cd frontend

# Cài đặt dependencies (sử dụng npm hoặc yarn)
npm install
# hoặc
yarn install

# Tạo file .env
# Copy từ .env.example hoặc tạo mới
```

**File `.env` cần có:**
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

**Chạy frontend:**
```bash
npm start
# hoặc
yarn start
```

Frontend sẽ chạy tại: `http://localhost:3000`

### 4. Truy cập ứng dụng

- **Admin Dashboard**: `http://localhost:3000/admin/login`
- **Customer Menu**: `http://localhost:3000/menu/{store-slug}`
- **API Documentation**: `http://localhost:8000/docs`

## 📁 Cấu trúc thư mục

```
app/
├── backend/
│   ├── server.py              # FastAPI main application
│   ├── payment_service.py     # Payment processing service
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Backend environment variables
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/           # Shadcn/ui components
│   │   │   ├── AdminLayout.js
│   │   │   ├── PaymentFlow.js
│   │   │   └── OrderStatusTracker.js
│   │   ├── pages/
│   │   │   ├── admin/        # Admin pages
│   │   │   │   ├── AdminDashboard.js
│   │   │   │   ├── MenuManagement.js
│   │   │   │   ├── OrdersManagement.js
│   │   │   │   ├── TablesManagement.js
│   │   │   │   ├── StoreSettings.js
│   │   │   │   └── PaymentSettings.js
│   │   │   └── CustomerMenu.js
│   │   ├── utils/
│   │   │   ├── api.js        # API client
│   │   │   └── auth.js       # Auth utilities
│   │   └── App.js
│   ├── package.json
│   └── .env                   # Frontend environment variables
│
└── README.md
```

## 🎯 Hướng dẫn sử dụng

### Đăng ký & Đăng nhập Admin

1. Truy cập `http://localhost:3000/admin/register`
2. Điền thông tin:
   - Email
   - Mật khẩu
   - Tên của bạn
   - Tên cửa hàng
   - Slug cửa hàng (URL-friendly, vd: `my-restaurant`)
3. Đăng nhập tại `http://localhost:3000/admin/login`

### Thiết lập Cửa hàng

1. **Cài đặt thông tin**: Vào **Settings** để cập nhật:
   - Logo cửa hàng (URL)
   - Địa chỉ
   - Số điện thoại
   - Xem preview logo ngay trong form

2. **Quản lý Menu**:
   - Tạo danh mục (Categories)
   - Thêm món ăn với hình ảnh, mô tả, giá
   - Import hàng loạt bằng JSON

3. **Quản lý Bàn**:
   - Tạo bàn với số bàn
   - Tự động tạo QR code cho mỗi bàn
   - In QR code để khách quét

4. **Cấu hình Thanh toán**:
   - Thiết lập phương thức thanh toán
   - Cấu hình tài khoản ngân hàng cho QR code
   - Kích hoạt/tắt từng phương thức

### Khách hàng Đặt món

1. Quét QR code trên bàn hoặc truy cập URL menu
2. Xem menu theo danh mục
3. Click vào món để xem chi tiết (popup với ảnh lớn)
4. Thêm món vào giỏ hàng
5. Điền thông tin và xác nhận đặt món
6. Chọn phương thức thanh toán
7. Theo dõi trạng thái đơn hàng

## 🔐 Bảo mật

- ✅ JWT authentication
- ✅ Password hashing với bcrypt
- ✅ CORS configuration
- ✅ Environment variables cho sensitive data
- ⚠️ **Lưu ý**: Đổi `JWT_SECRET` trong production!

## 📊 Database Schema

### Collections:
- **stores** - Thông tin cửa hàng
- **users** - Tài khoản admin/staff
- **categories** - Danh mục món ăn
- **menu_items** - Món ăn
- **tables** - Bàn trong nhà hàng
- **orders** - Đơn hàng
- **payments** - Giao dịch thanh toán
- **payment_methods** - Cấu hình thanh toán

## 🌐 API Endpoints

### Public Endpoints:
- `GET /api/public/{store_slug}/menu` - Lấy menu công khai
- `POST /api/public/{store_slug}/orders` - Tạo đơn hàng
- `GET /api/public/orders/{order_id}` - Xem trạng thái đơn hàng
- `POST /api/payments/initiate` - Khởi tạo thanh toán

### Protected Endpoints (Require Auth):
- `GET /api/stores/me` - Thông tin cửa hàng
- `GET /api/categories` - Danh sách danh mục
- `GET /api/menu-items` - Danh sách món ăn
- `GET /api/orders` - Danh sách đơn hàng
- `GET /api/analytics/dashboard` - Thống kê dashboard

Xem đầy đủ tại: `http://localhost:8000/docs`

## 🤝 Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng:
1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📝 License

Dự án này được phát triển cho mục đích học tập và thương mại.

## 👨‍💻 Tác giả

**Nhật Phát** - [GitHub](https://github.com/nhatphatt)

## 📧 Liên hệ & Hỗ trợ

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo Issue trên GitHub.

---

**⭐ Nếu dự án hữu ích, hãy cho một Star nhé! ⭐**
