# Deploy Frontend trên Railway

## 🚀 Hướng dẫn Deploy React Frontend

### Bước 1: Tạo Service mới trên Railway

1. Vào Railway Dashboard → Click **"New"**
2. Chọn **"GitHub Repo"**
3. Chọn repository: `nhatphatt/app`
4. Railway sẽ tạo service mới

### Bước 2: Cấu hình Root Directory

1. Trong service vừa tạo, vào **Settings**
2. Tìm **"Root Directory"**
3. Set: `frontend`
4. Save changes

### Bước 3: Set Environment Variables

Vào **Variables** tab và thêm:

```env
REACT_APP_BACKEND_URL=https://minitake.up.railway.app
NODE_ENV=production
```

**Quan trọng:** 
- Backend URL phải là URL Railway backend (không có dấu `/` cuối)
- NODE_ENV=production để optimize build

### Bước 4: Deploy!

Railway sẽ tự động:
1. ✅ Detect Node.js project
2. ✅ Install dependencies: `npm install`
3. ✅ Build React app: `npm run build`
4. ✅ Serve với `serve -s build`

### Bước 5: Configure Domain

1. Sau khi deploy xong, vào **Settings**
2. **Networking** → Generate Domain
3. Railway sẽ tạo domain: `your-app.up.railway.app`

### Bước 6: Update Backend CORS

Sau khi có frontend URL, cập nhật biến môi trường backend:

**Vào Backend Service → Variables:**
```env
FRONTEND_URL=https://your-frontend.up.railway.app
```

Backend sẽ tự động restart với CORS mới.

---

## 📋 File đã tạo sẵn

### `frontend/nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm install", "npm install -g serve"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "serve -s build -l $PORT"
```

### `frontend/railway.json`
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm install -g serve && npm run build"
  },
  "deploy": {
    "startCommand": "serve -s build -l $PORT"
  }
}
```

---

## ✅ Checklist Deploy Frontend

- [ ] Tạo service mới trên Railway
- [ ] Set Root Directory = `frontend`
- [ ] Add environment variable: `REACT_APP_BACKEND_URL`
- [ ] Trigger deploy
- [ ] Wait for build to complete (~5-10 phút)
- [ ] Generate domain
- [ ] Test frontend URL
- [ ] Update backend FRONTEND_URL
- [ ] Test full flow: Register → Login → Create Menu

---

## 🔧 Troubleshooting

### 1. Build failed - Module not found
**Nguyên nhân:** Dependencies chưa install đúng

**Fix:**
```bash
# Check package.json có đầy đủ dependencies
cd frontend
npm install
npm run build
```

### 2. Blank page / 404 on routes
**Nguyên nhân:** React Router không hoạt động với static serve

**Fix:** Railway đã config `serve -s build` → SPA mode → OK

### 3. API calls failed (CORS error)
**Nguyên nhân:** Backend chưa allow frontend domain

**Fix:**
1. Check `REACT_APP_BACKEND_URL` đúng
2. Update backend `FRONTEND_URL`
3. Hoặc set `CORS_ORIGINS=*` (dev only)

### 4. Environment variables không load
**Nguyên nhân:** React cần rebuild khi env thay đổi

**Fix:**
- Redeploy frontend sau khi thay đổi env
- Railway Settings → Redeploy

### 5. Build too long / Out of memory
**Nguyên nhân:** Railway free tier có giới hạn

**Fix:**
- Optimize build: Remove unused dependencies
- Hoặc upgrade Railway plan

---

## 🎯 Alternative: Deploy cả 2 services cùng lúc

Railway hỗ trợ **monorepo**, bạn có thể deploy cả backend và frontend từ cùng 1 repo:

### Service 1: Backend
- Root Directory: `backend`
- Start Command: từ `backend/nixpacks.toml`

### Service 2: Frontend  
- Root Directory: `frontend`
- Start Command: từ `frontend/nixpacks.toml`

Railway tự động detect config từ `nixpacks.toml` trong mỗi directory.

---

## 💡 Tips

1. **Custom Domain:** Settings → Domains → Add custom domain
2. **Auto Deploy:** Push to main branch → Auto rebuild
3. **Preview Deploys:** Create PR → Railway tạo preview URL
4. **Logs:** View real-time logs trong Deployments tab
5. **Rollback:** Deployments → Chọn deploy cũ → Redeploy

---

## 📊 Expected URLs sau khi deploy

### Backend:
- API: `https://minitake.up.railway.app/api`
- Docs: `https://minitake.up.railway.app/docs`

### Frontend:
- Web: `https://minitake-frontend.up.railway.app`
- Login: `https://minitake-frontend.up.railway.app/admin/login`
- Menu: `https://minitake-frontend.up.railway.app/menu/:storeSlug`

---

## 🔐 Security Notes

- ✅ Railway tự động cung cấp HTTPS
- ✅ Environment variables được encrypt
- ✅ Không commit `.env` vào Git
- ✅ Use environment-specific configs
- ⚠️ Set proper CORS in production

---

## 💰 Railway Pricing

**Free Tier:**
- $5 credit/month
- Shared CPU/Memory
- Unlimited projects
- Auto-sleep sau 5 phút không hoạt động

**Hobby Plan ($5/month):**
- No auto-sleep
- Better resources
- Priority builds

**Pro Plan ($20/month):**
- Dedicated resources
- Team collaboration
- Advanced monitoring

---

## 📞 Support

- [Railway Docs](https://docs.railway.app)
- [Nixpacks Docs](https://nixpacks.com)
- [Railway Discord](https://discord.gg/railway)

---

## ✨ Bonus: Health Check Endpoint

Thêm vào `frontend/public/health.html`:
```html
<!DOCTYPE html>
<html>
<head><title>OK</title></head>
<body>OK</body>
</html>
```

Railway sẽ ping `/health.html` để check uptime.

**Current Status:** Ready to deploy! 🚀
