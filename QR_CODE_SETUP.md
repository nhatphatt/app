# Hướng dẫn Cấu hình Mã QR cho Bàn

## Tổng quan

Mỗi bàn sẽ có một mã QR riêng để khách hàng quét và truy cập menu. URL của mã QR được tạo tự động khi thêm bàn mới.

## Cấu hình

### 1. Môi trường Local (Development)

Trong file `backend/.env`:

```bash
FRONTEND_URL="http://localhost:3000"
```

### 2. Môi trường Production (Railway)

**Trong Railway Dashboard:**

1. Mở project của bạn trên Railway
2. Chọn service **backend**
3. Vào tab **Variables**
4. Thêm biến môi trường:

```
FRONTEND_URL=https://your-frontend-url.railway.app
```

**Lưu ý:** Thay `your-frontend-url.railway.app` bằng URL thực tế của frontend service trên Railway.

## Cách hoạt động

Khi tạo bàn mới, hệ thống sẽ:

1. Tạo một `table_id` duy nhất
2. Tạo URL QR code theo format: `{FRONTEND_URL}/menu/{store_slug}?table={table_id}`
3. Lưu URL này vào database

Ví dụ URL QR code:

- **Local:** `http://localhost:3000/menu/minitake?table=abc-123-def-456`
- **Production:** `https://your-app.railway.app/menu/minitake?table=abc-123-def-456`

## Kiểm tra

1. Thêm một bàn mới trong **Quản lý Bàn**
2. Click nút **"Xem QR"**
3. Kiểm tra URL hiển thị - phải khớp với FRONTEND_URL bạn đã cấu hình
4. Quét QR code bằng điện thoại để test

## Troubleshooting

### QR code dẫn đến URL sai

- Kiểm tra biến `FRONTEND_URL` trong Railway dashboard
- Đảm bảo không có dấu `/` ở cuối URL
- Deploy lại sau khi thay đổi biến môi trường

### QR code không hiển thị

- Kiểm tra console log của frontend
- Đảm bảo backend đã trả về field `qr_code_url` trong response

### URL trong QR code không mở được

- Kiểm tra frontend đã deploy thành công
- Kiểm tra route `/menu/:slug` có hoạt động không
