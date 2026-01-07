# راهنمای استقرار و تحویل پروژه کیوسک

این سند راهنمای کامل برای ساخت و تحویل پکیج نهایی به مشتری است.

## ساختار پروژه

```
kiosk/
├── kiosk_backend/          # Django Backend
├── kiosk_frontend/         # Next.js Frontend
├── nginx/                  # Nginx Configuration
├── docker-compose.yml      # برای توسعه
├── docker-compose.production.yml  # برای Production
├── build-images.sh/.bat    # ساخت Docker Images
├── create-delivery-package.sh/.bat  # ساخت پکیج نهایی
├── run.bat                 # اسکریپت راه‌اندازی برای مشتری
├── stop.bat                # اسکریپت توقف برای مشتری
└── README.txt              # راهنمای مشتری
```

## فرآیند ساخت پکیج تحویلی

### مرحله 1: ساخت Docker Images

**روی سیستم توسعه‌دهنده:**

```bash
# Linux/Mac
./build-images.sh

# Windows
build-images.bat
```

این اسکریپت:
- Docker Images را می‌سازد
- آنها را به صورت `.tar` ذخیره می‌کند
- فایل‌ها در پوشه `images/` قرار می‌گیرند

### مرحله 2: ساخت پکیج نهایی

```bash
# Linux/Mac
./create-delivery-package.sh

# Windows
create-delivery-package.bat
```

این اسکریپت:
- تمام فایل‌های لازم را کپی می‌کند
- یک فایل ZIP با نام `kiosk-app.zip` می‌سازد
- **هیچ سورس کدی در پکیج نیست**

### محتویات پکیج تحویلی

```
kiosk-app.zip
├── docker-compose.yml
├── run.bat
├── stop.bat
├── README.txt
└── images/
    ├── backend.tar
    ├── frontend.tar
    └── nginx.tar
```

## تست محلی

قبل از تحویل، می‌توانید روی سیستم خود تست کنید:

```bash
# ساخت Images
./build-images.sh

# بارگذاری Images (شبیه‌سازی محیط مشتری)
docker load -i images/backend.tar
docker load -i images/frontend.tar
docker load -i images/nginx.tar

# راه‌اندازی با docker-compose.production.yml
docker-compose -f docker-compose.production.yml up -d

# تست
curl http://localhost/health
```

## نکات مهم

1. **هیچ سورس کدی در پکیج نیست** - فقط Docker Images و اسکریپت‌های راه‌اندازی
2. **پورت 80** باید آزاد باشد
3. **Docker Desktop** باید روی سیستم مشتری نصب باشد
4. **حجم پکیج** ممکن است بزرگ باشد (چند گیگابایت) - به دلیل Docker Images
5. **دسترسی به POS و Printer**: کانتینر به شبکه محلی دسترسی دارد (برای جزئیات بیشتر `NETWORK_ACCESS.md` را ببینید)

## تنظیمات Production

### Backend (Django)
- `DEBUG = False`
- `ALLOWED_HOSTS = ["*"]`
- استفاده از Gunicorn با 3 Worker
- Static files در زمان Build جمع‌آوری می‌شوند
- Media files در Docker Volume نگهداری می‌شوند

### Frontend (Next.js)
- Build با `npm run build`
- اجرا با `npm start` (standalone mode)
- API Base URL: `/api` (relative path)

### Nginx
- Reverse Proxy برای `/api` به Backend
- Serve Static و Media files
- تنها پورت باز: 80

### دسترسی به شبکه (POS و Printer)
- کانتینر Backend به شبکه محلی دسترسی دارد
- از `extra_hosts` برای دسترسی به دستگاه‌های شبکه استفاده می‌شود
- برای WSL2/Linux می‌توان از `network_mode: host` استفاده کرد
- جزئیات بیشتر در `NETWORK_ACCESS.md`

## عیب‌یابی

### مشکل: Images لود نمی‌شوند
- مطمئن شوید فایل‌های `.tar` در پوشه `images/` هستند
- حجم فایل‌ها را بررسی کنید (نباید 0 باشد)

### مشکل: پورت 80 در حال استفاده است
- برنامه‌های دیگر را ببندید
- یا پورت را در `docker-compose.production.yml` تغییر دهید

### مشکل: Backend راه‌اندازی نمی‌شود
- لاگ‌ها را بررسی کنید: `docker logs kiosk_backend`
- مطمئن شوید Database Volume درست mount شده است

## به‌روزرسانی

برای به‌روزرسانی:
1. تغییرات را در سورس کد اعمال کنید
2. Images جدید بسازید: `./build-images.sh`
3. پکیج جدید بسازید: `./create-delivery-package.sh`
4. پکیج جدید را به مشتری تحویل دهید

## امنیت

- هیچ سورس کدی در پکیج نیست
- فقط روی localhost اجرا می‌شود
- پورت‌های داخلی در دسترس نیستند
- SSL در این نسخه پشتیبانی نمی‌شود (برای محیط لوکال)

