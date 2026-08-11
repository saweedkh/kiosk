# PosBridge — بریج ویندوز + DLL رسمی PNA

مسیر **فاز ۲** از [`POS_RECOMMENDED_SOLUTION.md`](POS_RECOMMENDED_SOLUTION.md):  
لینوکس دیگر پکت `PR`/`AM` نمی‌سازد؛ **همان DLL شرکت** (`pna.pcpos.dll`) روی ویندوز تراکنش را می‌زند.

کد سرویس: [`pos_bridge/`](../pos_bridge/)  
گیت‌وی Django: `kiosk_backend/apps/payment/gateway/bridge.py`

---

## معماری

```text
[کیوسک UI / Next]
        │
        ▼
[Docker Linux: Django]
  PAYMENT_GATEWAY_NAME=bridge
  POST http://POS_BRIDGE_HOST:9000/pay
  { "amount": 10000, "order_number": "K-…" }
        │
        ▼
[ویندوز — همان PC کیوسک یا مینی‌پی‌سی روی LAN]
  pos_bridge (Flask + pythonnet + waitress)
    → Load pna.pcpos.dll
    → Intek.PcPosLibrary.PCPOS
         ConnectionType = LAN
         Ip / Port / Amount
         TestConnection()
         send_transaction()   ← async؛ جواب با رویداد GetResponse
        │
        ▼
[پوز TCP :1362]
```

---

## API واقعی DLL (از دی‌کامپایل `pna.pcpos.dll`)

| عضو | نقش |
|-----|-----|
| `Intek.PcPosLibrary.PCPOS` | کلاس اصلی |
| `ConnectionType` | `LAN = 0` / `SERIAL = 1` |
| `Ip` (string), `Port` (int) | آدرس پوز |
| `Amount` (string) | مبلغ به **ریال** |
| `PaymentID`, `BIllID` | اختیاری |
| `TestConnection() → bool` | تست LAN |
| `send_transaction()` | ساخت پکت رسمی + `sendToLan` (ترد خواندن پاسخ) |
| رویداد `GetResponse(string response)` | پاسخ خام |
| `Response.RawResponse` / `GetParsedResp` / `GetPANID` / `GetTrxnRRN` | پارس |

**نکته:** DLL از نوع **PE32 / .NET Framework** است → روی ویندوز ترجیحاً **Python 3.11 32-bit**.

---

## پیش‌نیازها

1. یک ماشین **ویندوز** همیشه روشن روی همان LAN پوز (یا همان کیوسک با Docker Desktop).
2. فایل `pna.pcpos.dll` (همین ریپو: `kiosk_backend/pna.pcpos.dll` یا نسخهٔ رسمی شرکت).
3. نرم‌افزار شرکت PNA روی آن ماشین **بسته** باشد (یک session TCP به پوز).
4. پوز روشن، IP درست (مثلاً `192.168.1.100:1362`).
5. از ویندوز به پوز `ping` و پورت 1362 باز باشد.

---

## نصب PosBridge روی ویندوز (قدم‌به‌قدم)

### ۱) کپی پوشه

