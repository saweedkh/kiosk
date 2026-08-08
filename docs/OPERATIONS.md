# راهنمای کامل کیوسک (عملیات، دیتابیس، مهاجرت، اسکریپت‌ها)

این سند مرجع کامل برای نصب، اجرا، دیتابیس PostgreSQL، مهاجرت از SQLite، بکاپ، و اسکریپت‌های ویندوز است.

اسناد مکمل:

| فایل | موضوع |
|------|--------|
| `PACKAGE_CONTENTS.md` | فهرست دقیق فایل‌های داخل ZIP پروداکشن |
| `README.txt` | نصب سریع روی ماشین مشتری |
| `DATABASE_MANAGEMENT.md` | بکاپ / ریستور روزمره |
| `docs/MIGRATE_SQLITE_TO_POSTGRES.md` | جزئیات مهاجرت SQLite → Postgres |
| `docs/BALE_BOT.md` | ربات بله |
| `TROUBLESHOOTING.md` | رفع اشکال Docker |
| `NETWORK_ACCESS.md` | POS / پرینتر در شبکه |

---

## ۱. معماری اجرا (Production)

```
                    ┌─────────────┐
  مرورگر / کیوسک ──►│   nginx     │ :80
                    └──────┬──────┘
               ┌───────────┼───────────┐
               ▼           ▼           ▼
          frontend     backend     (static/media)
                           │
                           ▼
                      ┌─────────┐
                      │  db     │  PostgreSQL 18
                      │kiosk_db │  volume: postgres_data
                      └─────────┘
                           ▲
                           │
                      bale_bot (همان DB + media)
```

| سرویس | کانتینر | نقش |
|--------|----------|------|
| `db` | `kiosk_db` | PostgreSQL 18 (`postgres:18-alpine`) |
| `backend` | `kiosk_backend` | Django / Gunicorn + API |
| `frontend` | `kiosk_frontend` | Next.js |
| `nginx` | `kiosk_nginx` | پروکسی پورت 80 |
| `bale_bot` | `kiosk_bale_bot` | polling ربات بله |

### Volumeها

| Volume | محتوا |
|--------|--------|
| `postgres_data` | کل دیتابیس Postgres |
| `backend_media` | تصاویر محصولات و فایل‌های آپلود |
| `backend_logs` | لاگ‌های backend (production) |

**دیگر از SQLite / volume به نام `backend_db` استفاده نمی‌شود.**

---

## ۲. فایل‌های مهم در پکیج تحویل

بعد از `create-delivery-package.bat` داخل ZIP تقریباً این‌ها هست:

```
kiosk-app/
  docker-compose.yml          ← از production کپی شده
  run.bat / stop.bat
  setup-startup.bat
  .env / .env.example
  images/
    backend.tar
    frontend.tar
    nginx.tar
  backup-database.bat
  restore-database.bat
  access-database.bat
  export-sqlite-data.bat
  import-data-to-postgres.bat
  migrate-sqlite-to-postgres.bat
  fix-docker-safe.bat
  README.txt
  DATABASE_MANAGEMENT.md
  MIGRATE_SQLITE_TO_POSTGRES.md
  ...
```

Image اپلیکیشن از فایل `.tar` لود می‌شود. Image دیتابیس (`postgres:18-alpine`) را `run.bat` در صورت نبود، از Docker Hub pull می‌کند (اینترنت لازم است یک‌بار).

---

## ۳. نصب روی سرور ویندوز (مشتری)

1. Docker Desktop را نصب و اجرا کنید.
2. Chrome را نصب کنید.
3. ZIP را Extract کنید.
4. فایل `.env` را ویرایش کنید (حداقل `POSTGRES_PASSWORD`).
5. `run.bat` را اجرا کنید.
6. برنامه روی `http://localhost` باز می‌شود (حالت Kiosk).

### توقف

```cmd
stop.bat
```

### استارت خودکار با روشن شدن ویندوز

```cmd
setup-startup.bat   (Run as Administrator)
```

حذف تسک:

```cmd
schtasks /delete /tn "KioskApp" /f
```

### تغییر `.env`

بعد از ویرایش `.env` نیازی به بیلد دوباره نیست:

```cmd
docker compose restart backend bale_bot
```

یا مطمئن‌تر:

```cmd
docker compose up -d --force-recreate backend bale_bot
```

`DEBUG` و `ALLOWED_HOSTS` در compose برای production override می‌شوند (`DEBUG=False`, `ALLOWED_HOSTS=*`). برای تغییر آن‌ها باید `docker-compose.yml` را ویرایش کنید.

---

## ۴. متغیرهای دیتابیس در `.env`

```env
POSTGRES_DB=kiosk
POSTGRES_USER=kiosk
POSTGRES_PASSWORD=change-me-strong-password
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_CONN_MAX_AGE=60
```

