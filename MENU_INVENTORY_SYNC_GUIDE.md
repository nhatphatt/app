# 🔗 Hướng Dẫn: Liên Kết Menu & Kho Món Ăn

## 🎯 Tổng Quan

Hệ thống giờ đây đã tích hợp chặt chẽ giữa **Quản lý Menu** và **Quản lý Kho**, giúp bạn:
- ✅ Đồng bộ món ăn giữa Menu và Kho tự động
- ✅ Import/Export dữ liệu kho bằng JSON
- ✅ Xem trạng thái tồn kho ngay trên menu
- ✅ Tự động cảnh báo khi món hết hàng

## 🆕 Tính Năng Mới

### 1. Import JSON vào Kho

**Vị trí:** Kho Món Ăn → Nút "Import JSON"

**Công dụng:**
- Nhập hàng loạt món vào kho từ file JSON
- Nhanh chóng khởi tạo kho cho nhà hàng mới
- Backup và restore dữ liệu kho

**Cách sử dụng:**

1. Click nút **"Import JSON"**
2. Dán nội dung JSON hoặc tải file
3. Format JSON:

```json
{
  "items": [
    {
      "dish_name": "Phở Bò",
      "category_name": "Món Chính",
      "quantity_in_stock": 50,
      "reorder_threshold": 10,
      "unit": "phần"
    },
    {
      "dish_name": "Cà Phê Sữa",
      "category_name": "Đồ Uống",
      "quantity_in_stock": 100,
      "reorder_threshold": 20,
      "unit": "ly"
    }
  ]
}
```

4. Click **"Import"**
5. Hệ thống sẽ báo: "Thành công: X món, Lỗi: Y món"

**Lưu ý:**
- Món trùng tên sẽ bị bỏ qua (không ghi đè)
- Kiểm tra format JSON trước khi import
- Có thể export ra để xem format mẫu

### 2. Export JSON từ Kho

**Vị trí:** Kho Món Ăn → Nút "Export JSON"

**Công dụng:**
- Backup toàn bộ dữ liệu kho
- Chia sẻ template kho với chi nhánh khác
- Xem format JSON chuẩn

**Cách sử dụng:**

1. Click nút **"Export JSON"**
2. File JSON sẽ tự động download: `inventory_YYYY-MM-DD.json`
3. Mở file để xem hoặc chỉnh sửa
4. Import lại vào hệ thống khác nếu cần

**Ứng dụng thực tế:**
- **Sao chép kho cho chi nhánh mới**: Export từ chi nhánh A → Import vào chi nhánh B
- **Backup định kỳ**: Export mỗi tuần để lưu trữ
- **Template**: Tạo template kho cho franchise

### 3. Đồng Bộ Menu → Kho

**Vị trí:** Kho Món Ăn → Nút "Đồng Bộ Menu"

**Công dụng:**
- Tự động tạo mục kho cho món mới thêm vào menu
- Đảm bảo mọi món trong menu đều được quản lý kho
- Tiết kiệm thời gian nhập liệu

**Cách sử dụng:**

1. Click nút **"Đồng Bộ Menu"**
2. Dialog hiển thị thống kê:
   - **Tổng món trong menu**: 50
   - **Đã có trong kho**: 45
   - **Sẽ tạo mới**: 5 món
3. Xem danh sách món sẽ được tạo
4. Click **"Đồng Bộ Ngay"**
5. Hệ thống tự động tạo mục kho với:
   - Tên món: lấy từ menu
   - Category: lấy từ menu
   - Số lượng ban đầu: 0
   - Ngưỡng cảnh báo: 10
   - Đơn vị: "phần"

**Khi nào dùng:**
- ✅ Sau khi thêm món mới vào menu
- ✅ Khi mới bắt đầu quản lý kho
- ✅ Định kỳ để đảm bảo đồng bộ

**Lưu ý:**
- Chỉ tạo món chưa có trong kho
- Món đã có sẽ KHÔNG bị ghi đè
- Cần cập nhật số lượng thủ công sau khi đồng bộ

### 4. Hiển Thị Trạng Thái Kho Trên Menu

**Vị trí:** Quản lý Menu → Tab "Món ăn" → Mỗi card món

**Hiển thị:**

