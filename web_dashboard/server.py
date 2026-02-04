#!/usr/bin/env python3
"""
Arduino Parking System - Serial Bridge Server
Doc du lieu tu Arduino qua Serial va serve qua HTTP cho Web Dashboard
"""

import serial
import json
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import os
import sys

# Cau hinh
SERIAL_PORT = 'COM4'  # Linux/Mac: /dev/ttyUSB0 hoac /dev/ttyACM0
                               # Windows: COM3, COM4, etc.
BAUD_RATE = 9600
HTTP_PORT = 8000

# Du lieu hien tai
current_data = {
    "totalSlots": 4,
    "availableSlots": 4,
    "occupiedSlots": 0,
    "time": "00:00:00",
    "date": "01/01/2024",
    "activeVehicles": [],
    "lastUpdate": time.time()
}

event_history = []

# Ket noi Serial
ser = None

def connect_serial():
    """Ket noi voi Arduino qua Serial"""
    global ser
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        print(f"✓ Đã kết nối với Arduino qua {SERIAL_PORT}")
        time.sleep(2)  # Cho Arduino khoi dong
        return True
    except serial.SerialException as e:
        print(f"✗ Không thể kết nối Serial: {e}")
        print(f"\nHướng dẫn:")
        print(f"- Linux/Mac: Thử /dev/ttyUSB0, /dev/ttyACM0, /dev/ttyUSB1")
        print(f"- Windows: Thử COM3, COM4, COM5")
        print(f"- Kiểm tra: ls /dev/tty* | grep -E 'USB|ACM'")
        return False

def read_serial():
    """Doc du lieu tu Arduino"""
    global current_data, event_history
    
    print("Đang đợi dữ liệu từ Arduino...")
    
    while True:
        try:
            if ser and ser.in_waiting > 0:
                line = ser.readline().decode('utf-8').strip()
                
                if line and line.startswith('{') and line.endswith('}'):
                    try:
                        data = json.loads(line)
                        
                        # Kiem tra loai du lieu
                        if "event" in data:
                            # Su kien xe vao/ra
                            event_history.insert(0, data)
                            if len(event_history) > 50:
                                event_history.pop()
                            print(f"📝 Sự kiện: {data['event']} - {data['uid']}")
                        
                        elif "totalSlots" in data:
                            # Du lieu dashboard
                            current_data.update(data)
                            current_data["lastUpdate"] = time.time()
                            print(f"📊 Cập nhật: {data['availableSlots']}/{data['totalSlots']} chỗ trống")
                        
                        elif data.get("status") == "ready":
                            print("✓ Arduino đã sẵn sàng!")
                            
                    except json.JSONDecodeError:
                        print(f"⚠ JSON không hợp lệ: {line}")
                else:
                    if line:  # Log du lieu khac
                        print(f"Debug: {line}")
                        
        except Exception as e:
            print(f"✗ Lỗi đọc Serial: {e}")
            time.sleep(1)
        
        time.sleep(0.1)

class DashboardHandler(SimpleHTTPRequestHandler):
    """HTTP Request Handler cho Dashboard"""
    
    def do_GET(self):
        if self.path == '/api/data':
            # API: Lay du lieu hien tai
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(current_data).encode())
            
        elif self.path == '/api/history':
            # API: Lay lich su su kien
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(event_history).encode())
            
        elif self.path == '/':
            # Redirect ve index.html
            self.path = '/index.html'
            return SimpleHTTPRequestHandler.do_GET(self)
        else:
            # Serve static files
            return SimpleHTTPRequestHandler.do_GET(self)
    
    def log_message(self, format, *args):
        # Tat log HTTP (gon gang hon)
        pass

def run_http_server():
    """Chay HTTP Server"""
    # Chuyen den thu muc web_dashboard
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    server = HTTPServer(('0.0.0.0', HTTP_PORT), DashboardHandler)
    print(f"✓ Web Dashboard đang chạy tại: http://localhost:{HTTP_PORT}")
    print(f"✓ Mở trình duyệt và truy cập: http://localhost:{HTTP_PORT}")
    server.serve_forever()

def main():
    """Main function"""
    print("=" * 60)
    print("🚗 ARDUINO PARKING SYSTEM - WEB DASHBOARD")
    print("=" * 60)
    
    # Kiem tra thu muc
    if not os.path.exists('static'):
        os.makedirs('static/css', exist_ok=True)
        os.makedirs('static/js', exist_ok=True)
        print("✓ Đã tạo thư mục static/")
    
    # Ket noi Arduino
    if not connect_serial():
        print("\n⚠ Chạy ở chế độ DEMO (không có Arduino)")
        print("Dashboard vẫn hoạt động nhưng không có dữ liệu thực tế\n")
        # Khong dung Serial, chi chay HTTP server
    else:
        # Bat thread doc Serial
        serial_thread = Thread(target=read_serial, daemon=True)
        serial_thread.start()
    
    # Chay HTTP Server
    try:
        run_http_server()
    except KeyboardInterrupt:
        print("\n\n✓ Đã dừng server")
        if ser:
            ser.close()
        sys.exit(0)

if __name__ == '__main__':
    main()
