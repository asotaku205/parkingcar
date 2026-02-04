# parkingcar

## Hướng dẫn chạy project

### Yêu cầu
- Arduino IDE
- Python 3.x

### Cài đặt và chạy

1. Upload code Arduino
   - Mở file `BaiCuoiKi_Dashboard.ino` bằng Arduino IDE
   - Chọn board và port phù hợp
   - Upload code lên board

2. Chạy Web Dashboard
   - Di chuyển vào thư mục `web_dashboard`
   - Chạy file `RUN_WINDOWS.bat` (Windows) hoặc
   - Chạy lệnh: `python server.py`
   - Mở trình duyệt và truy cập `http://localhost:8000`

3. Kết nối
   - Đảm bảo Arduino và máy tính cùng mạng WiFi
   - Cấu hình IP trong file `web_dashboard/static/js/config.js` nếu cần