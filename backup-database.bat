@echo off
REM اسکریپت بکاپ دیتابیس SQLite برای Windows
REM این اسکریپت دیتابیس را از Docker کانتینر کپی می‌کند و بکاپ می‌گیرد

setlocal enabledelayedexpansion

set CONTAINER_NAME=kiosk_backend
set DB_PATH=/app/db.sqlite3
set BACKUP_DIR=backups

REM ایجاد timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set BACKUP_FILE=%BACKUP_DIR%\db_backup_%TIMESTAMP%.sqlite3
set BACKUP_FILE_COMPRESSED=%BACKUP_DIR%\db_backup_%TIMESTAMP%.zip

echo === بکاپ دیتابیس کیوسک ===
echo.

REM بررسی وجود کانتینر
docker ps --format "{{.Names}}" | findstr /C:"%CONTAINER_NAME%" >nul
if errorlevel 1 (
    echo [خطا] کانتینر %CONTAINER_NAME% در حال اجرا نیست!
    echo لطفاً ابتدا با دستور زیر کانتینر را راه‌اندازی کنید:
    echo docker-compose up -d
    exit /b 1
)

REM ایجاد پوشه بکاپ
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo [در حال انجام] در حال کپی دیتابیس از کانتینر...
docker cp %CONTAINER_NAME%:%DB_PATH% %BACKUP_FILE%

if errorlevel 1 (
    echo [خطا] خطا در کپی دیتابیس!
    exit /b 1
)

echo [موفق] دیتابیس با موفقیت کپی شد: %BACKUP_FILE%

REM فشرده‌سازی با PowerShell
echo [در حال انجام] در حال فشرده‌سازی...
powershell -Command "Compress-Archive -Path '%BACKUP_FILE%' -DestinationPath '%BACKUP_FILE_COMPRESSED%' -Force"

if errorlevel 1 (
    echo [هشدار] فشرده‌سازی انجام نشد، فایل اصلی باقی ماند
) else (
    echo [موفق] فایل فشرده شده ایجاد شد: %BACKUP_FILE_COMPRESSED%
    del "%BACKUP_FILE%"
)

echo.
echo [موفق] بکاپ با موفقیت انجام شد!
echo [راهنما] برای بازگردانی بکاپ از دستور زیر استفاده کنید:
echo    restore-database.bat %BACKUP_FILE_COMPRESSED%

endlocal

