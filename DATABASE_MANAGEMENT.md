# راهنمای مدیریت دیتابیس (PostgreSQL)

پروژه از **PostgreSQL 18** داخل کانتینر `kiosk_db` استفاده می‌کند.
فایل‌های media (تصاویر محصولات و …) در volume جداگانه `backend_media` روی مسیر `/app/media` نگه داشته می‌شوند.

## فهرست

- [نوع دیتابیس](#نوع-دیتابیس)
- [بکاپ](#بکاپ)
- [بازگردانی](#بازگردانی)
- [دسترسی مستقیم](#دسترسی-مستقیم)
- [متغیرهای محیطی](#متغیرهای-محیطی)

---

## نوع دیتابیس

| مورد | مقدار |
|------|--------|
| موتور | PostgreSQL 18 (`postgres:18-alpine`) |
| کانتینر | `kiosk_db` |
| Volume داده | `postgres_data` |
| Media | volume `backend_media` → `/app/media` |

پورت `5432` فقط در `docker-compose.yml` توسعه روی هاست باز است. در پکیج production عمداً publish نمی‌شود.

---

## مهاجرت یک‌باره از SQLite به PostgreSQL (دو مرحله‌ای)

راهنمای کامل: [`docs/MIGRATE_SQLITE_TO_POSTGRES.md`](docs/MIGRATE_SQLITE_TO_POSTGRES.md)  
(در پکیج تحویل: `MIGRATE_SQLITE_TO_POSTGRES.md`)

### مرحله ۱ — خروجی گرفتن از SQLite داخل کانتینر

```bash
./export-sqlite-data.sh
# یا:
./export-sqlite-data.sh ./kiosk_backend/db.sqlite3
```

```cmd
export-sqlite-data.bat
export-sqlite-data.bat kiosk_backend\db.sqlite3
```

خروجی: `exports/kiosk_data_YYYYMMDD_HHMMSS.json`

### مرحله ۲ — وارد کردن به PostgreSQL

```bash
./import-data-to-postgres.sh ./exports/kiosk_data_YYYYMMDD_HHMMSS.json
```

```cmd
import-data-to-postgres.bat exports\kiosk_data_YYYYMMDD_HHMMSS.json
```

**نکته:** تصاویر داخل این JSON نیستند؛ volume `backend_media` را نگه دارید.

---

## بکاپ

بکاپ شامل **هم دیتابیس و هم تصاویر (media)** است.

### Linux / macOS

```bash
./backup-database.sh
```

خروجی: `backups/kiosk_backup_YYYYMMDD_HHMMSS.tar.gz`

محتوای آرشیو:

- `database.dump` — خروجی `pg_dump` با فرمت custom (`-Fc`)
- `media/` — کپی تصاویر و فایل‌های آپلودشده

### Windows

```cmd
backup-database.bat
```

خروجی: `backups\kiosk_backup_YYYYMMDD_HHMMSS.zip`

---

## بازگردانی

قبل از restore، یک بکاپ ایمنی از وضعیت فعلی گرفته می‌شود.

### Linux / macOS

```bash
./restore-database.sh ./backups/kiosk_backup_YYYYMMDD_HHMMSS.tar.gz
```

### Windows

```cmd
restore-database.bat backups\kiosk_backup_YYYYMMDD_HHMMSS.zip
```

سرویس‌های `backend` و `bale_bot` موقتاً متوقف می‌شوند، دیتابیس با `pg_restore` برمی‌گردد، media جایگزین می‌شود، سپس سرویس‌ها دوباره بالا می‌آیند.

---

## دسترسی مستقیم

### Linux / macOS

```bash
./access-database.sh
```

### Windows

```cmd
access-database.bat
```

این دستورها `psql` را داخل کانتینر `kiosk_db` باز می‌کنند.

دستورات مفید:

```text
\dt
\d+ products_product
SELECT COUNT(*) FROM products_product;
\q
```

یا بدون اسکریپت:

```bash
docker exec -it kiosk_db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

---

## متغیرهای محیطی

در `.env` (از روی `.env.example`):

```env
POSTGRES_DB=kiosk
POSTGRES_USER=kiosk
POSTGRES_PASSWORD=change-me-strong-password
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_CONN_MAX_AGE=60
```

در Docker Compose مقدار `POSTGRES_HOST` برای سرویس‌ها به `db` (یا در host-network به `127.0.0.1`) override می‌شود.

---

## دستورات Django مفید

```bash
docker exec -it kiosk_backend python manage.py showmigrations
docker exec -it kiosk_backend python manage.py migrate
docker exec -it kiosk_backend python manage.py dumpdata > backup_data.json
docker exec -it kiosk_backend python manage.py shell
```

---

## نکات امنیتی

1. رمز `POSTGRES_PASSWORD` را در production عوض کنید.
2. پورت 5432 را روی شبکه عمومی باز نکنید.
3. بکاپ‌ها را جایی امن نگه دارید (شامل تصاویر و داده سفارش‌ها هستند).
4. volume قدیمی SQLite (`backend_db`) دیگر استفاده نمی‌شود؛ در صورت تمایل بعد از مهاجرت می‌توانید حذفش کنید:

```bash
docker volume rm kiosk_backend_db
```
