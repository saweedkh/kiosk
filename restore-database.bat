@echo off
REM اسکریپت بازگردانی بکاپ دیتابیس SQLite برای Windows
REM استفاده: restore-database.bat <path-to-backup-file>

setlocal enabledelayedexpansion

set CONTAINER_NAME=kiosk_backend
set DB_PATH=/app/db.sqlite3

echo === بازگردانی بکاپ دیتابیس کیوسک ===
echo.

REM بررسی آرگومان
if "%~1"=="" (
    echo [خطا] لطفاً مسیر فایل بکاپ را مشخص کنید!
    echo استفاده: %0 ^<path-to-backup-file^>
    echo مثال: %0 backups\db_backup_20260101_120000.zip
    exit /b 1
)

set BACKUP_FILE=%~1

REM بررسی وجود فایل بکاپ
if not exist "%BACKUP_FILE%" (
    echo [خطا] فایل بکاپ یافت نشد: %BACKUP_FILE%
    exit /b 1
)

REM بررسی وجود کانتینر
docker ps --format "{{.Names}}" | findstr /C:"%CONTAINER_NAME%" >nul
if errorlevel 1 (
    echo [خطا] کانتینر %CONTAINER_NAME% در حال اجرا نیست!
    echo لطفاً ابتدا با دستور زیر کانتینر را راه‌اندازی کنید:
    echo docker-compose up -d
    exit /b 1
)

REM بکاپ از دیتابیس فعلی
echo [در حال انجام] در حال گرفتن بکاپ از دیتابیس فعلی...
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set BACKUP_BEFORE_RESTORE=backups\db_backup_before_restore_%TIMESTAMP%.sqlite3
if not exist backups mkdir backups
docker cp %CONTAINER_NAME%:%DB_PATH% %BACKUP_BEFORE_RESTORE% 2>nul

REM استخراج فایل اگر فشرده است
set EXTRACTED_DB=
set TEMP_DIR=%TEMP%\kiosk_restore_%RANDOM%

if "%BACKUP_FILE:~-7%"==".sqlite3" (
    set EXTRACTED_DB=%BACKUP_FILE%
) else (
    echo [در حال انجام] در حال استخراج فایل فشرده...
    if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"
    
    if "%BACKUP_FILE:~-7%"==".tar.gz" (
        REM نیاز به tar یا 7zip
        echo [خطا] برای استخراج .tar.gz نیاز به tar یا 7zip دارید
        echo لطفاً فایل را به صورت دستی استخراج کنید
        exit /b 1
    ) else if "%BACKUP_FILE:~-4%"==".zip" (
        powershell -Command "Expand-Archive -Path '%BACKUP_FILE%' -DestinationPath '%TEMP_DIR%' -Force"
        for /r "%TEMP_DIR%" %%f in (*.sqlite3) do set EXTRACTED_DB=%%f
    )
)

if "%EXTRACTED_DB%"=="" (
    echo [خطا] فایل دیتابیس در بکاپ یافت نشد!
    if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
    exit /b 1
)

REM توقف سرویس
echo [در حال انجام] در حال توقف سرویس...
docker-compose stop backend 2>nul
timeout /t 2 /nobreak >nul

REM کپی فایل بکاپ به کانتینر
echo [در حال انجام] در حال بازگردانی دیتابیس...
docker cp "%EXTRACTED_DB%" %CONTAINER_NAME%:%DB_PATH%

REM راه‌اندازی مجدد سرویس
echo [در حال انجام] در حال راه‌اندازی مجدد سرویس...
docker-compose start backend 2>nul
if errorlevel 1 docker-compose up -d backend

REM پاکسازی
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"

echo.
echo [موفق] دیتابیس با موفقیت بازگردانی شد!
if exist "%BACKUP_BEFORE_RESTORE%" (
    echo [اطلاعات] بکاپ قبلی در این مسیر ذخیره شد: %BACKUP_BEFORE_RESTORE%
)

endlocal

