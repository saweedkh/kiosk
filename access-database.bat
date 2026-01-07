@echo off
REM اسکریپت دسترسی مستقیم به دیتابیس SQLite برای Windows
REM این اسکریپت دیتابیس را از Docker کپی می‌کند و دسترسی مستقیم می‌دهد

setlocal enabledelayedexpansion

set CONTAINER_NAME=kiosk_backend
set DB_PATH=/app/db.sqlite3
set LOCAL_DB=db_local.sqlite3

echo === دسترسی مستقیم به دیتابیس کیوسک ===
echo.

REM بررسی وجود کانتینر
docker ps --format "{{.Names}}" | findstr /C:"%CONTAINER_NAME%" >nul
if errorlevel 1 (
    echo [خطا] کانتینر %CONTAINER_NAME% در حال اجرا نیست!
    echo لطفاً ابتدا با دستور زیر کانتینر را راه‌اندازی کنید:
    echo docker-compose up -d
    exit /b 1
)

REM کپی دیتابیس به سیستم محلی
echo [در حال انجام] در حال کپی دیتابیس از کانتینر...
docker cp %CONTAINER_NAME%:%DB_PATH% %LOCAL_DB%

if errorlevel 1 (
    echo [خطا] خطا در کپی دیتابیس!
    exit /b 1
)

echo [موفق] دیتابیس با موفقیت کپی شد: %LOCAL_DB%
echo.

REM بررسی وجود sqlite3
where sqlite3 >nul 2>&1
if errorlevel 1 (
    echo [اطلاعات] sqlite3 نصب نیست. می‌توانید از ابزارهای زیر استفاده کنید:
    echo.
    echo 1. DB Browser for SQLite (رایگان):
    echo    https://sqlitebrowser.org/
    echo.
    echo 2. VS Code Extension: SQLite Viewer
    echo.
    echo 3. نصب sqlite3:
    echo    choco install sqlite
    echo    یا دانلود از: https://www.sqlite.org/download.html
    echo.
    echo [موفق] فایل دیتابیس آماده است: %LOCAL_DB%
) else (
    echo [اطلاعات] دستورات مفید SQLite:
    echo    .tables              - لیست جداول
    echo    .schema ^<table^>      - ساختار جدول
    echo    .dump ^<table^>        - خروجی SQL جدول
    echo    .quit                - خروج
    echo.
    echo [در حال انجام] در حال باز کردن SQLite CLI...
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo.
    sqlite3 %LOCAL_DB%
)

endlocal

