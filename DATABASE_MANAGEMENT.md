# راهنمای مدیریت دیتابیس

این راهنما نحوه دسترسی مستقیم به دیتابیس SQLite و مدیریت بکاپ را توضیح می‌دهد.

## 📋 فهرست

- [نوع دیتابیس](#نوع-دیتابیس)
- [بکاپ دیتابیس](#بکاپ-دیتابیس)
- [بازگردانی بکاپ](#بازگردانی-بکاپ)
- [دسترسی مستقیم به دیتابیس](#دسترسی-مستقیم-به-دیتابیس)
- [ابزارهای پیشنهادی](#ابزارهای-پیشنهادی)

---

## نوع دیتابیس

پروژه از **SQLite** استفاده می‌کند:
- فایل دیتابیس: `kiosk_backend/db.sqlite3`
- در Docker: `/app/db.sqlite3` در کانتینر `kiosk_backend`

---

## بکاپ دیتابیس

### Linux/Mac

```bash
./backup-database.sh
```

این اسکریپت:
- ✅ دیتابیس را از Docker کپی می‌کند
- ✅ فایل را فشرده می‌کند (`.tar.gz`)
- ✅ در پوشه `backups/` ذخیره می‌کند
- ✅ نام فایل شامل timestamp است: `db_backup_YYYYMMDD_HHMMSS.tar.gz`

**مثال خروجی:**
```
=== بکاپ دیتابیس کیوسک ===

📦 در حال کپی دیتابیس از کانتینر...
✅ دیتابیس با موفقیت کپی شد: ./backups/db_backup_20260101_120000.sqlite3
🗜️  در حال فشرده‌سازی...
✅ فایل فشرده شده ایجاد شد: ./backups/db_backup_20260101_120000.tar.gz
📊 حجم فایل: 2.5M

✅ بکاپ با موفقیت انجام شد!
```

### Windows

```cmd
backup-database.bat
```

این اسکریپت مشابه نسخه Linux است اما فایل را به صورت `.zip` فشرده می‌کند.

---

## بازگردانی بکاپ

⚠️ **هشدار:** قبل از بازگردانی، یک بکاپ از دیتابیس فعلی گرفته می‌شود.

### Linux/Mac

```bash
./restore-database.sh ./backups/db_backup_20260101_120000.tar.gz
```

یا برای فایل SQLite مستقیم:
```bash
./restore-database.sh ./backups/db_backup_20260101_120000.sqlite3
```

### Windows

```cmd
restore-database.bat backups\db_backup_20260101_120000.zip
```

**نکات مهم:**
- قبل از بازگردانی، سرویس backend متوقف می‌شود
- بکاپ فعلی به صورت خودکار گرفته می‌شود
- پس از بازگردانی، سرویس دوباره راه‌اندازی می‌شود

---

## دسترسی مستقیم به دیتابیس

برای مشاهده و ویرایش مستقیم دیتابیس:

### Linux/Mac

```bash
./access-database.sh
```

این اسکریپت:
- دیتابیس را از Docker کپی می‌کند به `db_local.sqlite3`
- اگر `sqlite3` نصب باشد، CLI را باز می‌کند
- در غیر این صورت، راهنمای نصب ابزارها را نمایش می‌دهد

**دستورات مفید SQLite:**
```sql
.tables                    -- لیست همه جداول
.schema products_product    -- ساختار جدول
SELECT * FROM products_product LIMIT 10;  -- مشاهده داده‌ها
.quit                      -- خروج
```

### Windows

```cmd
access-database.bat
```

---

## ابزارهای پیشنهادی

### 1. DB Browser for SQLite (رایگان و ساده)

**دانلود:** https://sqlitebrowser.org/

**ویژگی‌ها:**
- رابط گرافیکی ساده
- مشاهده و ویرایش داده‌ها
- اجرای کوئری‌های SQL
- Export/Import داده

**استفاده:**
1. دانلود و نصب
2. باز کردن فایل `db_local.sqlite3` (بعد از اجرای `access-database.sh`)

### 2. VS Code Extension: SQLite Viewer

**نصب:**
```bash
code --install-extension alexcvzz.vscode-sqlite
```

**استفاده:**
- باز کردن فایل `.sqlite3` در VS Code
- مشاهده جداول و داده‌ها
- اجرای کوئری‌ها

### 3. SQLite CLI (خط فرمان)

**نصب:**

macOS:
```bash
brew install sqlite3
```

Ubuntu/Debian:
```bash
sudo apt-get install sqlite3
```

Windows:
```bash
choco install sqlite
```

**استفاده:**
```bash
sqlite3 db_local.sqlite3
```

---

## دستورات مفید Django

### مشاهده وضعیت Migrations

```bash
docker exec -it kiosk_backend python manage.py showmigrations
```

### اجرای Migrations

```bash
docker exec -it kiosk_backend python manage.py migrate
```

### ساخت Migrations جدید

```bash
docker exec -it kiosk_backend python manage.py makemigrations
```

### پشتیبان‌گیری با Django dumpdata

```bash
# Export همه داده‌ها به JSON
docker exec -it kiosk_backend python manage.py dumpdata > backup_data.json

# Export یک app خاص
docker exec -it kiosk_backend python manage.py dumpdata products > products_backup.json

# بازگردانی
docker exec -it kiosk_backend python manage.py loaddata backup_data.json
```

### دسترسی به Django Shell

```bash
docker exec -it kiosk_backend python manage.py shell
```

**مثال استفاده در Shell:**
```python
from apps.products.models import Product, Category

# مشاهده همه محصولات
products = Product.objects.all()
print(products.count())

# مشاهده یک محصول
product = Product.objects.get(id=1)
print(product.name)

# ایجاد یک دسته جدید
category = Category.objects.create(name="دسته جدید")
```

---

## نکات مهم

1. **همیشه قبل از تغییرات مهم بکاپ بگیرید**
2. **فایل‌های بکاپ را در جای امن نگه دارید**
3. **در Production، بکاپ‌های منظم (روزانه/هفتگی) بگیرید**
4. **قبل از بازگردانی، مطمئن شوید که سرویس متوقف است**
5. **فایل `db_local.sqlite3` را commit نکنید** (در `.gitignore` است)

---

## مثال سناریو کامل

### سناریو: بکاپ روزانه و بازگردانی

```bash
# 1. بکاپ روزانه
./backup-database.sh

# 2. مشاهده لیست بکاپ‌ها
ls -lh backups/

# 3. دسترسی به دیتابیس برای بررسی
./access-database.sh
# در SQLite CLI:
.tables
SELECT COUNT(*) FROM products_product;

# 4. در صورت نیاز به بازگردانی
./restore-database.sh ./backups/db_backup_20260101_120000.tar.gz
```

---

## عیب‌یابی

### مشکل: کانتینر در حال اجرا نیست

```bash
# راه‌اندازی کانتینر
docker-compose up -d

# بررسی وضعیت
docker ps
```

### مشکل: خطای دسترسی به فایل

```bash
# بررسی مجوزها
ls -l db_local.sqlite3

# تغییر مجوزها (در صورت نیاز)
chmod 644 db_local.sqlite3
```

### مشکل: دیتابیس قفل شده

```bash
# توقف سرویس
docker-compose stop backend

# بررسی فرآیندهای در حال استفاده
docker exec kiosk_backend lsof /app/db.sqlite3

# راه‌اندازی مجدد
docker-compose start backend
```

---

## پشتیبانی

برای مشکلات بیشتر، به مستندات Django و SQLite مراجعه کنید:
- Django: https://docs.djangoproject.com/
- SQLite: https://www.sqlite.org/docs.html