Mỗi món ăn giờ có thêm thông tin tồn kho:

```
┌─────────────────────────┐
│ Phở Bò                  │
│ 65,000đ                 │
│ Danh mục: Món Chính     │
├─────────────────────────┤
│ Tồn kho: 50 phần ✅    │ ← MỚI
└─────────────────────────┘
```

**Các trạng thái:**

1. **🟢 Còn hàng** (xanh lá)
   - Tồn kho > ngưỡng cảnh báo
   - Hiển thị: "50 phần"

2. **🟡 Tồn kho thấp** (vàng)
   - Tồn kho ≤ ngưỡng cảnh báo, nhưng > 0
   - Hiển thị: "8 phần 🟡 Thấp"

3. **🔴 Hết hàng** (đỏ)
   - Tồn kho = 0
   - Hiển thị: "0 phần 🔴 Hết hàng"

4. **⚪ Chưa quản lý** (xám)
   - Món chưa có trong kho
   - Hiển thị: "Chưa quản lý"

**Lợi ích:**
- Nhìn nhanh biết món nào hết hàng
- Quyết định tắt món trước khi hết hàng
- Nhắc nhở nhập hàng kịp thời

## 🔄 Quy Trình Làm Việc Gợi Ý

### Kịch bản 1: Nhà hàng mới mở

```
Bước 1: Tạo Menu
├─ Vào "Quản lý Menu"
├─ Import menu từ JSON hoặc thêm thủ công
└─ Tạo đầy đủ danh mục và món ăn

Bước 2: Đồng bộ vào Kho
├─ Vào "Kho Món Ăn"
├─ Click "Đồng Bộ Menu"
└─ Tất cả món tự động có mục kho

Bước 3: Cập nhật số lượng
├─ Điều chỉnh số lượng cho từng món
├─ Đặt ngưỡng cảnh báo phù hợp
└─ Bắt đầu bán hàng!
```

### Kịch bản 2: Thêm món mới

```
Bước 1: Thêm món vào Menu
├─ Vào "Quản lý Menu"
└─ Thêm món mới "Cơm Chiên Dương Châu"

Bước 2: Đồng bộ vào Kho
├─ Vào "Kho Món Ăn"
├─ Click "Đồng Bộ Menu"
├─ Thấy: "Sẽ tạo mới: 1 món"
└─ Click "Đồng Bộ Ngay"

Bước 3: Cập nhật số lượng
├─ Tìm món "Cơm Chiên Dương Châu"
├─ Click icon điều chỉnh
└─ Thêm 30 phần vào kho
```

### Kịch bản 3: Sao chép kho sang chi nhánh

```
Chi nhánh A (có sẵn):
├─ Vào "Kho Món Ăn"
├─ Click "Export JSON"
└─ Lưu file inventory_2025-11-10.json

Chi nhánh B (mới):
├─ Vào "Kho Món Ăn"
├─ Click "Import JSON"
├─ Dán nội dung từ file export
└─ Click "Import" → Xong!
```

### Kịch bản 4: Backup định kỳ

```
Mỗi thứ 2 đầu tuần:
├─ Export kho ra JSON
├─ Lưu vào Google Drive / Dropbox
└─ Giữ archive 4 tuần gần nhất
```

## 🎨 Demo Thực Tế

### Ví dụ 1: Import kho từ JSON

**File: `kho_nha_hang_pho.json`**

```json
{
  "items": [
    {
      "dish_name": "Phở Bò Tái",
      "category_name": "Món Chính",
      "quantity_in_stock": 80,
      "reorder_threshold": 15,
      "unit": "phần"
    },
    {
      "dish_name": "Phở Gà",
      "category_name": "Món Chính",
      "quantity_in_stock": 60,
      "reorder_threshold": 12,
      "unit": "phần"
    },
    {
      "dish_name": "Bún Bò Huế",
      "category_name": "Món Chính",
      "quantity_in_stock": 50,
      "reorder_threshold": 10,
      "unit": "phần"
    },
    {
      "dish_name": "Trà Đá",
      "category_name": "Đồ Uống",
      "quantity_in_stock": 200,
      "reorder_threshold": 30,
      "unit": "ly"
    },
    {
      "dish_name": "Nước Ngọt",
      "category_name": "Đồ Uống",
      "quantity_in_stock": 150,
      "reorder_threshold": 25,
      "unit": "chai"
    },
    {
      "dish_name": "Chả Giò",
      "category_name": "Khai Vị",
      "quantity_in_stock": 40,
      "reorder_threshold": 8,
      "unit": "phần"
    }
  ]
}
```

