# 📦👥 Hướng Dẫn Sử Dụng: Quản Lý Kho & Nhân Viên

## 🎯 Tổng Quan

Hệ thống quản lý kho món ăn và nhân viên được thiết kế để giúp chủ nhà hàng:
- **Theo dõi tồn kho** món ăn real-time
- **Quản lý nhân viên** và thông tin cá nhân
- **Phân ca làm việc** linh hoạt
- **Chấm công** tự động với check-in/check-out
- **Cảnh báo tồn kho thấp** để nhập hàng kịp thời

## 🚀 Bắt Đầu Nhanh

### 1. Khởi động Backend

```bash
cd backend
python server.py
```

Server sẽ chạy tại: `http://localhost:8000`

### 2. Khởi động Frontend

```bash
cd frontend
npm start
```

Frontend sẽ chạy tại: `http://localhost:3000`

### 3. Đăng nhập Admin

- Truy cập: `http://localhost:3000/admin/login`
- Đăng nhập với tài khoản admin của bạn

## 📦 PHẦN 1: QUẢN LÝ KHO MÓN ĂN

### Truy cập Trang Kho

1. Đăng nhập admin panel
2. Click menu **"Kho Món Ăn"** (📦 icon)
3. Bạn sẽ thấy dashboard với các thống kê:
   - Tổng số món
   - Tổng số lượng tồn kho
   - Món tồn kho thấp
   - Món hết hàng

### Thêm Món Vào Kho

1. Click nút **"Thêm Món Vào Kho"**
2. Điền thông tin:
   - **Tên Món**: Ví dụ "Phở Bò"
   - **Loại Món**: Món Chính / Đồ Uống / Tráng Miệng / Khai Vị / Món Phụ
   - **Số Lượng Tồn Kho**: Ví dụ 50
   - **Ngưỡng Cảnh Báo**: Ví dụ 10 (sẽ cảnh báo khi còn ≤ 10)
   - **Đơn Vị**: Phần / Ly / Chai / Kg / Gói
3. Click **"Thêm Món"**

### Điều Chỉnh Số Lượng

1. Tìm món cần điều chỉnh trong bảng
2. Click nút **📈** (Trending Up icon)
3. Chọn kiểu điều chỉnh:
   - **Thêm Vào Kho**: Nhập hàng mới
   - **Trừ Khỏi Kho**: Hàng hỏng, test, etc.
   - **Đặt Số Lượng Mới**: Reset về số lượng cụ thể
4. Nhập số lượng và lý do
5. Click **"Điều Chỉnh"**

### Chỉnh Sửa Thông Tin Món

1. Click nút **✏️** (Edit) trên món cần sửa
2. Cập nhật thông tin
3. Click **"Cập Nhật"**

### Xóa Món Khỏi Kho

1. Click nút **🗑️** (Trash) trên món cần xóa
2. Xác nhận xóa
3. ⚠️ **Lưu ý**: Hành động này không thể hoàn tác

### Tìm Kiếm & Lọc

**Tìm kiếm theo tên:**
- Nhập tên món trong ô "Tìm kiếm món..."

**Lọc theo loại:**
- Chọn loại món từ dropdown "Lọc theo loại"

**Lọc theo tồn kho:**
- **Tất cả**: Hiện tất cả món
- **Tồn kho thấp**: Chỉ hiện món dưới ngưỡng cảnh báo
- **Hết hàng**: Chỉ hiện món có số lượng = 0

### Xem Lịch Sử Nhập-Xuất

1. Click vào món cần xem lịch sử
2. Chọn tab "Lịch Sử"
3. Xem đầy đủ:
   - Thời gian điều chỉnh
   - Người thực hiện
   - Số lượng trước/sau
   - Lý do điều chỉnh
   - Đơn hàng liên quan (nếu có)

### Tự Động Trừ Kho Khi Bán Hàng

**Hệ thống tự động trừ kho khi:**
1. Khách đặt món từ menu
2. Món trong đơn hàng khớp với tên món trong kho
3. Số lượng tự động giảm
4. Lưu lịch sử với tham chiếu đơn hàng

