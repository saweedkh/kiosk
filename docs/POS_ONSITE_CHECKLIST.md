# چک‌لیست راه‌اندازی پوز روی کیوسک

برای دفعهٔ بعد که به دستگاه دسترسی داری — مرحله‌به‌مرحله.  
**زمان تقریبی:** ۳۰–۴۵ دقیقه (اولین بار).

مرجع پروتکل و عیب‌یابی عمیق: [`POS_PROTOCOL_AND_TROUBLESHOOTING.md`](POS_PROTOCOL_AND_TROUBLESHOOTING.md)  
پیشنهاد معماری (فاز ۱ پکت / فاز ۲ بریج DLL): [`POS_RECOMMENDED_SOLUTION.md`](POS_RECOMMENDED_SOLUTION.md)  
نصب بریج ویندوز: [`POS_BRIDGE.md`](POS_BRIDGE.md)  
کلیدهای آمادهٔ `.env`: [`.env.pos.example`](../.env.pos.example)

---

## قبل از رفتن (از خانه / دفتر)

- [ ] IP پوز را از پشتیبانی/تنظیمات دستگاه یادداشت کن (مثلاً `192.168.x.x`)
- [ ] پورت معمولاً `1362` است
- [ ] بدانی کیوسک **Linux** است یا **Windows** + Docker
- [ ] بدانی روی **main** (تنظیمات `.env`) هستید یا برنچ **admin hardware** (`feature/pos-admin-hardware-settings`)

---

## فاز ۱ — آماده‌سازی محیط (۵ دقیقه)

### ۱.۱ استک بالا باشد

```bash
docker compose ps
# همه healthy: kiosk_backend, kiosk_db, kiosk_nginx, kiosk_frontend
```

### ۱.۲ فایل `.env` در ریشهٔ پروژه

مقادیر آماده در `.env.pos.example` است؛ IP را عوض کن و در `.env` ریشه کپی کن.

حداقل این مقادیر برای پوز واقعی:

```env
PAYMENT_GATEWAY_NAME=pos
POS_TCP_HOST=<IP-واقعی-پوز>
POS_TCP_PORT=1362
POS_TIMEOUT=30
POS_MESSAGE_FORMAT=pardakht_novin_official
POS_USE_SIMPLE_FORMAT=True
MOCK_PAYMENT_DELAY=3
MOCK_PAYMENT_SUCCESS=True
```

> **مهم:** اگر `PAYMENT_GATEWAY_NAME=mock` بماند، اپ **هیچ‌وقت** به پوز وصل نمی‌شود (فقط ~۳ ثانیه شبیه‌سازی).

بعد از تغییر `.env`:

```bash
docker compose up -d --force-recreate backend
```

### ۱.۳ اگر از پنل ادمین (برنچ hardware) استفاده می‌کنی

- حالت پرداخت: **ارسال به کارتخوان (پوز)** — نه mock، نه «ثبت مستقیم»
- IP / پورت / فرمت: **پرداخت نوین** + **فرمت ساده = روشن**
- **ذخیره** را بزن و backend را recreate کن

---

## فاز ۲ — تست خودکار (۱۰ دقیقه)

**نرم‌افزار شرکت پوز (PNA) را ببند** — خیلی از دستگاه‌ها فقط یک کلاینت TCP می‌پذیرند.

### Linux

```bash
chmod +x scripts/pos-preflight.sh
./scripts/pos-preflight.sh <IP-پوز> 1362
```

### Windows

```cmd
scripts\pos-preflight.bat <IP-پوز> 1362
```

### یا مستقیم داخل کانتینر

```bash
docker exec -it kiosk_backend python manage.py pos_preflight \
  --host <IP-پوز> --port 1362 \
  --save /app/logs/pos-preflight-last.txt
```

### جدول تفسیر نتیجه

| خروجی | معنی | اقدام |
|--------|------|--------|
| `Gateway: mock` | اپ به پوز وصل نمی‌شود | `.env` یا پنل → `pos` |
| `connect_ex FAIL` | TCP از **داخل Docker** به پوز نمی‌رسد | host-network یا IP/فایروال |
| `connect_ex OK` + `test_connection OK` | شبکه OK | برو فاز ۳ |
| پیش‌نمایش پیام بدون `RQ` و format=`dll_exact` | فرمت غلط | `pardakht_novin_official` + simple=True |
| `--send` → ۱–۲ دقیقه، پوز خاموش | همان باگ قبلی (فرمت) | فرمت را درست کن، دوباره send |