نکات امنیتی:

- رمز را روی هر ماشین عوض کنید.
- در production پورت `5432` روی هاست publish نمی‌شود (فقط شبکه داخلی Docker).
- فایل‌های بکاپ و export را مثل اطلاعات محرمانه نگه دارید.

---

## ۵. رفتار `run.bat` (مهم)

`run.bat` **دیگر** هر بار imageها را پاک و از نو load نمی‌کند.

| وضعیت | کار run.bat |
|--------|-------------|
| Imageهای `kiosk-*` موجودند | فقط `docker compose up -d` |
| Image نیستند | از `images\*.tar` یک‌بار load می‌کند |
| `postgres:18-alpine` نیست | `docker pull` |
| `.env` نیست | از `.env.example` کپی می‌کند |

همیشه از پوشه خودش اجرا می‌شود (`cd` به مسیر اسکریپت) تا Task Scheduler مسیر را خراب نکند.

---

## ۶. مهاجرت از SQLite به PostgreSQL

اگر قبلاً با `db.sqlite3` کار می‌کردید و نمی‌خواهید داده از بین برود:

### مرحله ۱ — Export (خروجی JSON)

از کانتینر قدیمی / فایل SQLite:

```cmd
export-sqlite-data.bat
```

یا:

```cmd
export-sqlite-data.bat kiosk_backend\db.sqlite3
```

خروجی نمونه:

```text
exports\kiosk_data_20260808_193000.json
```

این فایل را نگه دارید.

### مرحله ۲ — Import (بعد از بالا آمدن Postgres)

```cmd
run.bat
import-data-to-postgres.bat exports\kiosk_data_20260808_193000.json
```

به‌صورت پیش‌فرض داده فعلی Postgres خالی و بعد JSON لود می‌شود.

### تصاویر

داخل JSON نیستند. volume `backend_media` را نگه دارید یا از بکاپ media استفاده کنید.

جزئیات بیشتر: `MIGRATE_SQLITE_TO_POSTGRES.md` / `docs/MIGRATE_SQLITE_TO_POSTGRES.md`

---

## ۷. بکاپ و بازگردانی (بعد از مهاجرت — روزمره)

بکاپ شامل **PostgreSQL + پوشه media (تصاویر)** است.

### بکاپ

```cmd
backup-database.bat
```

خروجی:

```text
backups\kiosk_backup_YYYYMMDD_HHMMSS.zip
```

محتوا:

- `database.dump` — خروجی `pg_dump` (فرمت custom)
- `media/` — تصاویر

### بازگردانی

```cmd
restore-database.bat backups\kiosk_backup_YYYYMMDD_HHMMSS.zip
```

قبل از restore یک بکاپ ایمنی می‌گیرد، backend/bot را موقتاً متوقف می‌کند، DB و media را برمی‌گرداند.

### دسترسی SQL

```cmd
access-database.bat
```

داخل `psql` کانتینر `kiosk_db`:

```text
\dt
\d+ products_product
SELECT COUNT(*) FROM products_product;
\q
```

---

## ۸. فهرست اسکریپت‌ها

### مشتری / پروداکشن (داخل ZIP)

| اسکریپت | کار |
|---------|-----|
| `run.bat` | استارت روزمره + Chrome Kiosk |
| `stop.bat` | توقف استک |
| `setup-startup.bat` | استارت با boot ویندوز |
| `backup-database.bat` | بکاپ DB + media |
| `restore-database.bat` | ریستور بکاپ |
| `access-database.bat` | شل `psql` |
| `export-sqlite-data.bat` | خروجی داده از SQLite |
| `import-data-to-postgres.bat` | ورود JSON به Postgres |
| `migrate-sqlite-to-postgres.bat` | یک‌مرحله‌ای (همان ماشین) |
| `fix-docker-safe.bat` | رفع I/O با حفظ volumeها |
| `fix-docker-io-error.bat` | پاک‌سازی تهاجمی — فقط اضطراری |

### توسعه (ریپوی سورس — نه ZIP مشتری)

| اسکریپت | کار |
|---------|-----|
| `build-images.bat` | بیلد image و export به `images\*.tar` |
| `create-delivery-package.bat` | ساخت `kiosk-app.zip` |
| `rebuild-and-run.bat` | بیلد کامل + run (نیاز به سورس) |
| `rebuild-backend-only.bat` | بیلد فقط backend از سورس |
| `docker-compose.yml` | توسعه (build از Dockerfile + Postgres) |

---

## ۹. ساخت پکیج تحویل (روی ماشین توسعه)

```cmd
create-delivery-package.bat
```

کارها:

1. بیلد imageهای backend / frontend / nginx  
2. ذخیره در `images\*.tar`  
3. کپی compose production، اسکریپت‌ها، داکیومنت، `.env.example`  
4. ساخت `kiosk-app.zip`

**نکته:** `.env` واقعی توسعه‌دهنده داخل ZIP نمی‌رود؛ فقط از `.env.example` یک `.env` پیش‌فرض ساخته می‌شود.

---

## ۱۰. دستورات مفید Docker

```cmd
docker compose ps
docker compose logs -f backend
docker compose logs -f db
docker compose restart backend
docker compose up -d --force-recreate backend bale_bot
docker exec -it kiosk_backend python manage.py migrate
docker exec -it kiosk_backend python manage.py createsuperuser
docker volume ls
```

لاگ‌های یک سرویس:

```cmd
docker logs kiosk_backend --tail 100
docker logs kiosk_db --tail 100
```

---

## ۱۱. مشکلات رایج

### `run.bat` می‌گوید tar پیدا نشد

- پوشه `images` کنار `run.bat` باشد.
- اسکریپت را از همان پوشه Extract‌شده اجرا کنید (نه از مسیر اشتباه).
- `run.bat` خودش `cd` به مسیر فایل می‌کند؛ اگر فایل‌ها کامل Extract نشده‌اند ZIP را دوباره باز کنید.

### دیتابیس ارور می‌دهد / backend بالا نمی‌آید

1. `docker compose ps` → `kiosk_db` باید healthy باشد.  
2. `docker logs kiosk_db` و `docker logs kiosk_backend`  
3. `POSTGRES_PASSWORD` و بقیه `POSTGRES_*` در `.env`  
4. صبر برای اولین migrate (entrypoint)

### بعد از ری‌استارت داده نیست

- داده در volume `postgres_data` است، نه داخل image.  
- `docker compose down -v` volume را پاک می‌کند — استفاده نکنید مگر عمدی.  
- `docker compose down` alone معمولاً volume را نگه می‌دارد.

### تصاویر محصولات نیستند

- جدا از DB هستند (`backend_media`).  
- از بکاپ شامل `media/` ریستور کنید یا volume را نگه دارید.

### POS / پرینتر وصل نمی‌شود

- IP/Port در `.env`  
- همان شبکه LAN  
- فایروال ویندوز  
- جزئیات: `NETWORK_ACCESS.md`

### Docker I/O error

1. ترجیحاً `fix-docker-safe.bat`  
2. Restart Docker Desktop  
3. `run.bat` (در صورت نیاز imageها را از `.tar` دوباره load می‌کند)  
4. از `fix-docker-io-error.bat` فقط در حالت بحرانی استفاده کنید

### `export_sqlite_data` / دستور ناشناخته

Image بک‌اند قدیمی است. باید image جدید (دارای management commandهای مهاجرت) لود شده باشد.

---

## ۱۲. چک‌لیست cutover (از SQLite به Postgres روی سرور)

- [ ] `export-sqlite-data.bat` → فایل JSON ذخیره شد  
- [ ] در صورت امکان از media هم کپی/بکاپ گرفته شد  
- [ ] پکیج جدید Extract شد  
- [ ] `.env` با `POSTGRES_PASSWORD` قوی تنظیم شد  
- [ ] `run.bat` موفق بود (`kiosk_db` healthy)  
- [ ] `import-data-to-postgres.bat exports\....json`  
- [ ] ورود ادمین / لیست محصولات / تصاویر چک شد  
- [ ] `backup-database.bat` یک بکاپ اولیه گرفته شد  
- [ ] در صورت نیاز `setup-startup.bat` ست شد  

---

## ۱۳. تفاوت توسعه و production

| مورد | توسعه (`docker-compose.yml`) | Production (پکیج / `docker-compose.production.yml`) |
|------|------------------------------|------------------------------------------------------|
| ساخت image | `build` از Dockerfile | `image` آماده از `.tar` |
| سورس کد | bind mount `./kiosk_backend` | داخل image |
| Postgres | سرویس `db` + پورت 5432 روی هاست (برای ابزار) | سرویس `db` بدون publish پورت |
| لاگ | معمولاً در کانتینر | volume `backend_logs` |

---

## ۱۴. خلاصه یک‌خطی

- **استارت روزمره:** `run.bat`  
- **بکاپ:** `backup-database.bat`  
- **مهاجرت SQLite:** `export-sqlite-data.bat` → `import-data-to-postgres.bat`  
- **داده پایدار:** volumeهای `postgres_data` و `backend_media`  
- **تغییر تنظیمات:** ویرایش `.env` + restart سرویس‌ها (بدون بیلد)

اگر چیزی در این سند با رفتار واقعی اسکریپت‌ها فرق داشت، اسکریپت‌های داخل همان نسخه پکیج را منبع حقیقت بدانید.