**Ví dụ:**
- Tồn kho "Phở Bò": 50 phần
- Khách đặt 3 phần Phở Bò
- Tồn kho tự động giảm xuống: 47 phần
- Lịch sử ghi: "Bán hàng - Đơn hàng #abc12345"

## 👥 PHẦN 2: QUẢN LÝ NHÂN VIÊN

### Truy cập Trang Nhân Viên

1. Đăng nhập admin panel
2. Click menu **"Nhân Viên"** (👥 icon)
3. Bạn sẽ thấy dashboard với 3 tabs:
   - **Nhân Viên**: Danh sách và thông tin
   - **Ca Làm Việc**: Lịch phân ca
   - **Chấm Công**: Check-in/out và thống kê

### Tab 1: Quản Lý Nhân Viên

#### Thêm Nhân Viên Mới

1. Click **"Thêm Nhân Viên"**
2. Điền thông tin:
   - **Họ Tên*** (bắt buộc): Ví dụ "Nguyễn Văn A"
   - **Vị Trí*** (bắt buộc): 
     - Phục vụ
     - Pha chế
     - Quản lý
     - Thu ngân
     - Bếp
   - **Điện Thoại*** (bắt buộc): 0901234567
   - **Email**: email@example.com
   - **Ngày Vào Làm***: 2025-01-01
   - **Lương**: 5,000,000 VNĐ
   - **Ghi Chú**: Thông tin bổ sung
3. Click **"Thêm Nhân Viên"**

#### Chỉnh Sửa Thông Tin Nhân Viên

1. Click nút **✏️** (Edit) 
2. Cập nhật thông tin cần thiết
3. Click **"Cập Nhật"**

#### Xóa Nhân Viên

1. Click nút **🗑️** (Trash)
2. Xác nhận xóa
3. ⚠️ **Lưu ý**: Cân nhắc kỹ trước khi xóa

#### Tìm Kiếm & Lọc Nhân Viên

**Tìm kiếm:**
- Nhập tên hoặc số điện thoại trong ô "Tìm kiếm nhân viên..."

**Lọc theo trạng thái:**
- **Tất cả**: Hiện tất cả nhân viên
- **Đang làm việc**: Chỉ nhân viên active
- **Nghỉ việc**: Nhân viên đã nghỉ
- **Nghỉ phép**: Nhân viên đang nghỉ phép

#### Check-in Nhanh

- Click nút **✓** (CheckCircle) trên dòng nhân viên để check-in nhanh
- Nút sẽ disable nếu nhân viên đã check-in

### Tab 2: Quản Lý Ca Làm Việc

#### Tạo Ca Làm Việc Đơn Lẻ

1. Click **"Thêm Ca Làm Việc"**
2. Điền thông tin:
   - **Nhân Viên***: Chọn từ danh sách nhân viên đang làm việc
   - **Ngày***: Ví dụ 2025-11-10
   - **Giờ Bắt Đầu***: Ví dụ 08:00
   - **Giờ Kết Thúc***: Ví dụ 17:00
   - **Ghi Chú**: Ca sáng, ca chiều, etc.
3. Click **"Tạo Ca Làm"**

**Hệ thống tự động tính:**
- Số giờ làm việc = Giờ kết thúc - Giờ bắt đầu
- Hỗ trợ ca đêm (qua 00:00)

#### Tạo Ca Làm Hàng Loạt

**Khi nào dùng:**
- Cùng giờ làm cho nhiều người
- Phân ca hàng loạt cho team

**Cách thực hiện:**
1. Click **"Tạo Ca Hàng Loạt"**
2. **Chọn Nhân Viên**: Tick chọn nhiều nhân viên
3. Điền thông tin chung:
   - Ngày làm việc
   - Giờ bắt đầu
   - Giờ kết thúc
   - Ghi chú chung
4. Click **"Tạo X Ca Làm"** (X = số người đã chọn)

