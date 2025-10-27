# 🚀 Deployment Checklist

## ✅ Pre-Deployment (Local Testing)

### Backend Setup
- [ ] Install dependencies: `pip install -r backend/requirements.txt`
- [ ] Copy `.env.example` to `.env`: `cp backend/.env.example backend/.env`
- [ ] Configure `.env` with your credentials:
  ```env
  MONGO_URL=mongodb://...
  DB_NAME=minitake_db
  JWT_SECRET=your-strong-secret-here
  GEMINI_API_KEY=your-api-key
  FRONTEND_URL=http://localhost:3000
  ```

### Local Testing
- [ ] Run backend: `uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000`
- [ ] Test API docs: http://localhost:8000/docs
- [ ] Run verification: `python verify_optimization.py`
- [ ] Run comprehensive tests: `python tests/backend/test_final_comprehensive.py`
- [ ] Test chatbot: `python tests/backend/test_intent_promotion.py`

## 🔧 Railway Deployment

### Backend Configuration

1. **Environment Variables** (Railway Dashboard → Variables)
   ```env
   MONGO_URL=mongodb://mongo:password@host:port
   DB_NAME=minitake_db
   JWT_SECRET=<generate-strong-secret>
   GEMINI_API_KEY=<your-gemini-key>
   FRONTEND_URL=https://your-frontend.vercel.app
   ```

2. **Build Settings**
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `uvicorn backend.server:app --host 0.0.0.0 --port $PORT`
   - Root Directory: `/` (or `backend` if deploying backend only)

3. **Port Configuration**
   - Railway auto-assigns `$PORT` environment variable
   - Make sure your app binds to `0.0.0.0:$PORT`

### Frontend Configuration (if deploying to Vercel)

1. **Environment Variables**
   ```env
   REACT_APP_API_URL=https://your-backend.railway.app/api
   ```

2. **Build Settings**
   - Framework Preset: Create React App
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`

## 🔍 Post-Deployment Verification

### Backend Health Check
- [ ] Visit: `https://your-backend.railway.app/docs`
- [ ] Test endpoint: `GET /api/health` or any public endpoint
- [ ] Check logs in Railway dashboard for errors

### Database Connection
- [ ] Verify MongoDB connection in logs
- [ ] Test creating a store via API
- [ ] Test authentication endpoints

### Chatbot Testing
- [ ] Send test message: `POST /api/chatbot/message`
- [ ] Test promotion queries:
  - "Có khuyến mãi gì không?"
  - "Có món nào đang giảm giá không?"
  - "Món nào rẻ hơn?"
- [ ] Verify responses are correct (not "Mình hơi confused nè...")

### Frontend Integration
- [ ] Test menu display
- [ ] Test chatbot widget
- [ ] Test add to cart with promotions
- [ ] Test payment flow (cash)
- [ ] Test payment flow (QR) - see Payment Setup below
- [ ] Test QR code scanning

### Payment Setup (VietQR) 💳
- [ ] Register Casso account: https://casso.vn
- [ ] Connect bank account in Casso
- [ ] Configure payment method in admin panel:
  ```json
  {
    "method_type": "bank_qr",
    "config": {
      "bank_name": "Vietcombank",
      "bank_bin": "970436",
      "account_number": "1234567890",
      "account_name": "NGUYEN VAN A"
    }
  }
  ```
- [ ] Set webhook URL in Casso: `https://your-backend.railway.app/api/webhooks/bank-transfer`
- [ ] Test webhook in Casso dashboard
- [ ] Test real transfer (1,000 VND)
- [ ] Verify payment status updates automatically
- [ ] **Remove TEST button** from PaymentFlow.js (production build)

## 🐛 Common Issues & Solutions

### Issue: "Module not found" errors
**Solution:** Make sure all dependencies in `requirements.txt` are installed
```bash
pip install -r backend/requirements.txt
```

### Issue: "Database connection failed"
**Solution:** 
- Check `MONGO_URL` in environment variables
- Verify MongoDB is accessible from Railway
- Check Railway logs for connection errors

### Issue: Chatbot returns "confused" message
**Solution:**
- Check `GEMINI_API_KEY` is set correctly
- Verify you haven't exceeded Gemini API quota (50 requests/day for free tier)
- Test with template fallback (remove `GEMINI_API_KEY` temporarily)

### Issue: CORS errors in frontend
**Solution:**
- Add frontend URL to `CORS_ORIGINS` in `backend/config/settings.py`
- Redeploy backend

### Issue: Import errors with config module
**Solution:**
- Make sure you're running from project root: `uvicorn backend.server:app`
- Not from backend directory: `cd backend && uvicorn server:app` ❌

## 📊 Monitoring

### Logs to Watch
```bash
# Railway logs
railway logs

# Look for:
- "🚀 Minitake F&B System is ready!"
- "Connected to MongoDB: minitake_db"
- Any Python exceptions or traceback
```

### Performance Metrics
- [ ] API response time < 500ms
- [ ] Database query time < 100ms
- [ ] Chatbot response time < 2s (with AI), < 500ms (template)

## 🔐 Security Checklist

- [ ] `JWT_SECRET` is strong and unique (not default value)
- [ ] MongoDB credentials are not exposed
- [ ] `GEMINI_API_KEY` is kept secret
- [ ] CORS origins are restricted (not `*`)
- [ ] Environment variables are set in Railway (not in code)
- [ ] `.env` file is in `.gitignore`

## 📝 Final Steps

- [ ] Commit all changes to git
- [ ] Push to GitHub
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Update `FRONTEND_URL` in Railway with Vercel URL
- [ ] Test end-to-end flow
- [ ] Monitor logs for 24 hours
- [ ] Document any production-specific configurations

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ API docs are accessible at `/docs`
- ✅ Database is connected (check logs)
- ✅ Chatbot responds correctly to all intent types
- ✅ Promotions are applied correctly
- ✅ Frontend can communicate with backend
- ✅ No errors in Railway logs
- ✅ All API endpoints return expected responses

---

**Need Help?**
- Check `backend/README.md` for detailed documentation
- Review `OPTIMIZATION_SUMMARY.md` for recent changes
- Run `python verify_optimization.py` to check local setup
