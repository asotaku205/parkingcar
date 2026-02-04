# 🚗 Hướng Dẫn Chạy Web Dashboard - Arduino Parking System

## 📋 Yêu Cầu

### Phần Cứng
- ✅ Arduino Uno
- ✅ Module RFID RC522
- ✅ Module RTC DS3231
- ✅ LCD I2C 16x2
- ✅ Servo motor
- ✅ 2x Cảm biến hồng ngoại
- ✅ Buzzer
- ✅ **Cáp USB** để kết nối Arduino với máy tính

### Phần Mềm
- ✅ Python 3.7+ (đã cài sẵn)
- ✅ Arduino IDE (để upload code)
- ✅ Trình duyệt web (Chrome, Firefox, Edge...)

---

## 🚀 Hướng Dẫn Từng Bước

### Bước 1: Upload Code Arduino

1. Mở Arduino IDE
2. Mở file **`BaiCuoiKi_Dashboard.ino`** (code đã được cập nhật)
3. Chọn Board: **Arduino Uno**
4. Chọn Port: **COM3/COM4...** (Windows) hoặc **/dev/ttyUSB0** (Linux/Mac)
5. Click **Upload** ⬆️

```
✓ Code này sẽ gửi dữ liệu JSON qua Serial mỗi 2 giây
✓ Khi có xe vào/ra, dữ liệu được gửi ngay lập tức
```

---

### Bước 2: Cài Đặt Python Package

```bash
cd /workspaces/parkingcar/web_dashboard
pip install pyserial
```

**Lưu ý:** Nếu đã có `pyserial`, bỏ qua bước này.

---

### Bước 3: Tìm Cổng Serial của Arduino

#### **Linux/Mac:**
```bash
ls /dev/tty* | grep -E 'USB|ACM'
```

Kết quả thường là: `/dev/ttyUSB0` hoặc `/dev/ttyACM0`

#### **Windows:**
- Mở **Device Manager**
- Tìm **Ports (COM & LPT)**
- Ghi lại port (ví dụ: `COM3`, `COM4`)

---

### Bước 4: Chỉnh Sửa Port trong `server.py` (Nếu Cần)

Mở file `server.py` và sửa dòng:

```python
SERIAL_PORT = '/dev/ttyUSB0'  # Linux/Mac
# Hoặc
SERIAL_PORT = 'COM3'  # Windows
```

Thay bằng port thực tế của bạn.

---

### Bước 5: Chạy Server

```bash
cd /workspaces/parkingcar/web_dashboard
python3 server.py
```

**Kết quả:**
```
============================================================
🚗 ARDUINO PARKING SYSTEM - WEB DASHBOARD
============================================================
✓ Đã kết nối với Arduino qua /dev/ttyUSB0
✓ Web Dashboard đang chạy tại: http://localhost:8000
✓ Mở trình duyệt và truy cập: http://localhost:8000
Đang đợi dữ liệu từ Arduino...
✓ Arduino đã sẵn sàng!
📊 Cập nhật: 4/4 chỗ trống
```

---

### Bước 6: Mở Dashboard

Mở trình duyệt và truy cập:

```
http://localhost:8000
```

🎉 **Dashboard sẽ hiển thị:**
- ✅ Số chỗ trống/đã đỗ
- ✅ Danh sách xe đang đỗ
- ✅ Sơ đồ bãi đỗ
- ✅ Lịch sử xe vào/ra
- ✅ Tổng doanh thu

---

## 📊 Dashboard Sẽ Hiển Thị

### 1. **Stats Cards (Thống kê)**
- 🅿️ Tổng chỗ: 4
- ✅ Chỗ trống: (cập nhật real-time)
- 🚙 Đang đỗ: (cập nhật real-time)
- 💰 Doanh thu: Tổng tiền đã thu

### 2. **Xe Đang Đỗ**
Hiển thị danh sách xe với:
- UID thẻ RFID
- Thời gian vào
- Thời gian đỗ (cập nhật liên tục)