**Kết quả:** 6 món được thêm vào kho trong vài giây!

### Ví dụ 2: Xem trạng thái trên menu

**Trước khi có tính năng:**
```
Phở Bò - 65,000đ
(Không biết còn hàng hay không)
```

**Sau khi có tính năng:**
```
Phở Bò - 65,000đ
Tồn kho: 5 phần 🟡 Thấp
→ Biết ngay cần nhập hàng!
```

## 📊 Dashboard & Monitoring

### Trong "Kho Món Ăn"

**Stats Cards cập nhật:**
- 📦 Tổng Số Món: 45 món
- 📈 Tổng Số Lượng: 1,250 phần/ly/chai
- ⚠️ Tồn Kho Thấp: 8 món
- 📉 Hết Hàng: 2 món

**Alert tự động:**
```
⚠️ Có 8 món đang tồn kho thấp. Vui lòng nhập thêm hàng.
```

### Trong "Quản lý Menu"

**Mỗi món hiện:**
- Giá bán
- Khuyến mãi (nếu có)
- **Trạng thái kho** (mới)

**Lợi ích:**
- Quản lý tập trung
- Quyết định nhanh
- Tránh bán món hết hàng

## ⚙️ Cấu Hình & Tùy Chỉnh

### Đơn vị tồn kho

Hỗ trợ các đơn vị:
- **phần** - Món ăn (phở, cơm, bún...)
- **ly** - Đồ uống (trà, nước ép...)
- **chai** - Nước ngọt, bia...
- **kg** - Nguyên liệu bán theo cân
- **gói** - Thực phẩm đóng gói

### Ngưỡng cảnh báo

**Gợi ý theo loại món:**

| Loại món | Bán nhanh | Bán chậm |
|----------|-----------|----------|
| Món chính | 15-20 | 8-10 |
| Đồ uống | 30-50 | 15-20 |
| Tráng miệng | 10-15 | 5-8 |
| Khai vị | 10-12 | 5-8 |

**Công thức tính:**
```
Ngưỡng = (Số lượng bán trung bình/ngày) × 2
```

### Đồng bộ tên món

**⚠️ Quan trọng:** Tên món trong Menu phải GIỐNG tên trong Kho

**Đúng:**
- Menu: "Phở Bò" → Kho: "Phở Bò" ✅
- Menu: "Cà Phê Sữa" → Kho: "Cà Phê Sữa" ✅

**Sai:**
- Menu: "Phở Bò" → Kho: "Pho Bo" ❌
- Menu: "Cà Phê Sữa Đá" → Kho: "Cà Phê Sữa" ❌

**Mẹo:**
- Sử dụng "Đồng Bộ Menu" để tự động đồng nhất tên
- Kiểm tra chính tả kỹ khi nhập thủ công
- Phân biệt hoa thường: Hệ thống KHÔNG phân biệt

## 🐛 Xử Lý Lỗi

### Lỗi 1: "JSON không hợp lệ"

**Nguyên nhân:** Cú pháp JSON sai