کل پوشهٔ `pos_bridge/` را روی ویندوز کپی کن (مثلاً `C:\kiosk\pos_bridge\`).  
در پکیج تحویل (`kiosk-app.zip`) همین پوشه از قبل هست و `pna.pcpos.dll` داخلش قرار دارد.

اگر از ریپوی توسعه کار می‌کنی، DLL را بگذار در مسیر قابل دسترس، مثلاً:

`C:\kiosk\kiosk_backend\pna.pcpos.dll`  
یا داخل `pos_bridge\` (پیشنهادی برای ZIP) و در `.env` مسیرش را بنویس — خالی بگذار تا خودکار `pos_bridge\pna.pcpos.dll` پیدا شود.

### ۲) Python 32-bit

از python.org نسخهٔ **Windows installer (32-bit)** پایتون 3.11 را نصب کن.  
تیک *Add to PATH* را بزن.

چک:

```bat
py -3.11-32 -c "import struct; print(struct.calcsize('P')*8)"
```

باید `32` چاپ شود.

### ۳) تنظیم `.env`

```bat
cd C:\kiosk\pos_bridge
copy .env.example .env
notepad .env
```

حداقل:

```env
BRIDGE_HOST=0.0.0.0
BRIDGE_PORT=9000
POS_DLL_PATH=C:\kiosk\kiosk_backend\pna.pcpos.dll
POS_IP=192.168.1.100
POS_PORT=1362
POS_TIMEOUT_SECONDS=120
BRIDGE_TOKEN=
```

`BRIDGE_TOKEN` را در پروداکشن پر کن و همان را در `.env` Django هم بگذار.

### ۴) اجرا با کل استک

روی پکیج تحویل کافی است:

```bat
run.bat
```

این دستور Docker را بالا می‌آورد **و** `pos_bridge\start_background.bat` را صدا می‌زند.  
`stop.bat` هر دو را می‌بندد.

اجرای دستی فقط بریج (دیباگ):

```bat
cd pos_bridge
run.bat
```

### ۵) تست محلی روی ویندوز

```bat
test_health.bat
```

یا:

```bat
curl http://127.0.0.1:9000/health
curl -X POST http://127.0.0.1:9000/pay -H "Content-Type: application/json" -d "{\"amount\":10000,\"order_number\":\"TEST-1\"}"
```

مبلغ باید روی پوز بیاید. کارت بکش یا لغو کن.

### ۶) سرویس دائمی (اختیاری ولی توصیه‌شده)

1. [NSSM](https://nssm.cc/download) را دانلود و `nssm.exe` را کنار `pos_bridge` بگذار.
2. `install_service_nssm.bat` را **Run as Administrator** اجرا کن.
3. سرویس `KioskPosBridge` با boot ویندوز بالا می‌آید.

فایروال ویندوز: فقط IP کیوسک/Docker host به پورت `9000` TCP اجازه بده.

---

## تنظیم Django / Docker

در `.env` ریشهٔ پروژه (همان فایلی که compose می‌خواند):

```env
PAYMENT_GATEWAY_NAME=bridge
POS_USE_BRIDGE=True

# Docker Desktop روی همان ویندوز:
POS_BRIDGE_HOST=host.docker.internal
POS_BRIDGE_PORT=9000
POS_BRIDGE_TOKEN=
POS_BRIDGE_TIMEOUT=130
```

اگر بک‌اند روی لینوکس است و بریج روی PC ویندوز جدا:

```env
POS_BRIDGE_HOST=192.168.1.50
```

(آی‌پی همان ویندوزی که PosBridge روش است — نه IP پوز.)

سپس:

```bash
docker compose up -d --force-recreate backend
# یا production:
docker compose -f docker-compose.production.yml up -d --force-recreate backend
```

چک از داخل کانتینر:

```bash
docker compose exec backend python -c "
from apps.payment.gateway.adapter import PaymentGatewayAdapter
g = PaymentGatewayAdapter.get_gateway()
print(type(g).__name__, g.test_connection())
"
```

باید `BridgePaymentGateway` و `success: True` ببینی.

سفارش واقعی از UI یا:

```bash
docker compose exec backend python manage.py send_pos_payment 10000
```

(اگر `send_pos_payment` هنوز فقط `pos` را force می‌کند، از UI تست کن یا gateway را از adapter بگیر.)

---

## قرارداد HTTP بریج

### `GET /health`

DLL لود + `TestConnection`.  
`200` = OK، `503` = پوز/DLL مشکل.

### `POST /pay`

درخواست:

```json
{
  "amount": 10000,
  "order_number": "K-000123",
  "payment_id": "",
  "bill_id": ""
}
```

پاسخ موفق:

```json
{
  "success": true,
  "status": "success",
  "response_code": "00",
  "response_message": "تراکنش موفق",
  "reference_number": "…",
  "card_number": "****1234",
  "transaction_id": "…",
  "raw": "…",
  "parsed": "…"
}
```

هدر اختیاری: `X-Pos-Bridge-Token: <BRIDGE_TOKEN>`

Timeout سمت Django: **حداقل ۱۳۰ ثانیه** (`POS_BRIDGE_TIMEOUT`).

---

## عیب‌یابی

| علامت | کار |
|--------|-----|
| `pythonnet` / DLL load fail | Python **32-bit**؛ مسیر DLL؛ .NET Framework 4.x روی ویندوز |
| health: TestConnection false | IP/پورت پوز؛ فایروال؛ نرم‌افزار شرکت را ببند |
| Django: Bridge unreachable | `POS_BRIDGE_HOST`؛ از داخل کانتینر `curl` به `:9000`؛ روی لینوکس Docker از IP ویندوز استفاده کن نه `host.docker.internal` |
| مبلغ نیامد ولی health OK | لاگ `pos_bridge`؛ `raw` پاسخ؛ نسخه DLL با دستگاه یکی باشد |
| دو تراکنش هم‌زمان | بریج قفل تک‌تراکنش دارد؛ UI را دابل‌کلیک نکن |

---

## امنیت

- بریج را به اینترنت publish نکن.
- `BRIDGE_TOKEN` بگذار.
- DLL و لایسنس را فقط روی ماشین مشتری نگه دار؛ در تحویل عمومی الزامی نیست در git بماند (این ریپو فعلاً فایل را دارد — برای مشتری سیاست خودت را رعایت کن).

---

## چه چیزی ساخته شده در ریپو

| مسیر | کار |
|------|-----|
| `pos_bridge/app.py` | HTTP API |
| `pos_bridge/dll_client.py` | بارگذاری DLL + `TestConnection` / `send_transaction` |
| `pos_bridge/run.bat` | نصب وابستگی + اجرا |
| `pos_bridge/install_service_nssm.bat` | Windows Service |
| `apps/payment/gateway/bridge.py` | کلاینت Django |
| `PaymentGatewayAdapter` | شاخهٔ `bridge` |

مسیر TCP خام (`PAYMENT_GATEWAY_NAME=pos`) حذف نشده؛ برای فاز ۱ و توسعه می‌ماند.