**Ví dụ:**
- Chọn 5 nhân viên
- Ngày: 2025-11-11
- Giờ: 09:00 - 18:00
- → Tạo 5 ca làm việc giống nhau cùng lúc

#### Lọc Ca Làm Việc Theo Ngày

1. Chọn ngày từ date picker
2. Bảng tự động lọc ca trong ngày đó
3. Xóa ngày để hiện tất cả ca

#### Chỉnh Sửa Ca Làm

1. Click **✏️** (Edit) trên ca cần sửa
2. Cập nhật thông tin
3. Click **"Cập Nhật"**

#### Xóa Ca Làm

1. Click **🗑️** (Trash)
2. Xác nhận xóa

### Tab 3: Quản Lý Chấm Công

#### Chấm Công Thủ Công (Admin)

**Check-in:**
1. Vào tab "Nhân Viên"
2. Click nút **✓** trên dòng nhân viên
3. Hoặc vào tab "Chấm Công" → Click "Check-in" trong phần "Đang Làm Việc"

**Check-out:**
1. Vào tab "Chấm Công"
2. Tìm nhân viên trong phần "Đang Làm Việc"
3. Click **"Check-out"**
4. Thêm ghi chú nếu cần
5. Xác nhận

#### Xem Nhân Viên Đang Làm Việc

- Phần "Đang Làm Việc" hiển thị:
  - Tên nhân viên
  - Thời gian check-in
  - Nút Check-out

#### Xem Lịch Sử Chấm Công

1. Lọc theo ngày nếu cần
2. Bảng hiển thị:
   - Nhân viên
   - Thời gian check-in
   - Thời gian check-out
   - Số giờ làm việc
   - Trạng thái (Đang làm / Đã kết thúc)
   - Ghi chú

#### Xem Thống Kê Nhân Viên

**Tính năng (qua API):**
```
GET /api/attendance/employee/{employee_id}/stats
?start_date=2025-11-01&end_date=2025-11-30
```

**Thống kê bao gồm:**
- Tổng ngày làm việc
- Tổng giờ làm việc
- Trung bình giờ/ngày
- Số lần đi muộn
- Số ngày vắng mặt

## 🔄 Quy Trình Làm Việc Gợi Ý

### Quy trình hàng ngày:

**Sáng (Trước giờ mở cửa):**
1. Kiểm tra tồn kho → Nhập hàng nếu cần
2. Kiểm tra ca làm việc hôm nay
3. Nhân viên check-in khi đến

**Trong ca:**
- Hệ thống tự động trừ kho khi có đơn hàng
- Theo dõi cảnh báo tồn kho thấp
- Nhân viên làm việc theo ca đã phân

**Cuối ca:**
- Nhân viên check-out
- Kiểm tra số giờ làm việc
- Rà soát tồn kho cuối ngày

**Cuối tuần:**
- Review thống kê chấm công
- Lên lịch ca làm tuần sau
- Nhập hàng cho tuần mới

## 📊 Dashboard & Thống Kê

### Dashboard Kho Món Ăn

**Cards thống kê:**
- 📦 **Tổng Số Món**: Số lượng món khác nhau trong kho
- 📈 **Tổng Số Lượng**: Tổng phần/ly/chai của tất cả món
- ⚠️ **Tồn Kho Thấp**: Số món dưới ngưỡng cảnh báo
- 📉 **Hết Hàng**: Số món có số lượng = 0

**Phân loại theo category:**
- Món Chính: X món, Y phần
- Đồ Uống: X món, Y ly
- Tráng Miệng: X món, Y phần

### Dashboard Nhân Viên

**Cards thống kê:**
- 👥 **Tổng Nhân Viên**: Tổng số nhân viên (X đang làm việc)
- ✅ **Đang Chấm Công**: Nhân viên đang check-in
- 📅 **Ca Làm Hôm Nay**: Số ca đã lên lịch
- 📆 **Tổng Ca Tuần Này**: Tổng số ca trong tuần

## 🎨 Mã Màu & Ý Nghĩa

