@echo off
echo ============================================================
echo     ARDUINO PARKING SYSTEM - KHOI DONG SERVER
echo ============================================================
echo.

REM Kiem tra Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [!] Python chua duoc cai dat!
    echo Vui long cai Python tu: https://python.org
    pause
    exit /b 1
)

REM Cai pyserial neu chua co
echo [*] Kiem tra pyserial...
pip show pyserial >nul 2>&1
if errorlevel 1 (
    echo [*] Dang cai pyserial...
    pip install pyserial
)

REM Chay server
echo.
echo [*] Khoi dong server...
echo.
python server.py

pause
