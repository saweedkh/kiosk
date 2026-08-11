# Kiosk Project - Monorepo

پروژه کیوسک با معماری Monorepo شامل Backend (Django)، Frontend (Next.js) و تنظیمات Docker.

## 📁 ساختار پروژه

```
kiosk/
├── kiosk_backend/          # Django Backend (Git repo جدا)
├── kiosk_frontend/         # Next.js Frontend (Git repo جدا)
├── nginx/                  # تنظیمات Nginx
├── docker-compose.yml      # Docker Compose (Development)
├── docker-compose.production.yml  # Docker Compose (Production)
├── docker-compose.production.host-network.yml  # Docker Compose (WSL2/Linux)
├── build-images.*          # اسکریپت‌های ساخت Docker Images
├── create-delivery-package.*  # اسکریپت‌های ساخت پکیج تحویلی
├── run.bat                 # اسکریپت راه‌اندازی برای مشتری
├── stop.bat                # اسکریپت توقف
└── README.txt              # راهنمای مشتری
```

## 🚀 شروع سریع

### برای توسعه‌دهنده:

```bash
# راه‌اندازی Development
docker-compose up -d

# ساخت Images برای Production
./build-images.sh  # یا build-images.bat در Windows

# ساخت پکیج تحویلی
./create-delivery-package.sh  # یا create-delivery-package.bat
```

### برای مشتری:

1. Extract کردن `kiosk-app.zip`
2. اجرای `run.bat`
3. باز کردن `http://localhost`

## 📚 مستندات

- `DEPLOYMENT.md` - راهنمای کامل استقرار
- `DELIVERY_GUIDE.md` - راهنمای تحویل به مشتری
- `QUICK_START.md` - راهنمای سریع
- `NETWORK_ACCESS.md` - راهنمای دسترسی به POS و Printer
- `docs/POS_ONSITE_CHECKLIST.md` - چک‌لیست راه‌اندازی پوز روی کیوسک
- `docs/POS_PROTOCOL_AND_TROUBLESHOOTING.md` - پروتکل TCP پوز و عیب‌یابی «مبلغ نمی‌آید»
- `docs/POS_RECOMMENDED_SOLUTION.md` - پیشنهاد معماری پوز (پکت در مقابل بریج DLL)
- `DOCKER_COMPOSE_EXPLANATION.md` - توضیح فایل‌های Docker Compose
- `GIT_SETUP.md` - راهنمای راه‌اندازی Git

## 🔧 پیش‌نیازها

- Docker Desktop
- Git (برای توسعه)

## 📝 نکات مهم

- Backend و Frontend در Git repo های جدا هستند
- این repo شامل تنظیمات Docker و اسکریپت‌های deployment است
- برای جزئیات Git setup، `GIT_SETUP.md` را ببینید

## 📞 پشتیبانی

برای مشکلات و سوالات، مستندات را مطالعه کنید.

