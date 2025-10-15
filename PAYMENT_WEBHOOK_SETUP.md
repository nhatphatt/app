# Hướng dẫn cấu hình Webhook Thanh toán

## Tổng quan

Khi khách hàng thanh toán bằng QR Code ngân hàng, hệ thống Minitake cần nhận thông báo từ ngân hàng để tự động xác nhận và **chuyển trạng thái đơn hàng sang "Hoàn thành" (Completed)**.

## Cách hoạt động

```
Khách hàng → Quét QR → Chuyển khoản → Ngân hàng
                                           ↓
                                      Webhook
                                           ↓
                            Minitake Backend (/api/webhooks/bank-transfer)
                                           ↓
                            ✅ Đơn hàng: COMPLETED
                            ✅ Thanh toán: PAID
                            ✅ Bàn: AVAILABLE
```

## Webhook Endpoint

**URL**: `https://yourdomain.com/api/webhooks/bank-transfer`

**Method**: `POST`

**Content-Type**: `application/json`

## Dịch vụ hỗ trợ

### 1. Casso (Khuyên dùng - Miễn phí)

**Website**: https://casso.vn

**Bước 1**: Đăng ký tài khoản Casso
- Truy cập https://casso.vn
- Đăng ký tài khoản miễn phí
- Liên kết tài khoản ngân hàng của bạn

**Bước 2**: Cấu hình Webhook
- Vào **Cài đặt** → **Webhook**
- Nhập URL webhook: `https://yourdomain.com/api/webhooks/bank-transfer`
- Chọn sự kiện: **Giao dịch mới**
- Lưu lại

**Bước 3**: Kiểm tra
- Casso sẽ gửi webhook test
- Kiểm tra logs backend để đảm bảo nhận được

### 2. VietQR API

**Website**: https://vietqr.io

Minitake đã tích hợp VietQR để tạo mã QR, nhưng VietQR không cung cấp webhook miễn phí.

**Giải pháp**: Sử dụng kết hợp VietQR (tạo QR) + Casso (nhận webhook)

## Format Webhook

### Request từ Casso

```json
{
  "id": "TXN123456789",
  "tid": "FT21234567890",
  "amount": 50000,
  "description": "MINITAKE ABCD1234 thanh toan don hang",
  "when": "2025-01-15T10:30:00+07:00",
  "bank_sub_acc_id": "123",
  "subAccId": "123"
}
```

### Response từ Minitake

**Thành công**:
```json
{
  "status": "success",
  "payment_id": "abcd1234-5678-90ab-cdef-1234567890ab",
  "order_id": "efgh5678-1234-56cd-78ef-567890abcdef"
}
```

**Bỏ qua** (không tìm thấy mã thanh toán):
```json
{
  "status": "ignored",
  "reason": "No payment ID found in description"
}
```

**Lỗi** (số tiền không khớp):
```json
{
  "status": "failed",
  "reason": "Amount mismatch. Expected 50000, got 45000"
}
```

## Nội dung chuyển khoản

**Format bắt buộc**: `MINITAKE <8-KÝ-TỰ-ĐẦU-CỦA-PAYMENT-ID>`

**Ví dụ**:
- Payment ID: `abcd1234-5678-90ab-cdef-1234567890ab`
- Nội dung CK: `MINITAKE ABCD1234` (hoặc `minitake abcd1234`, không phân biệt hoa thường)
- Có thể thêm text: `MINITAKE ABCD1234 thanh toan don hang`

## Quy trình xử lý

1. **Webhook nhận được** → Tìm payment theo mã trong nội dung CK
2. **Kiểm tra số tiền** → So sánh với payment.amount
3. **Đánh dấu payment** → `status: "paid"`
4. **Cập nhật đơn hàng** → `status: "completed"`, `payment_status: "paid"`
5. **Giải phóng bàn** → `table.status: "available"`
6. **Frontend polling** → Nhận được `status: "paid"` → Hiển thị thành công

## Testing

### Test bằng cURL

```bash
curl -X POST https://yourdomain.com/api/webhooks/bank-transfer \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TEST123",
    "amount": 50000,
    "description": "MINITAKE ABCD1234 test payment",
    "when": "2025-01-15T10:30:00+07:00"
  }'
```

### Test bằng Postman

1. Method: POST
2. URL: `https://yourdomain.com/api/webhooks/bank-transfer`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "id": "TEST123",
  "amount": 50000,
  "description": "MINITAKE ABCD1234 test payment",
  "when": "2025-01-15T10:30:00+07:00"
}
```

## Bảo mật (Production)

⚠️ **Hiện tại**: Webhook chấp nhận mọi request (development mode)

🔒 **Khuyến nghị Production**:

1. **Xác thực Signature** (Casso cung cấp)
```python
# TODO: Implement in server.py
import hmac
import hashlib

def verify_casso_signature(webhook_data, signature, secret_key):
    computed = hmac.new(
        secret_key.encode(),
        json.dumps(webhook_data).encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(computed, signature)
```

2. **Giới hạn IP** (Chỉ cho phép IP của Casso)
3. **HTTPS bắt buộc**
4. **Rate limiting**

## Troubleshooting

### Webhook không được gọi

- ✅ Kiểm tra URL có public và accessible không
- ✅ Đảm bảo HTTPS (Casso yêu cầu)
- ✅ Kiểm tra logs của Casso
- ✅ Test bằng cURL/Postman trước

### Thanh toán không tự động xác nhận

- ✅ Kiểm tra nội dung CK có đúng format không: `MINITAKE XXXXXXXX`
- ✅ Kiểm tra số tiền có khớp không
- ✅ Xem logs backend: `docker-compose logs backend`
- ✅ Kiểm tra payment status trong database

### Đơn hàng không chuyển sang Completed

- ✅ Kiểm tra payment.status đã là "paid" chưa
- ✅ Kiểm tra order.status và order.payment_status
- ✅ Xem logs `_complete_payment()` function

## Logs & Monitoring

### Xem logs backend
```bash
docker-compose logs -f backend
```

### Kiểm tra payments trong MongoDB
```javascript
db.payments.find({
  payment_method: "bank_qr",
  status: "paid"
}).sort({created_at: -1}).limit(10)
```

### Kiểm tra orders đã hoàn thành
```javascript
db.orders.find({
  status: "completed",
  payment_status: "paid"
}).sort({completed_at: -1}).limit(10)
```

## Tóm tắt

✅ **Webhook endpoint**: `/api/webhooks/bank-transfer`  
✅ **Dịch vụ khuyên dùng**: Casso (miễn phí)  
✅ **Nội dung CK**: `MINITAKE XXXXXXXX`  
✅ **Khi thanh toán thành công**: Đơn hàng tự động → **COMPLETED** ✨  

---

**Hỗ trợ**: Xem thêm tại https://docs.casso.vn hoặc liên hệ team Minitake
