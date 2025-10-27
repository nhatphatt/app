# 🧪 VietQR Payment Testing Guide

## 📝 Quick Start

### Development Testing (Localhost)

#### Option 1: Test Button (Recommended ⭐)

1. Start servers:
   ```bash
   # Backend
   cd backend && uvicorn server:app --reload
   
   # Frontend
   cd frontend && npm start
   ```

2. Create order → Choose "Chuyển khoản QR"

3. Click **🧪 TEST: Simulate Payment Success** button

4. ✅ Success screen appears in 3 seconds!

#### Option 2: API Test

```bash
# 1. Create payment
POST http://localhost:8000/api/payments/initiate
{
  "order_id": "your-order-id",
  "payment_method": "bank_qr"
}
# Get payment_id from response

# 2. Simulate webhook
POST http://localhost:8000/api/webhooks/test-payment
{
  "payment_id": "abc123...",
  "amount": 50000
}
# Response: { "status": "success" }

# 3. Check status (frontend does this automatically)
GET http://localhost:8000/api/payments/abc123.../poll
# Response: { "status": "paid" }
```

### Production Testing (Real Bank)

1. **Setup Casso** (one-time):
   - Register at https://casso.vn
   - Connect bank account
   - Configure webhook: `https://your-backend.railway.app/api/webhooks/bank-transfer`

2. **Test flow**:
   - Create order → Choose QR payment
   - Open banking app → Scan QR
   - Transfer with exact content shown
   - Wait 1-5 minutes → Webhook arrives
   - ✅ Payment confirmed automatically!

## 🔍 Debugging

### Check Payment Status

```bash
GET /api/payments/{payment_id}
```

Response:
```json
{
  "id": "payment_id",
  "status": "pending" | "paid" | "expired",
  "webhook_received": true/false,
  "webhook_verified": true/false,
  "paid_at": "2025-10-27T10:00:00Z"
}
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| QR không hiển thị | Chưa config payment method | Setup bank info in admin panel |
| Frontend không update | Polling fail hoặc webhook chưa về | Check browser console & backend logs |
| Webhook không về | Casso chưa config hoặc URL sai | Verify webhook URL in Casso dashboard |
| Amount mismatch | Khách CK sai số tiền | Manual verification or refund |

## 📊 Test Scenarios

✅ **Success**: Order → QR → Transfer → Webhook → Completed  
⏰ **Expired**: Order → QR → 15min → Expired → Retry  
❌ **Wrong Content**: Transfer với sai nội dung → Ignored  
❌ **Wrong Amount**: Transfer sai số tiền → Failed

## 🎯 Production Checklist

- [ ] Casso account + bank connected
- [ ] Webhook URL configured
- [ ] Test real transfer (1,000 VND)
- [ ] Remove TEST button (`NODE_ENV=production`)
- [ ] Monitor logs for errors
- [ ] Add webhook signature verification

## 🔐 Security

Production MUST have:
1. Webhook signature verification (prevent fake webhooks)
2. Amount validation before marking paid
3. HTTPS only
4. Rate limiting on webhook endpoint

See `PAYMENT_WEBHOOK_SETUP.md` for detailed guide.
