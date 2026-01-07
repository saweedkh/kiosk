# راهنمای راه‌اندازی Git برای Monorepo

## 🎯 هدف

این پوشه اصلی (monorepo) شامل:
- `kiosk_backend/` - که خودش یک Git repo جدا دارد
- `kiosk_frontend/` - که خودش یک Git repo جدا دارد
- فایل‌های Docker و اسکریپت‌های deployment

## 📋 دو راه برای مدیریت

### راه 1: Git Submodules (توصیه می‌شود) ✅

**مزایا:**
- Backend و Frontend در repo های جدا باقی می‌مانند
- می‌توانید تغییرات را در repo های اصلی track کنید
- مدیریت بهتر برای تیم‌های بزرگ

**معایب:**
- کمی پیچیده‌تر است
- نیاز به `git submodule update` دارد

### راه 2: کپی مستقیم (ساده‌تر) ✅

**مزایا:**
- ساده‌تر است
- همه چیز در یک repo است
- نیازی به submodule نیست

**معایب:**
- Backend و Frontend در این repo commit می‌شوند
- اگر backend/frontend را در repo اصلی تغییر دهید، باید اینجا هم update کنید

---

## 🚀 راه 1: استفاده از Git Submodules

### مرحله 1: ایجاد Git Repo در پوشه اصلی

```bash
# در پوشه اصلی (kiosk/)
cd /Users/saweedkh/Documents/code/kiosk

# ایجاد Git repo
git init

# اضافه کردن remote (اگر می‌خواهید push کنید)
git remote add origin <YOUR_REPO_URL>
```

### مرحله 2: اضافه کردن Backend و Frontend به عنوان Submodule

```bash
# اگر backend و frontend در repo های جدا هستند
git submodule add <BACKEND_REPO_URL> kiosk_backend
git submodule add <FRONTEND_REPO_URL> kiosk_frontend

# یا اگر قبلاً کپی کرده‌اید
git submodule add <BACKEND_REPO_URL> kiosk_backend
git submodule add <FRONTEND_REPO_URL> kiosk_frontend
```

### مرحله 3: Commit کردن

```bash
# اضافه کردن فایل‌های Docker و اسکریپت‌ها
git add docker-compose.yml
git add docker-compose.production.yml
git add docker-compose.production.host-network.yml
git add nginx/
git add *.bat
git add *.sh
git add *.md
git add .gitignore

# Commit
git commit -m "Initial commit: Docker setup and deployment scripts"

# Push
git push -u origin main
```

### استفاده از Submodules

```bash
# Clone کردن repo اصلی با submodules
git clone --recurse-submodules <REPO_URL>

# یا اگر قبلاً clone کرده‌اید
git submodule update --init --recursive

# Update کردن submodules به آخرین نسخه
git submodule update --remote
```

---

## 🚀 راه 2: کپی مستقیم (ساده‌تر)

### مرحله 1: ایجاد Git Repo

```bash
# در پوشه اصلی
cd /Users/saweedkh/Documents/code/kiosk

# ایجاد Git repo
git init

# اضافه کردن remote
git remote add origin <YOUR_REPO_URL>
```

### مرحله 2: اضافه کردن همه فایل‌ها

```bash
# اضافه کردن همه فایل‌ها (به جز مواردی که در .gitignore هستند)
git add .

# Commit
git commit -m "Initial commit: Complete kiosk project with Docker setup"

# Push
git push -u origin main
```

### نکته مهم:

اگر backend یا frontend را در repo اصلی تغییر دهید، باید اینجا هم update کنید:

```bash
# اگر backend را در repo اصلی تغییر دادید
cd kiosk_backend
git pull origin main
cd ..

# Commit تغییرات
git add kiosk_backend
git commit -m "Update backend"
```

---

## 📁 ساختار پیشنهادی برای .gitignore

فایل `.gitignore` قبلاً تنظیم شده است و شامل:

- ✅ فایل‌های build و cache
- ✅ node_modules و venv
- ✅ فایل‌های محیطی (.env)
- ✅ فایل‌های Docker images
- ✅ فایل‌های delivery package

---

## 🔄 Workflow پیشنهادی

### اگر از Submodules استفاده می‌کنید:

```bash
# 1. تغییرات در backend
cd kiosk_backend
# ... تغییرات ...
git add .
git commit -m "Update backend"
git push

# 2. Update کردن submodule در monorepo
cd ..
git add kiosk_backend
git commit -m "Update backend submodule"
git push
```

### اگر از کپی مستقیم استفاده می‌کنید:

```bash
# 1. تغییرات در backend (در repo اصلی)
cd kiosk_backend
git pull origin main

# 2. Commit در monorepo
cd ..
git add kiosk_backend
git commit -m "Update backend from main repo"
git push
```

---

## 📝 فایل‌هایی که باید Commit شوند

### ✅ باید Commit شوند:

- `docker-compose*.yml` - همه فایل‌های docker-compose
- `nginx/` - تنظیمات Nginx
- `*.bat`, `*.sh` - اسکریپت‌های build و deployment
- `*.md` - مستندات
- `.gitignore` - تنظیمات Git
- `kiosk_backend/Dockerfile` - Dockerfile بک‌اند
- `kiosk_backend/entrypoint.sh` - اسکریپت entrypoint
- `kiosk_frontend/Dockerfile` - Dockerfile فرانت‌اند
- `kiosk_backend/.dockerignore` - Docker ignore
- `kiosk_frontend/.dockerignore` - Docker ignore

### ❌ نباید Commit شوند:

- `images/` - Docker images (فایل‌های .tar)
- `delivery-package/` - پکیج تحویلی
- `*.zip` - فایل‌های ZIP
- `node_modules/` - Dependencies Node.js
- `venv/` - Virtual environment Python
- `.env` - فایل‌های محیطی
- `db.sqlite3` - Database
- `media/` - فایل‌های media
- `staticfiles/` - Static files
- `__pycache__/` - Python cache
- `.next/` - Next.js build

---

## 🎯 توصیه

**برای پروژه شما، توصیه می‌کنم از راه 2 (کپی مستقیم) استفاده کنید** چون:

1. ✅ ساده‌تر است
2. ✅ همه چیز در یک جا است
3. ✅ برای تیم کوچک مناسب است
4. ✅ Docker setup و deployment scripts با backend/frontend در یک repo هستند

**اما اگر:**
- تیم بزرگ دارید
- Backend و Frontend توسط تیم‌های جدا توسعه داده می‌شوند
- می‌خواهید version control دقیق‌تری داشته باشید

**از راه 1 (Submodules) استفاده کنید.**

---

## ✅ خلاصه

1. **راه 1 (Submodules):** Backend/Frontend در repo های جدا + این repo به عنوان monorepo
2. **راه 2 (کپی مستقیم):** همه چیز در یک repo

هر دو راه درست هستند، انتخاب بستگی به نیاز شما دارد! 🎯