گزارش ذخیره می‌شود: `pos-preflight-*.txt` و داخل کانتینر `/app/logs/pos-preflight-last.txt`

---

## فاز ۳ — ارسال واقعی مبلغ (۵ دقیقه)

```bash
# Linux — فقط وقتی preflight TCP سبز بود
POS_SEND=1 ./scripts/pos-preflight.sh <IP-پوز> 1362

# یا
docker exec -it kiosk_backend python manage.py send_pos_payment 10000 \
  --host <IP-پوز> --port 1362
```

**انتظار:** مبلغ **۱۰٬۰۰۰ ریال** روی صفحهٔ پوز بیاید.

- اگر آمد → تنظیمات درست است
- اگر نیامد ولی لاگ `pos_data_sent` دیدی → **فرمت پیام** (فاز ۴)
- اگر ~۳ ثانیه تمام شد → هنوز **mock** فعال است

---

## فاز ۴ — اگر TCP OK ولی مبلغ نمی‌آید

این دقیقاً همان مشکلی بود که داشتی: connect + send در لاگ، ۱–۲ دقیقه انتظار، پوز خاموش.

1. در `.env` حتماً:
   ```env
   POS_MESSAGE_FORMAT=pardakht_novin_official
   POS_USE_SIMPLE_FORMAT=True
   ```
2. `docker compose up -d --force-recreate backend`
3. دوباره:
   ```bash
   docker exec kiosk_backend python manage.py pos_preflight --host <IP> --amount 10000
   ```
   در خروجی ASCII باید چیزی شبیه `0067RQ062PR00…` ببینی (طول + RQ + بدنه).
4. اگر باز نشد، یک‌بار با نرم‌افزار شرکت همان مبلغ را بفرست و از پشتیبانی/Wireshark بخواه فریم را بده — با `command_preview` در لاگ مقایسه کن.

---

## فاز ۵ — تست از UI کیوسک (۵ دقیقه)

1. یک محصول ارزان اضافه کن به سبد
2. پرداخت
3. **نباید** بعد از ~۳ ثانیه بدون پوز success شود
4. باید تا ~۲ دقیقه منتظر پوز بماند
5. مبلغ روی پوز = OK

---

## فاز ۶ — اگر Docker به LAN نمی‌رسد

Ping از Windows/Linux کیوسک OK است ولی `connect_ex` داخل کانتینر fail:

```bash
# Linux kiosk — host network
docker compose -f docker-compose.production.host-network.yml up -d
```

یا راهنمای `NETWORK_ACCESS.md`.

---

## لاگ‌های مهم (برای عیب‌یابی)

```bash
docker exec kiosk_backend grep -E "pos_|gateway_response|MockPayment" /app/logs/kiosk.log | tail -50
```

| Event | معنی |
|-------|------|
| `pos_connection_established` | TCP OK |
| `pos_data_sent` | بایت فرستاده شد (≠ پوز فهمید) |
| `pos_no_response_received` | ۱۲۰ ثانیه جواب نیامد → غالباً فرمت |
| `MockPaymentGateway` / ~۳s | هنوز mock |

---

## دستورات سریع (کپی روی کیوسک)

```bash
# 1) وضعیت
docker compose ps
docker exec kiosk_backend python manage.py show_pos_config

# 2) preflight
./scripts/pos-preflight.sh <IP-پوز> 1362

# 3) ارسال تست
docker exec -it kiosk_backend python manage.py send_pos_payment 10000 --host <IP-پوز> --port 1362

# 4) بعد از fix .env
docker compose up -d --force-recreate backend

# 5) جمع لاگ برای آوردن به دفتر
./scripts/pos-collect-logs.sh
```

---

## چیزهایی که حتماً یادداشت کن روی کیوسک

- IP پوز: `_______________`
- OS کیوسk: Linux / Windows
- برنچ/نسخه: main / feature hardware
- نتیجه preflight (TCP OK/FAIL): _______
- مبلغ روی پوز با send_pos_payment: بله / خیر
- اسکرین یا فایل `pos-preflight-*.txt` را برای ما بفرست
