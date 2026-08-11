# محتویات پکیج تحویل `kiosk-app.zip`
#
# این فایل داخل ZIP هم کپی می‌شود تا روی سرور مشتری مشخص باشد چه چیزی دارید.

## ساختار کلی

```
kiosk-app/
├── docker-compose.yml                      # استک production (Postgres + app)
├── docker-compose.production.host-network.yml  # اختیاری (WSL2/Linux host network)
├── .env                                    # تنظیمات — قبل از اجرا ویرایش کنید
├── .env.example                            # همان قالب (مرجع)
├── run.bat / stop.bat / exit-kiosk.bat / setup-startup.bat
├── update-images.bat                       # آپدیت ایمیج از images\*.tar جدید
├── images/
│   ├── backend.tar                         # شامل سرویس bale_bot هم هست
│   ├── frontend.tar
│   ├── nginx.tar
│   └── postgres.tar                        # آفلاین — بدون pull از اینترنت
├── pos_bridge/                             # بریج ویندوز + DLL رسمی پوز
│   ├── app.py / dll_client.py / run.bat
│   ├── start_background.bat / stop_bridge.bat   # used by run.bat / stop.bat
│   ├── .env.example
│   ├── pna.pcpos.dll                       # DLL رسمی PNA
│   └── POS_BRIDGE.md                       # راهنمای نصب بریج
├── backup-database.bat / restore-database.bat / access-database.bat
├── export-sqlite-data.bat / import-data-to-postgres.bat
├── migrate-sqlite-to-postgres.bat
├── fix-docker-safe.bat / fix-docker-io-error.bat
├── README.txt
├── OPERATIONS.md
├── POS_BRIDGE.md                           # همان راهنمای بریج (ریشه ZIP)
├── MIGRATE_SQLITE_TO_POSTGRES.md
├── DATABASE_MANAGEMENT.md
├── TROUBLESHOOTING.md
├── NETWORK_ACCESS.md
└── PACKAGE_CONTENTS.md                     # همین فایل
```

## چه چیزهایی داخل ZIP نیست (عمدی)

- سورس‌کد Python / Next.js کامل
- Dockerfileها
- `rebuild-and-run.bat` / `build-images.bat` (فقط روی ریپوی توسعه معنی دارند)
- `.env` واقعی ماشین توسعه‌دهنده

## به‌روزرسانی ایمیج روی سرور مشتری

1. پوشه `images\` را با فایل‌های `.tar` جدید عوض کنید (یا ZIP جدید را Extract کنید؛ `.env` را نگه دارید)
2. `update-images.bat` را اجرا کنید
3. در صورت خطای I/O داکر: `fix-docker-safe.bat` سپس `run.bat`

`run.bat` به‌تنهایی ایمیج‌های موجود را دوباره لود نمی‌کند.

## سرویس‌هایی که با `run.bat` بالا می‌آیند

| سرویس | کانتینر | منبع image |
|--------|----------|------------|
| db | `kiosk_db` | `images/postgres.tar` (`postgres:18-alpine`) |
| backend | `kiosk_backend` | `images/backend.tar` |
| frontend | `kiosk_frontend` | `images/frontend.tar` |
| nginx | `kiosk_nginx` | `images/nginx.tar` |
| bale_bot | `kiosk_bale_bot` | همان `images/backend.tar` (ایمیج جدا نیست) |

**PosBridge** با `run.bat` خودکار بالا می‌آید (`pos_bridge\start_background.bat`) و با `stop.bat` متوقف می‌شود.

## قبل از اولین اجرا

1. `.env` را باز کنید
2. حداقل این‌ها را عوض کنید:
   - `SECRET_KEY`
   - `POSTGRES_PASSWORD`
   - `POS_TCP_HOST` (آی‌پی کارتخوان)
3. یک‌بار **Python 3.11 32-bit** روی ویندوز نصب کنید (برای DLL)
4. `run.bat` — Docker + PosBridge + Chrome

پیش‌فرض delivery: `PAYMENT_GATEWAY_NAME=bridge` و `POS_USE_BRIDGE=True`.

### پوز با DLL رسمی

- معمولاً کار اضافه‌ای لازم نیست؛ `run.bat` بریج را استارت می‌کند
- سلامت: `http://127.0.0.1:9000/health`
- جزئیات: `POS_BRIDGE.md`

## مهاجرت از SQLite قدیمی

`MIGRATE_SQLITE_TO_POSTGRES.md` را بخوانید:

1. `export-sqlite-data.bat`
2. `run.bat`
3. `import-data-to-postgres.bat exports\....json`

## راهنمای کامل عملیات

`OPERATIONS.md`