**Giải pháp:**
1. Kiểm tra dấu ngoặc {}, []
2. Kiểm tra dấu phẩy (,) cuối mỗi dòng
3. Kiểm tra dấu nháy kép (")
4. Dùng tool kiểm tra: https://jsonlint.com

**Ví dụ sai:**
```json
{
  "items": [
    {
      "dish_name": "Phở Bò"  // ❌ Thiếu dấu phẩy
      "quantity_in_stock": 50
    }
  ]
}
```

**Ví dụ đúng:**
```json
{
  "items": [
    {
      "dish_name": "Phở Bò",  // ✅ Có dấu phẩy
      "quantity_in_stock": 50
    }
  ]
}
```

### Lỗi 2: "Món đã tồn tại trong kho"

**Nguyên nhân:** Món trùng tên

**Giải pháp:**
- Món trùng sẽ tự động bỏ qua (không lỗi)
- Nếu muốn cập nhật, xóa món cũ trước

### Lỗi 3: "Tất cả món đã có trong kho"

**Nguyên nhân:** Không có món mới để đồng bộ

**Giải pháp:**
- Đây là thông báo, không phải lỗi
- Có nghĩa là menu và kho đã đồng bộ 100%

### Lỗi 4: Không thấy trạng thái kho trên menu

**Nguyên nhân:** 
- Tên món không khớp
- Món chưa có trong kho

**Giải pháp:**
1. Kiểm tra tên món trong menu và kho
2. Dùng "Đồng Bộ Menu" để tự động tạo
3. Refresh lại trang

## 📈 Best Practices

### 1. Quy trình chuẩn hàng ngày

**Sáng:**
```
08:00 - Kiểm tra menu
       ├─ Xem món nào có badge "Hết hàng"
       └─ Tắt món hết hàng trên menu
       
08:15 - Kiểm tra kho
       ├─ Xem món có badge "Tồn kho thấp"
       └─ Lên danh sách nhập hàng
```

**Chiều:**
```
14:00 - Nhập hàng
       ├─ Nhập số lượng mới
       └─ Điều chỉnh trong kho
       
14:30 - Bật lại món
       ├─ Kiểm tra menu
       └─ Bật món vừa nhập hàng
```

### 2. Backup định kỳ

**Hàng tuần:**
- Export kho ra JSON
- Lưu vào cloud storage
- Đặt tên: `kho_YYYYMMDD.json`

**Hàng tháng:**
- Review toàn bộ kho
- Xóa món không bán
- Cập nhật ngưỡng cảnh báo

### 3. Đồng bộ thường xuyên

**Khi nào cần đồng bộ:**
- ✅ Sau khi thêm món mới
- ✅ Sau khi import menu từ JSON
- ✅ Khi bắt đầu quản lý kho
- ✅ Sau khi chỉnh sửa tên món

**Tần suất:** 1 lần/tuần hoặc khi có thay đổi

### 4. Đặt tên chuẩn

**Template đặt tên:**
```
[Tên món] [Size/Loại] [Ghi chú]

Ví dụ:
✅ Phở Bò Tái
✅ Cà Phê Sữa Đá
✅ Cơm Chiên Hải Sản
✅ Trà Sữa Trân Châu Size L

❌ pho bo (thiếu chữ hoa)
❌ CFSua (viết tắt)
❌ Phở - Bò (ký tự đặc biệt không cần thiết)
```

## 🎓 FAQ

**Q: Đồng bộ menu có xóa món cũ trong kho không?**  
A: KHÔNG. Chỉ tạo món mới, món cũ giữ nguyên.

**Q: Import JSON có ghi đè món hiện tại không?**  
A: KHÔNG. Món trùng tên sẽ bị bỏ qua.

**Q: Tôi có thể import menu và kho cùng lúc không?**  
A: CÓ. Import menu trước, sau đó dùng "Đồng Bộ Menu".

**Q: Tự động trừ kho hoạt động như thế nào?**  
A: Khi khách đặt món, hệ thống tự động:
- Tìm món trong kho theo tên
- Trừ số lượng
- Lưu lịch sử với reference đơn hàng

**Q: Nếu tên món trong menu và kho khác nhau?**  
A: Tự động trừ kho sẽ không hoạt động. Cần đồng nhất tên.

**Q: Export JSON có bao gồm lịch sử không?**  
A: KHÔNG. Chỉ export thông tin kho hiện tại.

## 🔗 Tài Liệu Liên Quan

- [INVENTORY_STAFF_GUIDE.md](./INVENTORY_STAFF_GUIDE.md) - Hướng dẫn quản lý kho & nhân viên
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Chi tiết kỹ thuật
- [API Documentation](http://localhost:8000/docs) - Swagger UI

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra console (F12) để xem lỗi
2. Thử refresh lại trang
3. Kiểm tra kết nối mạng
4. Liên hệ support với screenshot lỗi

---

**Phiên bản:** 2.0.0  
**Cập nhật:** 10/11/2025  
**Tác giả:** Minitake Development Team

🎉 **Chúc bạn quản lý hiệu quả!**
