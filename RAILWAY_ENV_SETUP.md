# Railway Environment Variables Setup

## ✅ Backend đã deploy thành công!

**API URL:** https://minitake.up.railway.app

**Swagger Docs:** https://minitake.up.railway.app/docs

---

## 🔐 Environment Variables cần thiết

Vào **Railway Dashboard → Your Service → Variables** và thêm các biến sau:

### 1. **MongoDB Connection** (BẮT BUỘC)

```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=minitake
```

**Lấy MongoDB connection string:**
- Vào [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Tạo free cluster (M0)
- Database Access → Add user
- Network Access → Add IP: `0.0.0.0/0` (allow all)
- Connect → Drivers → Copy connection string
- Thay `<password>` bằng password thật

### 2. **JWT Secret** (BẮT BUỘC)

```env
JWT_SECRET=your-super-secret-random-string-min-32-characters
```

**Tạo JWT secret ngẫu nhiên:**
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 3. **Frontend URL** (TÙY CHỌN - sau khi deploy frontend)

```env
FRONTEND_URL=https://your-frontend-app.vercel.app
```

> Nếu chưa deploy frontend, để mặc định. Cập nhật sau.

### 4. **CORS Origins** (TÙY CHỌN)

```env
CORS_ORIGINS=*
```

> Development: `*` (allow all)  
> Production: Chỉ định frontend URL cụ thể

### 5. **Google Gemini API** (TÙY CHỌN - cho AI Chatbot)

```env
GEMINI_API_KEY=your-gemini-api-key
```

**Lấy Gemini API key (FREE):**
- Truy cập: https://makersuite.google.com/app/apikey
- Tạo API key miễn phí
- Copy và paste vào Railway

> Nếu không có: Chatbot sẽ dùng pattern-based fallback (không có AI)

---

## 📋 Full Example Configuration

```env
# Required
MONGO_URL=mongodb+srv://minitake_user:MySecurePass123@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=minitake
JWT_SECRET=aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE1fG3hI5jK7

# Optional
FRONTEND_URL=https://minitake-frontend.vercel.app
CORS_ORIGINS=*
GEMINI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🚀 Sau khi set Environment Variables

### Railway sẽ tự động:
1. ✅ Restart service với env mới
2. ✅ Connect tới MongoDB
3. ✅ API sẵn sàng nhận requests

### Test API:

**1. Health Check:**
```bash
curl https://minitake.up.railway.app/docs
# Trả về Swagger UI
```

**2. Test Register:**
```bash
curl -X POST https://minitake.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "store_name": "My Store",
    "store_slug": "my-store"
  }'
```

**3. Test Public Menu (sau khi register):**
```bash
curl https://minitake.up.railway.app/api/public/my-store/menu
```

---

## 🎨 Deploy Frontend (Next Step)

### Option 1: Vercel (Khuyến nghị)

1. Truy cập [vercel.com](https://vercel.com)
2. Import GitHub repository
3. **Root Directory:** `frontend`
4. **Framework Preset:** Create React App
5. **Environment Variables:**
   ```env
   REACT_APP_BACKEND_URL=https://minitake.up.railway.app
   ```
6. Deploy!

### Option 2: Railway (Separate service)

1. Railway Dashboard → New → Empty Service
2. Connect GitHub repo
3. Root Directory: `/frontend`
4. Environment Variables:
   ```env
   REACT_APP_BACKEND_URL=https://minitake.up.railway.app
   ```
5. Build & Deploy

---

## 🔧 Troubleshooting

### 1. API trả về 500 Internal Server Error
**Nguyên nhân:** MongoDB connection failed

**Fix:**
- Check `MONGO_URL` đúng format
- Check MongoDB user/password
- Check IP whitelist (0.0.0.0/0)

### 2. CORS Error từ Frontend
**Nguyên nhân:** Frontend URL chưa được allow

**Fix:**
```env
CORS_ORIGINS=https://your-frontend.vercel.app
```

Hoặc trong code (`backend/server.py`):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend.vercel.app"],
    ...
)
```

### 3. JWT Token Invalid
**Nguyên nhân:** JWT_SECRET bị đổi giữa chừng

**Fix:**
- Users phải login lại
- Hoặc giữ nguyên JWT_SECRET

### 4. Chatbot không hoạt động
**Nguyên nhân:** Thiếu GEMINI_API_KEY

**Fix:**
- Thêm GEMINI_API_KEY (hoặc)
- Chatbot sẽ dùng fallback mode (pattern-based)

---

## 📊 Monitoring

**Railway Dashboard cung cấp:**
- ✅ Real-time logs
- ✅ CPU/Memory metrics
- ✅ Network traffic
- ✅ Deployment history

**View Logs:**
Railway Dashboard → Your Service → Deployments → View Logs

---

## 💡 Tips

1. **Backup MongoDB:** Export data thường xuyên
2. **Monitor Usage:** Railway free tier có giới hạn
3. **Use Secrets:** Không commit `.env` vào Git
4. **HTTPS Only:** Railway tự động cung cấp SSL
5. **Custom Domain:** Settings → Add custom domain

---

## 🎯 Checklist Deploy Success

- [ ] Set MONGO_URL
- [ ] Set JWT_SECRET  
- [ ] Set DB_NAME
- [ ] Service running (no errors in logs)
- [ ] Test /docs endpoint
- [ ] Test register API
- [ ] Deploy frontend
- [ ] Update FRONTEND_URL
- [ ] Test full flow: Register → Login → Create Menu → Order

---

## 📞 Support

- [Railway Docs](https://docs.railway.app)
- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas)
- [FastAPI Docs](https://fastapi.tiangolo.com)

**Current Status:** ✅ Backend is LIVE!
