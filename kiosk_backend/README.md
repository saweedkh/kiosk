# پروژه کیوسک - سیستم فروشگاهی با پرداخت کارت‌خوان

سیستم مدیریت فروشگاه برای دستگاه‌های کیوسک با قابلیت اتصال به کارت‌خوان و مدیریت کامل محصولات، سفارشات و گزارش‌گیری.

## 📋 فهرست مطالب

- [ویژگی‌ها](#ویژگی‌ها)
- [تکنولوژی‌ها](#تکنولوژی‌ها)
- [نیازمندی‌ها](#نیازمندی‌ها)
- [نصب و راه‌اندازی](#نصب-و-راه‌اندازی)
- [ساختار پروژه](#ساختار-پروژه)
- [تنظیمات](#تنظیمات)
- [اجرای پروژه](#اجرای-پروژه)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Payment Gateway](#payment-gateway)
- [Receipt Printing](#receipt-printing)

---

## ویژگی‌ها

### برای دستگاه کیوسک
- ✅ نمایش منوی محصولات و دسته‌بندی‌ها
- ✅ مدیریت سبد خرید (افزودن، ویرایش، حذف)
- ✅ پرداخت از طریق کارت‌خوان (پشتیبانی از چندین Gateway)
- ✅ ثبت سفارش و تولید فاکتور (PDF + JSON)
- ✅ چاپ خودکار رسید روی پرینتر حرارتی
- ✅ دانلود فاکتور
- ✅ مدیریت Session برای هر کیوسک

### برای پنل ادمین
- ✅ مدیریت محصولات و دسته‌بندی‌ها
- ✅ مدیریت موجودی محصولات با تاریخچه تغییرات
- ✅ مشاهده و مدیریت سفارشات
- ✅ گزارش‌گیری کامل (فروش، تراکنش‌ها، محصولات، موجودی)
- ✅ مدیریت لاگ‌های سیستم و تراکنش‌ها
- ✅ تنظیمات Gateway پرداخت (از طریق Environment Variables)
- ✅ چاپ مجدد رسید برای سفارشات
- ✅ Export گزارش‌ها به Excel

### ویژگی‌های فنی
- ✅ Session-based Authentication برای کیوسک
- ✅ Django Session Authentication برای ادمین
- ✅ مدیریت موجودی با تاریخچه تغییرات
- ✅ لاگ کامل تمام تراکنش‌ها و عملیات (Console و File-based)
- ✅ تولید فاکتور PDF و JSON
- ✅ چاپ رسید با تصویرسازی دقیق (PIL/Pillow)
- ✅ معماری Layered (API, Service, Selector, Model)
- ✅ Modular API Structure
- ✅ Payment Gateway Adapter Pattern (پشتیبانی از چندین Gateway)
- ✅ کد بهینه و Refactored (Separation of Concerns)

---

## تکنولوژی‌ها

### Backend
- **Django 4.2.16**: Framework اصلی
- **Django REST Framework 3.15.2**: برای API
- **SQLite**: Database (فایل `db.sqlite3`)
- **ReportLab 4.2.5**: برای تولید PDF

### Payment Gateway
- **python-escpos**: برای چاپ رسید روی پرینتر حرارتی
- **pythonnet**: برای اتصال به DLL کارت‌خوان (اختیاری)
- **Pillow 10.4.0**: برای تولید تصویر رسید

### Tools
- **django-cors-headers 4.6.0**: برای CORS
- **django-filter 24.3**: برای Filtering
- **python-dotenv 1.0.1**: برای مدیریت Environment Variables
- **Pillow 10.4.0**: برای پردازش تصاویر
- **openpyxl**: برای Export به Excel

---

## نیازمندی‌ها

### نرم‌افزار
- Python 3.9+
- Virtual Environment (venv یا virtualenv)
- (اختیاری) Mono/.NET Runtime برای استفاده از DLL Gateway

### Python Packages
تمام پکیج‌های مورد نیاز در `requirements/` تعریف شده‌اند.

---

## نصب و راه‌اندازی

### پیش‌نیازها
- Python 3.9+
- Virtual Environment (venv یا virtualenv)

### مراحل راه‌اندازی

1. **Clone پروژه**
```bash
git clone https://github.com/saweedkh/kiosk_backend.git
cd kiosk_backend
```

2. **ایجاد Virtual Environment**
```bash
python3.9 -m venv venv
source venv/bin/activate  # Linux/Mac
# یا
venv\Scripts\activate  # Windows
```

3. **نصب Dependencies**
```bash
pip install -r requirements/base.txt
pip install -r requirements/development.txt
```

4. **تنظیم Environment Variables**

کپی کردن `.env.example` به `.env`:
```bash
cp .env.example .env
```

ویرایش `.env`:
```env
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Payment Gateway Settings
PAYMENT_GATEWAY_NAME=mock
PAYMENT_GATEWAY_ACTIVE=True
PAYMENT_GATEWAY_API_KEY=mock_api_key_123
PAYMENT_GATEWAY_API_SECRET=mock_api_secret_abc
PAYMENT_GATEWAY_MERCHANT_ID=mock_merchant_id_xyz
PAYMENT_GATEWAY_TERMINAL_ID=mock_terminal_id_789
PAYMENT_GATEWAY_CALLBACK_URL=http://localhost:8000/api/kiosk/payment/verify/

# POS Gateway Settings (برای کارت‌خوان واقعی)
POS_GATEWAY_NAME=pos  # استفاده از پروتکل مستقیم TCP/IP
POS_TCP_HOST=192.168.1.100
POS_TCP_PORT=1362
POS_CONNECTION_TYPE=tcp  # یا serial

# Printer Settings (برای چاپ رسید)
PRINTER_ENABLED=True
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100

# Store Settings
STORE_NAME=نانوایی ستاره سرخ
```

**نکته مهم**: پروژه از **SQLite** استفاده می‌کند و فایل دیتابیس به صورت خودکار در `db.sqlite3` ایجاد می‌شود. نیازی به تنظیمات Database نیست.

5. **اجرای Migrations**
```bash
python manage.py migrate
```

6. **ایجاد Superuser**
```bash
python manage.py createsuperuser
```

7. **جمع‌آوری Static Files**
```bash
python manage.py collectstatic --noinput
```

8. **اجرای پروژه**
```bash
python manage.py runserver
```

یا با Makefile:
```bash
make runserver
```

پروژه در `http://localhost:8000` اجرا می‌شود.

---

## ساختار پروژه

```
kiosk/
├── config/                 # Project Configuration
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   └── wsgi.py
│
├── apps/                   # Django Apps
│   ├── products/          # Products Module
│   │   ├── api/           # API Endpoints
│   │   ├── services/      # Business Logic
│   │   ├── selectors/     # Database Queries
│   │   └── models.py      # Data Models
│   │
│   ├── cart/              # Cart Module
│   │   ├── api/
│   │   └── services/
│   │
│   ├── orders/            # Orders Module
│   │   ├── api/
│   │   ├── services/
│   │   │   ├── order_service.py
│   │   │   ├── print_service.py      # چاپ رسید
│   │   │   ├── receipt_service.py    # تولید داده رسید
│   │   │   └── receipt_constants.py # ثوابت رسید
│   │   ├── selectors/
│   │   ├── management/commands/      # Management Commands
│   │   └── models.py
│   │
│   ├── payment/           # Payment Module
│   │   ├── api/
│   │   ├── gateway/       # Payment Gateways
│   │   │   ├── adapter.py              # Gateway Adapter
│   │   │   ├── base.py                 # Base Gateway
│   │   │   ├── mock.py                 # Mock Gateway
│   │   │   ├── pos.py                  # Direct Protocol Gateway
│   │   │   └── pos/                    # POS Gateway Implementation
│   │   ├── services/
│   │   └── models.py
│   │
│   ├── logs/              # Logs Module
│   │   ├── services/
│   │   │   └── log_service.py  # Structured Logging
│   │   └── models.py
│   │
│   ├── admin_panel/        # Admin Panel
│   │   ├── api/
│   │   ├── services/
│   │   └── selectors/
│   │
│   └── core/               # Core Utilities
│       ├── api/
│       ├── exceptions/
│       └── utils/
│
├── static/                 # Static Files
├── media/                  # Media Files
├── logs/                   # Application Logs
├── requirements/           # Python Dependencies
├── docs/                   # Documentation
└── tests/                  # Integration Tests
```

برای جزئیات بیشتر ساختار، به [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) مراجعه کنید.

---

## تنظیمات

### Database Settings
پروژه از **SQLite** استفاده می‌کند و فایل دیتابیس به صورت خودکار در `db.sqlite3` ایجاد می‌شود. نیازی به تنظیمات اضافی نیست.

### Payment Gateway

پروژه از **Adapter Pattern** برای پشتیبانی از چندین Gateway استفاده می‌کند:

#### 1. Mock Gateway (برای تست)
```env
PAYMENT_GATEWAY_NAME=mock
PAYMENT_GATEWAY_ACTIVE=True
```

#### 2. POS Gateway (کارت‌خوان واقعی)

استفاده از پروتکل مستقیم TCP/IP (Cross-platform):
```env
POS_GATEWAY_NAME=pos
POS_TCP_HOST=192.168.1.100
POS_TCP_PORT=1362
POS_CONNECTION_TYPE=tcp
```

**نکات مهم:**
- DLL Gateway نیاز به `pythonnet` و Mono/.NET Runtime دارد
- پروتکل مستقیم روی همه سیستم‌عامل‌ها کار می‌کند
- اگر DLL در دسترس نباشد، به صورت خودکار به پروتکل مستقیم fallback می‌کند

### Printer Settings (چاپ رسید)

```env
PRINTER_ENABLED=True
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
STORE_NAME=نام فروشگاه شما
```

**نکات:**
- پرینتر باید از پروتکل ESC/POS پشتیبانی کند
- معمولاً پرینترهای حرارتی 80mm یا 120mm
- IP و Port را مطابق تنظیمات پرینتر خود تنظیم کنید

---

## اجرای پروژه

### Development Mode
```bash
python manage.py runserver
```

پروژه در `http://localhost:8000` اجرا می‌شود.

### API Documentation
مستندات کامل API در فایل [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) موجود است.

### Admin Panel
```
http://localhost:8000/admin/
```

---

## API Documentation

مستندات کامل API در [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) موجود است.

### Base URLs
- **Kiosk APIs**: `/api/kiosk/`
- **Admin APIs**: `/api/kiosk/admin-panel/`

### مثال استفاده

#### دریافت لیست محصولات
```bash
curl http://localhost:8000/api/kiosk/products/
```

#### افزودن محصول به سبد
```bash
curl -X POST http://localhost:8000/api/kiosk/cart-items/ \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "quantity": 2}'
```

#### ایجاد سفارش
```bash
curl -X POST http://localhost:8000/api/kiosk/orders/orders/create/ \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"product_id": 1, "quantity": 2},
      {"product_id": 2, "quantity": 1}
    ]
  }'
```

---

## Payment Gateway

پروژه از **Adapter Pattern** برای مدیریت Gateway های مختلف استفاده می‌کند.

### Gateway های پشتیبانی شده

1. **Mock Gateway** (`mock.py`)
   - برای تست و توسعه
   - بدون نیاز به سخت‌افزار

2. **POS Direct Protocol Gateway** (`pos.py`)
   - پیاده‌سازی مستقیم پروتکل کارت‌خوان
   - Cross-platform (Windows, Linux, Mac)
   - بدون نیاز به DLL
   - اتصال مستقیم TCP/IP به دستگاه POS

### ساختار Gateway

```
payment/gateway/
├── base.py                    # BasePaymentGateway (Abstract)
├── adapter.py                 # PaymentGatewayAdapter
├── mock.py                    # Mock Gateway
├── pos.py                     # Direct Protocol Gateway
└── pos/                       # POS Gateway Implementation
    ├── gateway.py            # Main POS Gateway
    ├── connection.py          # TCP/IP Connection
    ├── message_builder.py     # Message Builder
    ├── communication.py       # Communication Handler
    ├── response_parser.py     # Response Parser
    └── payment_operations.py  # Payment Operations
```

### استفاده از Gateway

```python
from apps.payment.gateway.adapter import PaymentGatewayAdapter

# دریافت Gateway
gateway = PaymentGatewayAdapter.get_gateway()

# تست اتصال
result = gateway.test_connection()

# شروع پرداخت
result = gateway.initiate_payment(
    amount=50000,
    order_details={
        'order_number': 'ORD-001',
        'customer_name': 'مشتری'
    }
)
```

### Fallback Mechanism

اگر DLL Gateway در دسترس نباشد، به صورت خودکار به Direct Protocol Gateway fallback می‌کند.

---

## Receipt Printing

سیستم چاپ رسید با استفاده از `python-escpos` و `Pillow` برای تولید تصویر دقیق رسید.

### ویژگی‌ها

- ✅ تولید تصویر رسید با طراحی دقیق
- ✅ چاپ خودکار بعد از ثبت سفارش
- ✅ پشتیبانی از پرینترهای حرارتی 80mm و 120mm
- ✅ نمایش تاریخ و ساعت (با timezone تهران)
- ✅ شماره رسید روزانه
- ✅ جدول محصولات با ترازبندی دقیق
- ✅ چاپ مجدد رسید از پنل ادمین

### Management Commands

#### تست چاپ
```bash
python manage.py test_printer
```

#### تولید تصویر رسید (بدون چاپ)
```bash
python manage.py test_receipt_image
```

### API

#### چاپ مجدد رسید (فقط برای ادمین)
```bash
POST /api/kiosk/admin-panel/orders/receipt/reprint/
{
  "order_id": 123
}
```

### تنظیمات

در فایل `.env`:
```env
PRINTER_ENABLED=True
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
STORE_NAME=نام فروشگاه شما
```

### ساختار کد

```
orders/services/
├── print_service.py       # چاپ رسید
├── receipt_service.py     # تولید داده رسید
└── receipt_constants.py   # ثوابت طراحی
```

---

## Testing

### اجرای تمام Tests
```bash
python manage.py test
```

### اجرای Tests یک App خاص
```bash
python manage.py test apps.products
```

### اجرای یک Test خاص
```bash
python manage.py test apps.products.tests.test_models.TestProductModel
```

### با Coverage
```bash
coverage run --source='.' manage.py test
coverage report
coverage html
```

### تست Payment Gateway
```bash
# تست Mock Gateway
python manage.py test_payment_gateway --gateway mock

# تست POS Gateway
python manage.py test_payment_gateway --gateway pos
```

### تست Printer
```bash
python manage.py test_printer
```

---

## Deployment

### Production Settings

1. تغییر `DEBUG = False` در `config/settings/production.py`
2. تنظیم `ALLOWED_HOSTS`
3. تنظیم `SECRET_KEY` در `.env`
4. تنظیم Static Files و Media Files
5. تنظیم SSL Certificate

### با Gunicorn
```bash
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

### با Nginx
مثال Configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /static/ {
        alias /path/to/static/;
    }

    location /media/ {
        alias /path/to/media/;
    }
}
```

### با Supervisor
مثال Configuration:
```ini
[program:kiosk]
command=/path/to/venv/bin/gunicorn config.wsgi:application --bind 127.0.0.1:8000
directory=/path/to/kiosk
user=www-data
autostart=true
autorestart=true
```

---

## نقشه راه پیاده‌سازی

برای مشاهده نقشه راه کامل پیاده‌سازی، به [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) مراجعه کنید.

---

## Troubleshooting

### مشکل Database
- فایل `db.sqlite3` باید در root پروژه ایجاد شود
- اگر مشکلی دارید، فایل را حذف کنید و دوباره `migrate` را اجرا کنید:
```bash
rm db.sqlite3
python manage.py migrate
```

### مشکل Static Files
```bash
python manage.py collectstatic --noinput
```

### مشکل Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### مشکل Payment Gateway
- بررسی کنید Gateway در `.env` درست تنظیم شده باشد
- برای DLL Gateway، بررسی کنید `pythonnet` نصب باشد
- برای POS Gateway، بررسی کنید IP و Port درست باشد
- لاگ‌ها را در `logs/` بررسی کنید

### مشکل Printer
- بررسی کنید پرینتر روشن و به شبکه متصل باشد
- بررسی کنید IP و Port در `.env` درست باشد
- تست کنید با `python manage.py test_printer`
- بررسی کنید پرینتر از پروتکل ESC/POS پشتیبانی کند

---

## Contributing

1. Fork پروژه از [GitHub Repository](https://github.com/saweedkh/kiosk_backend)
2. Clone پروژه Fork شده
3. ایجاد Branch (`git checkout -b feature/AmazingFeature`)
4. Commit تغییرات (`git commit -m 'Add some AmazingFeature'`)
5. Push به Branch (`git push origin feature/AmazingFeature`)
6. ایجاد Pull Request در GitHub

---

## License

این پروژه تحت مجوز MIT منتشر شده است.

---

## Support

برای پشتیبانی و سوالات:
- ایجاد Issue در [GitHub Repository](https://github.com/saweedkh/kiosk_backend)
- تماس با تیم توسعه

---

## Changelog

### Version 2.0.0 (Latest)
- ✅ پیاده‌سازی سیستم چاپ رسید (Receipt Printing)
- ✅ بهینه‌سازی و Refactoring کد Payment Gateway
- ✅ جداسازی DLL Gateway به کلاس‌های Helper (Connection Manager, Response Parser, Response Waiter)
- ✅ بهبود مدیریت موجودی با تاریخچه تغییرات
- ✅ API چاپ مجدد رسید برای ادمین
- ✅ بهبود Error Handling و Logging
- ✅ پشتیبانی از Timezone تهران برای تاریخ و ساعت
- ✅ Management Commands برای تست Printer و Gateway

### Version 1.0.0
- ✅ پیاده‌سازی کامل سیستم
- ✅ Products Module
- ✅ Cart Module
- ✅ Orders Module
- ✅ Payment Module (Mock Gateway)
- ✅ Logs Module (Console و File-based)
- ✅ Admin Panel
- ✅ Modular API Structure
- ✅ Layered Architecture

---

**موفق باشید! 🚀**
