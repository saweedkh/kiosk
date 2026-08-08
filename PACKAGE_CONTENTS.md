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
├── run.bat / stop.bat / setup-startup.bat
├── images/
│   ├── backend.tar
│   ├── frontend.tar
│   └── nginx.tar
├── backup-database.bat / restore-database.bat / access-database.bat
├── export-sqlite-data.bat / import-data-to-postgres.bat
├── migrate-sqlite-to-postgres.bat
├── fix-docker-safe.bat / fix-docker-io-error.bat
├── README.txt
├── OPERATIONS.md
├── MIGRATE_SQLITE_TO_POSTGRES.md
├── DATABASE_MANAGEMENT.md
├── TROUBLESHOOTING.md
├── NETWORK_ACCESS.md
└── PACKAGE_CONTENTS.md                     # همین فایل
```

## چه چیزهایی داخل ZIP نیست (عمدی)

- سورس‌کد Python / Next.js
- Dockerfileها
- `rebuild-and-run.bat` / `build-images.bat` (فقط روی ریپوی توسعه معنی دارند)
- `.env` واقعی ماشین توسعه‌دهنده

## سرویس‌هایی که با `run.bat` بالا می‌آیند

| سرویس | کانتینر | منبع image |
|--------|----------|------------|
| db | `kiosk_db` | `postgres:18-alpine` (یک‌بار pull از اینترنت) |
| backend | `kiosk_backend` | `images/backend.tar` |
| frontend | `kiosk_frontend` | `images/frontend.tar` |
| nginx | `kiosk_nginx` | `images/nginx.tar` |
| bale_bot | `kiosk_bale_bot` | همان backend image |

## قبل از اولین اجرا

1. `.env` را باز کنید
2. حداقل این‌ها را عوض کنید:
   - `SECRET_KEY`
   - `POSTGRES_PASSWORD`
3. در صورت نیاز: POS / Printer / `BALE_BOT_TOKEN` / `STORE_NAME`
4. `run.bat`

## مهاجرت از SQLite قدیمی

`MIGRATE_SQLITE_TO_POSTGRES.md` را بخوانید:

1. `export-sqlite-data.bat`
2. `run.bat`
3. `import-data-to-postgres.bat exports\....json`

## راهنمای کامل عملیات

`OPERATIONS.md`
