# Railway Deployment Guide

## 🚀 Cách Deploy lên Railway

### Bước 1: Tạo Project trên Railway

1. Truy cập [railway.app](https://railway.app)
2. Đăng nhập bằng GitHub
3. Click **"New Project"**
4. Chọn **"Deploy from GitHub repo"**
5. Chọn repository `nhatphatt/app`

### Bước 2: Deploy Backend (FastAPI)

Railway sẽ tự động detect Python và build theo cấu hình:

**Environment Variables cần thiết:**

```env
# MongoDB
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=minitake

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Frontend URL (sau khi deploy frontend)
FRONTEND_URL=https://your-frontend.vercel.app

# Port (Railway tự động set)
PORT=${{PORT}}
```

**Cấu hình:**
- Railway sẽ sử dụng `Procfile` hoặc `railway.json`
- Python version: 3.10
- Install command: `cd backend && pip install -r requirements.txt`
- Start command: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`

### Bước 3: Deploy Frontend (React)

**Option 1: Deploy trên Vercel (Khuyến nghị)**

1. Truy cập [vercel.com](https://vercel.com)
2. Import repository `nhatphatt/app`
3. Chọn **Root Directory**: `frontend`
4. Framework Preset: **Create React App**
5. Build Command: `npm run build`
6. Output Directory: `build`

**Environment Variables:**

```env
REACT_APP_BACKEND_URL=https://your-backend.railway.app
```

**Option 2: Deploy trên Railway (Tách service)**

1. Trong Railway project, click **"New"** → **"Empty Service"**
2. Chọn source: GitHub repo
3. Root Directory: `/frontend`
4. Build Command: `npm install && npm run build`
5. Start Command: `npx serve -s build -l $PORT`

### Bước 4: Cấu hình CORS

Sau khi có frontend URL, cập nhật CORS trong `backend/server.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Bước 5: Kiểm tra Deployment

**Backend Health Check:**
```bash
curl https://your-backend.railway.app/api/stores/me
```

**Frontend:**
- Truy cập: `https://your-frontend.vercel.app`
- Đăng ký tài khoản mới
- Thử tạo order

## 📝 Troubleshooting

### Lỗi: "Script start.sh not found"
✅ **Đã fix**: Thêm `Procfile` và `railway.json`

### Lỗi: "Module not found"
```bash
# Kiểm tra requirements.txt có đầy đủ dependencies
cd backend
pip install -r requirements.txt
```

### Lỗi: "Port already in use"
✅ Railway tự động set `$PORT`, không cần hardcode

### Lỗi CORS
- Đảm bảo frontend URL đã được thêm vào CORS origins
- Restart backend service

## 🔐 Security Checklist

- [ ] Đổi `JWT_SECRET` thành random string mạnh
- [ ] Cấu hình MongoDB IP Whitelist
- [ ] Enable HTTPS trên Railway (tự động)
- [ ] Đổi passwords mặc định
- [ ] Review CORS settings

## 📊 Monitoring

Railway cung cấp:
- Build logs
- Runtime logs
- Metrics (CPU, Memory, Network)
- Automatic deployments khi push code

## 💰 Pricing

**Railway Free Tier:**
- $5 credit/month
- Đủ cho development/testing
- Auto-sleep sau 5 phút không hoạt động

**Production:**
- Upgrade lên Hobby ($5/month)
- Hoặc Pro ($20/month) cho scaling

## 🎯 Tips

1. **Separate Services**: Deploy backend và frontend riêng biệt
2. **Environment Variables**: Quản lý qua Railway Dashboard
3. **Logs**: Check logs thường xuyên để debug
4. **Health Checks**: Thêm endpoint `/health` để monitoring
5. **Database**: Sử dụng MongoDB Atlas (free tier)

## 📚 Tài liệu

- [Railway Docs](https://docs.railway.app)
- [Nixpacks Docs](https://nixpacks.com)
- [Vercel Docs](https://vercel.com/docs)

---

**Cấu trúc deployment:**
```
Railway (Backend)
  ↓
MongoDB Atlas
  ↑
Vercel (Frontend)
```