### 3. **Sơ Đồ Bãi Đỗ**
Visual 4 chỗ đỗ:
- 🅿️ = Trống
- 🚙 = Đang đỗ

### 4. **Lịch Sử**
Bảng theo dõi:
- Thời gian
- Loại (Xe vào / Xe ra)
- Thẻ RFID
- Phí

---

## 🛠️ Xử Lý Lỗi

### ❌ Lỗi: "Cannot connect to Serial"

**Nguyên nhân:** Sai port hoặc Arduino chưa kết nối.

**Giải pháp:**
1. Kiểm tra cáp USB đã cắm chưa
2. Kiểm tra port đúng chưa (xem Bước 3)
3. Đóng Arduino IDE (có thể chiếm port)
4. Chỉnh sửa `SERIAL_PORT` trong `server.py`

---

### ❌ Lỗi: "Address already in use"

**Nguyên nhân:** Port 8000 đã bị dùng.

**Giải pháp:**
```bash
# Dừng server cũ
pkill -f server.py

# Hoặc đổi port
# Sửa trong server.py: HTTP_PORT = 8001
```

---

### ⚠️ Dashboard không cập nhật

**Nguyên nhân:** Arduino chưa gửi dữ liệu.

**Giải pháp:**
1. Kiểm tra Serial Monitor trong Arduino IDE (phải thấy JSON)
2. Baud rate đúng chưa (9600)
3. Upload lại code `BaiCuoiKi_Dashboard.ino`

---

## 🔄 Luồng Hoạt Động

```
┌─────────────┐     USB Serial      ┌──────────────┐
│  Arduino    │ ──────────────────> │  Python      │
│  (Hardware) │   JSON Data         │  Bridge      │
└─────────────┘   Every 2s          │  server.py   │
                                     └──────┬───────┘
                                            │
                                     HTTP API
                                            │
                                     ┌──────▼───────┐
                                     │  Web Browser │
                                     │  Dashboard   │
                                     └──────────────┘
```

1. **Arduino** đọc cảm biến → gửi JSON qua USB Serial
2. **Python** đọc Serial → serve qua HTTP API
3. **Web Dashboard** fetch API → hiển thị real-time

---

## 📱 Chạy Trên Mạng LAN

Để truy cập từ điện thoại/máy khác trong cùng mạng:

### Bước 1: Tìm IP máy tính

**Linux/Mac:**
```bash
ip addr show | grep inet
```

**Windows:**
```bash
ipconfig
```

Ví dụ: `192.168.1.100`

### Bước 2: Truy cập từ thiết bị khác

```
http://192.168.1.100:8000
```

---

## 🎯 Demo Nhanh (Không Cần Arduino)

Nếu chưa có Arduino nhưng muốn xem Dashboard:

1. Chạy server:
```bash
python3 server.py
```

2. Server sẽ chạy ở chế độ DEMO (không có dữ liệu thực tế)

3. Mở http://localhost:8000 để xem giao diện

---

## 📝 Ghi Chú

- ✅ Dashboard tự động cập nhật mỗi 1 giây
- ✅ Không cần refresh trang
- ✅ Hoạt động offline (không cần internet)
- ✅ Responsive (chạy được trên mobile)
- ⚠️ Arduino phải luôn kết nối USB với máy tính
- ⚠️ Không tắt terminal đang chạy `server.py`

---

## 🆘 Support

Nếu gặp vấn đề:

1. Kiểm tra log trong terminal
2. Kiểm tra Serial Monitor trong Arduino IDE
3. Kiểm tra Console trong trình duyệt (F12)

---

## 🎉 Hoàn Thành!

Dashboard của bạn đã sẵn sàng! Thử quẹt thẻ RFID và xem dữ liệu cập nhật real-time trên dashboard.

**Chúc bạn thành công! 🚗💨**
