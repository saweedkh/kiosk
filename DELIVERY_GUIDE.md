# راهنمای تحویل پکیج به مشتری

## 📦 محتویات پکیج تحویلی

پس از اجرای `create-delivery-package.bat` یا `create-delivery-package.sh`، یک فایل ZIP با نام `kiosk-app.zip` ایجاد می‌شود که شامل موارد زیر است:

```
kiosk-app.zip
├── docker-compose.yml              # فایل اصلی docker-compose (از production.yml کپی شده)
├── docker-compose.production.host-network.yml  # برای WSL2/Linux (اختیاری)
├── run.bat                         # اسکریپت راه‌اندازی
├── stop.bat                        # اسکریپت توقف
├── README.txt                      # راهنمای فارسی برای مشتری
├── NETWORK_ACCESS.md               # راهنمای دسترسی به POS و Printer
├── POS_BRIDGE.md                   # راهنمای بریج ویندوز + DLL
├── pos_bridge/                     # سرویس PosBridge + pna.pcpos.dll
└── images/                         # Docker Images
    ├── backend.tar                 # Image بک‌اند Django
    ├── frontend.tar                # Image فرانت‌اند Next.js
    └── nginx.tar                   # Image Nginx
```
## 🚀 مراحل ساخت پکیج

### 1. ساخت Docker Images

```bash
# Windows
build-images.bat

# Linux/Mac
./build-images.sh
```

این دستور:
- Docker Images را می‌سازد
- آنها را به صورت `.tar` در پوشه `images/` ذخیره می‌کند

### 2. ساخت پکیج نهایی

```bash
# Windows
create-delivery-package.bat

# Linux/Mac
./create-delivery-package.sh
```

این دستور:
- تمام فایل‌های لازم را کپی می‌کند
- یک فایل ZIP با نام `kiosk-app.zip` می‌سازد

## ✅ چک‌لیست قبل از تحویل

قبل از تحویل پکیج به مشتری، مطمئن شوید:

- [ ] Docker Images با موفقیت ساخته شده‌اند
- [ ] فایل‌های `.tar` در پوشه `images/` وجود دارند
- [ ] حجم فایل‌های `.tar` منطقی است (نباید 0 باشد)
- [ ] فایل `kiosk-app.zip` ایجاد شده است
- [ ] حجم ZIP فایل منطقی است (چند گیگابایت)
- [ ] فایل ZIP را Extract کرده و تست کنید که همه فایل‌ها موجود هستند

## 📋 فایل‌های تحویلی

### فایل‌های ضروری:

1. **docker-compose.yml** - تنظیمات Docker Compose
2. **run.bat** - اسکریپت راه‌اندازی
3. **stop.bat** - اسکریپت توقف
4. **README.txt** - راهنمای مشتری
5. **images/backend.tar** - Docker Image بک‌اند
6. **images/frontend.tar** - Docker Image فرانت‌اند
7. **images/nginx.tar** - Docker Image Nginx

### فایل‌های اختیاری (اما توصیه می‌شود):

8. **NETWORK_ACCESS.md** - راهنمای دسترسی به POS و Printer
9. **docker-compose.production.host-network.yml** - برای WSL2/Linux

## 🔍 تست پکیج قبل از تحویل

### تست 1: Extract و بررسی فایل‌ها

```bash
# Extract ZIP
# بررسی کنید که همه فایل‌ها موجود هستند
```

### تست 2: Load Images

```bash
# در یک سیستم تست (با Docker)
docker load -i images/backend.tar
docker load -i images/frontend.tar
docker load -i images/nginx.tar

# بررسی کنید که Images لود شده‌اند
docker images | grep kiosk
```

### تست 3: راه‌اندازی کامل

```bash
# در سیستم تست
# Extract ZIP
# اجرای run.bat
# بررسی http://localhost
```

## 📝 یادداشت برای مشتری

در فایل `README.txt` که به مشتری تحویل می‌دهید، این موارد ذکر شده است:

- پیش‌نیازها (Docker Desktop)
- مراحل نصب
- نحوه راه‌اندازی
- نحوه توقف
- راه‌اندازی مرورگر در حالت کیوسک
- مشکلات رایج و راه‌حل‌ها
- تنظیمات POS و Printer

## ⚠️ نکات مهم

1. **هیچ سورس کدی در پکیج نیست** - فقط Docker Images و اسکریپت‌ها
2. **حجم پکیج** ممکن است 2-5 GB باشد (بسته به Images)
3. **فقط برای Windows** - اما می‌تواند در WSL2 هم کار کند
4. **پورت 80** باید آزاد باشد

## 🔄 به‌روزرسانی پکیج

اگر نیاز به به‌روزرسانی دارید:

1. تغییرات را در سورس کد اعمال کنید
2. Images جدید بسازید: `build-images.bat` (فقط روی ریپوی توسعه)
3. پکیج جدید بسازید: `create-delivery-package.bat`
4. پکیج جدید را به مشتری تحویل دهید
5. به مشتری بگویید: `images\` را عوض کند → `update-images.bat`

روی ماشین مشتری `build-images.bat` / `rebuild-and-run.bat` وجود ندارد؛ به‌جای آن `update-images.bat` و در صورت نیاز `fix-docker-safe.bat` هست.

## 📞 پشتیبانی

اگر مشتری مشکلی داشت:

1. از او بخواهید `README.txt` را مطالعه کند
2. برای مشکلات POS/Printer، `NETWORK_ACCESS.md` را ببینید
3. لاگ‌های Docker را بررسی کنید: `docker logs kiosk_backend`

## ✨ خلاصه

**برای تحویل به مشتری:**
1. `build-images.bat` را اجرا کنید
2. `create-delivery-package.bat` را اجرا کنید
3. فایل `kiosk-app.zip` را به مشتری تحویل دهید
4. به مشتری بگویید `README.txt` را مطالعه کند

**مشتری باید:**
1. Docker Desktop را نصب کند
2. ZIP را Extract کند
3. `run.bat` را اجرا کند
4. `http://localhost` را باز کند