### Tồn Kho:
- 🟢 **Xanh lá (Còn hàng)**: Tồn kho > ngưỡng cảnh báo
- 🟡 **Vàng (Tồn kho thấp)**: Tồn kho ≤ ngưỡng cảnh báo nhưng > 0
- 🔴 **Đỏ (Hết hàng)**: Tồn kho = 0

### Trạng thái nhân viên:
- 🟢 **Xanh (Đang làm việc)**: Active
- ⚪ **Xám (Nghỉ việc)**: Inactive
- 🟡 **Vàng (Nghỉ phép)**: On leave

### Chấm công:
- 🔵 **Xanh dương (Đang làm)**: Checked-in
- ⚪ **Xám (Đã kết thúc)**: Checked-out

## 🔧 Xử Lý Lỗi Thường Gặp

### Lỗi "Món đã tồn tại trong kho"
**Nguyên nhân:** Tên món trùng lặp
**Giải pháp:** Đổi tên món hoặc xóa món cũ trước

### Lỗi "Số điện thoại đã được sử dụng"
**Nguyên nhân:** SĐT trùng với nhân viên khác
**Giải pháp:** Kiểm tra lại hoặc cập nhật nhân viên cũ

### Lỗi "Nhân viên đã check-in"
**Nguyên nhân:** Nhân viên chưa check-out ca trước
**Giải pháp:** Check-out ca cũ trước khi check-in mới

### Không đủ hàng trong kho
**Hiện tượng:** Cảnh báo khi khách đặt món
**Giải pháp:** 
1. Hệ thống vẫn nhận đơn
2. Trừ số lượng có sẵn
3. Hiển thị cảnh báo cho admin
4. Admin nhập hàng hoặc liên hệ khách

## 📱 Tính Năng Sắp Tới

- [ ] QR Code check-in cho nhân viên
- [ ] Export báo cáo Excel/PDF
- [ ] Tính lương tự động theo giờ công
- [ ] Thông báo push khi tồn kho thấp
- [ ] Dashboard phân tích xu hướng
- [ ] Gợi ý nhập hàng dựa trên lịch sử
- [ ] Tích hợp với kế toán

## 🆘 Hỗ Trợ

### API Documentation
Truy cập Swagger UI: `http://localhost:8000/docs`

### Test API
Chạy script test:
```bash
cd tests/backend
python test_inventory_staff.py
```

### Báo Lỗi
- Kiểm tra log backend: console terminal
- Kiểm tra log frontend: F12 → Console
- Tạo issue với thông tin chi tiết

## 📝 Checklist Triển Khai

- [ ] Backend đã chạy và kết nối MongoDB
- [ ] Frontend đã build và deploy
- [ ] Đã tạo tài khoản admin
- [ ] Đã thêm danh mục món ăn
- [ ] Đã nhập món vào kho
- [ ] Đã tạo danh sách nhân viên
- [ ] Đã test check-in/check-out
- [ ] Đã test tự động trừ kho
- [ ] Đã cấu hình ngưỡng cảnh báo
- [ ] Đã đào tạo nhân viên sử dụng

## 🎓 Tips & Best Practices

1. **Đặt ngưỡng cảnh báo hợp lý:**
   - Món bán nhanh: Ngưỡng cao (20-30)
   - Món bán chậm: Ngưỡng thấp (5-10)

2. **Đồng bộ tên món:**
   - Tên món trong kho = Tên món trong menu
   - Để tự động trừ kho hoạt động đúng

3. **Phân ca khoa học:**
   - Ca sáng: 8:00 - 14:00
   - Ca chiều: 14:00 - 20:00
   - Ca tối: 20:00 - 23:00

4. **Check-in/out đúng giờ:**
   - Thiết lập quy định giờ check-in
   - Theo dõi đi muộn/về sớm

5. **Backup dữ liệu thường xuyên:**
   - Export dữ liệu định kỳ
   - Lưu báo cáo hàng tuần/tháng

---

**Phiên bản:** 1.0.0  
**Cập nhật:** 10/11/2025  
**Tác giả:** Minitake Development Team
