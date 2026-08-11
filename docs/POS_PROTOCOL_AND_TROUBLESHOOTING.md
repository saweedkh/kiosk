# راهنمای کامل پروتکل و عیب‌یابی پوز

این سند برای زمانی است که:

- `mock` **نیست**
- `IP` و `Port` **درست هستند**
- اما **مبلغ روی صفحهٔ پوز نمی‌آید** یا تراکنش به نتیجه نمی‌رسد

این راهنما بر اساس پیاده‌سازی فعلی پروژه در `kiosk_backend/apps/payment/gateway/pos/` نوشته شده است.

اسناد و ابزار همراه:

- پیشنهاد معماری: [`POS_RECOMMENDED_SOLUTION.md`](POS_RECOMMENDED_SOLUTION.md)
- چک‌لیست سر دستگاه: [`docs/POS_ONSITE_CHECKLIST.md`](POS_ONSITE_CHECKLIST.md)
- کلیدهای `.env` آماده: [`.env.pos.example`](../.env.pos.example)
- preflight: `scripts/pos-preflight.sh` / `scripts/pos-preflight.bat`
- جمع‌آوری لاگ: `scripts/pos-collect-logs.sh` / `scripts/pos-collect-logs.bat`

---



## 1. جمع‌بندی خیلی کوتاه

در این پروژه، ارتباط با پوز:

- **DLL واقعی شرکت را صدا نمی‌زند**
- از **سوکت TCP خام** استفاده می‌کند
- فقط **فرمت پیام DLL / PNA** را از روی تحلیل ترافیک تقلید می‌کند

پس اگر:

- `ping` داری
- `connect()` هم موفق می‌شود
- لاگ می‌گوید داده به IP ارسال شد
- ولی پوز هیچ مبلغی نشان نمی‌دهد

تقریباً همیشه مشکل در یکی از این لایه‌هاست:

1. **فرمت wire message** با چیزی که پوز انتظار دارد یکی نیست
2. **نرم‌افزار شرکت همزمان وصل است** و پوز فقط یک session می‌پذیرد
3. **از داخل Docker** مسیر TCP با میزبان فرق دارد
4. **پوز ACK/response خاصی می‌دهد** ولی parser یا انتظار ما با آن نمی‌خواند
5. **اتصال تست** موفق است اما **payload transaction** از نظر دستگاه نامعتبر است

---



## 2. معماری مسیر پرداخت



### 2.1 فلو از UI تا پوز

1. کاربر در UI روی پرداخت می‌زند
2. درخواست ساخت سفارش به backend می‌رسد
3. `OrderService._process_payment()` گیت‌وی پرداخت را می‌گیرد
4. `PaymentGatewayAdapter.get_gateway()` اگر `gateway_name=pos` باشد، `POSPaymentGateway` می‌سازد
5. `POSPaymentOperations.initiate_payment()` اجرا می‌شود
6. اول **تست اتصال TCP**
7. بعد **ساخت packet**
8. بعد **ارسال packet**
9. بعد **انتظار برای پاسخ تا 120 ثانیه**
10. بعد **parse response**
11. نتیجه روی سفارش ثبت می‌شود



### 2.2 فایل‌های کلیدی

- `kiosk_backend/apps/orders/services/order_service.py`
- `kiosk_backend/apps/payment/gateway/adapter.py`
- `kiosk_backend/apps/payment/gateway/pos/gateway.py`
- `kiosk_backend/apps/payment/gateway/pos/payment_operations.py`
- `kiosk_backend/apps/payment/gateway/pos/connection.py`
- `kiosk_backend/apps/payment/gateway/pos/message_builder.py`
- `kiosk_backend/apps/payment/gateway/pos/communication.py`
- `kiosk_backend/apps/payment/gateway/pos/response_parser.py`

---



## 3. آیا DLL استفاده می‌شود؟



### پاسخ کوتاه

**خیر.**

کد فعلی:

- `ctypes` ندارد
- `pythonnet` ندارد
- `WinDLL` / `LoadLibrary` ندارد
- هیچ فراخوانی واقعی به DLL شرکت انجام نمی‌دهد

تنها کاری که انجام می‌شود این است که:

- فرمت packet از روی **تحلیل DLL/trafic capture**
- در پایتون بازسازی می‌شود
- و با **TCP socket** ارسال می‌شود



### نتیجهٔ مهم

پس اگر نرم‌افزار شرکت با همان دستگاه کار می‌کند اما این پروژه نه، معنایش این نیست که شبکه خراب است؛ خیلی وقت‌ها یعنی:

- **پروتکل ارسال ما یکسان با نرم‌افزار شرکت نیست**

---



## 4. فرآیند کامل پرداخت در backend



### 4.1 ساخت gateway

در `PaymentGatewayAdapter`:

- اگر `gateway_name=mock` → `MockPaymentGateway`
- اگر `gateway_name=pos` → `POSPaymentGateway`



### 4.2 شروع پرداخت

در `POSPaymentOperations.initiate_payment()`:

1. `test_connection()` صدا زده می‌شود
2. اگر تست موفق باشد، payload ساخته می‌شود
3. `send_command()` packet را می‌فرستد
4. تا 120 ثانیه منتظر interaction کاربر و پاسخ دستگاه می‌ماند
5. پاسخ parse می‌شود



### 4.3 نکتهٔ مهم

تست اتصال و ارسال transaction **دو چیز متفاوت‌اند**:

- ممکن است `test_connection()` موفق شود
- ولی transaction packet توسط دستگاه پذیرفته نشود

این دقیقاً همان سناریویی است که:

- IP درست است
- Port درست است
- ping داری
- حتی TCP connect هم داری
- ولی مبلغ روی پوز نمی‌آید

---



## 5. packet دقیقاً چیست؟

packet از نوع:

- **ASCII bytes**
- روی **TCP**
- بدون HTTP
- بدون JSON
- بدون TLS



### 5.1 بدنهٔ پیام

دو سبک payload وجود دارد:

#### حالت ساده

وقتی `POS_USE_SIMPLE_FORMAT=True`

ساختار بدنه تقریباً این است:

```text
PR00 + counter(7 digits) + AM{len3}{amount} + CU00{6digits} + PD0011
```

مثال:

```text
PR006000000AM00510000CU003364PD0011
```

معنی اجزا:

- `PR00` → درخواست پرداخت عادی
- `6000000` → شمارنده / transaction counter
- `AM00510000` → مبلغ 10000 ریال با طول 5
- `CU003364` → شناسه مشتری / fallback
- `PD0011` → payment data پیش‌فرض



#### حالت کامل

وقتی `POS_USE_SIMPLE_FORMAT=False`

ساختار می‌تواند این‌ها را هم شامل شود:

```text
PR00AM{len}{amount}TE{terminal}ME{merchant}SO{order}CU{customer}PD{payment_id}BI{bill_id}
```

مثال معمول:

```text
PR00AM00510000SOPREFLIGHT-TEST       
```



### 5.2 فریم دور payload

بعد از ساخت بدنه، بسته به `POS_MESSAGE_FORMAT`، پیام نهایی فریم می‌شود.

#### `dll_exact`

فقط بدنهٔ خام:

```text
PR00AM00510000...
```

بدون:

- طول
- `RQ`
- `CRLF`
- `NULL`



#### `pardakht_novin_official`

فرمت پیشنهادی برای PNA:

```text
{4digit_total_length}RQ{3digit_body_length}{body}
```

مثال:

```text
0067RQ062PR006000000AM00510000CU003364TL00898194184R0009260227494PD0011
```



#### فرمت‌های دیگر

- `with_rq_and_banner`
- `with_length`
- `with_stx_etx`
- `with_terminator`
- `with_null`

این‌ها fallback/experiment هستند، نه انتخاب اول برای سناریوی PNA.

---



## 6. packet چطور ارسال می‌شود؟



### 6.1 نوع اتصال

در `POSConnection.connect()`:

- `socket.AF_INET`
- `socket.SOCK_STREAM`

یعنی:

- **TCP/IP**
- نه UDP
- نه serial واقعی



### 6.2 مراحل ارسال

در `POSCommunication.send_command()`:

1. اگر اتصال زنده نیست، `connect()`
2. packet در لاگ ثبت می‌شود:
  - `pos_sending_command`
  - `hex_preview`
3. `conn.sendall(command)` اجرا می‌شود
4. بعد از ارسال:
  - `pos_data_sent`
  - `pos_connection_verified`
5. `0.5s` صبر
6. اگر منتظر پاسخ باشیم:
  - ابتدا ACK احتمالی
  - سپس با `select()` تا `120s` منتظر پاسخ نهایی



### 6.3 نکتهٔ حیاتی

`pos_data_sent` فقط یعنی:

- بایت‌ها وارد socket شده‌اند

**این لاگ هرگز تضمین نمی‌کند که:**

- پوز packet را فهمیده
- مبلغ را روی صفحه آورده
- transaction را شروع کرده

---



## 7. پاسخ پوز چطور parse می‌شود؟

در `POSResponseParser` پاسخ بر اساس `RS` codeها parse می‌شود.

### نمونه‌ها

- `RS00200` → موفق (`00`)
- `RS00281` یا `RS00299` → لغو کاربر
- `RS133` → رمز اشتباه



### رفتار parser

- اگر پاسخ خیلی کوتاه باشد → ممکن است فقط ACK تلقی شود
- اگر `RS00XXX` پیدا شود → status code از آن استخراج می‌شود
- اگر هیچ پاسخ meaningful نرسد → upstream معمولاً timeout/no-response می‌دهد

---



## 8. سناریوی مهم این سند

فرض ما این است که:

- `mock` نیست
- `IP` درست است
- `Port` درست است

و با این حال:

- پوز مبلغ را نشان نمی‌دهد

در این سناریو، مشکل معمولاً **network addressing** نیست، بلکه در یکی از این لایه‌هاست:

---



## 9. دلایل اصلی اینکه مبلغ به پوز نمی‌رسد



### 9.1 فرمت packet اشتباه است

این شایع‌ترین علت است.

#### علامت‌ها

- لاگ می‌گوید `pos_connection_established`
- لاگ می‌گوید `pos_data_sent`
- پوز هیچ چیزی نشان نمی‌دهد
- بعد از 1 تا 2 دقیقه:
  - `pos_no_response_received`
  - timeout
  - یا خطاهای ارتباطی ثانویه



#### چرا؟

چون دستگاه:

- TCP session را قبول کرده
- اما payload را transaction معتبر ندانسته



#### علت‌های رایج در همین بخش

1. `dll_exact` فرستاده‌ای ولی دستگاه `pardakht_novin_official` می‌خواهد
2. `simple=False` بوده ولی دستگاه payload ساده می‌خواهد
3. تگ‌ها یا ترتیبشان با capture واقعی یکی نیست
4. presence/absence بعضی فیلدها برای آن مدل دستگاه مهم است
5. padding/length دقیق با انتظار دستگاه نمی‌خواند



#### نتیجه

دستگاه packet را silently ignore می‌کند.

---



### 9.2 نرم‌افزار شرکت هنوز باز است

خیلی از دستگاه‌های POS فقط:

- یک session
- یا یک client active

را همزمان قبول می‌کنند.

#### علامت‌ها

- از داخل app `connect()` داری
- ولی transaction رفتار عجیبی دارد
- vendor software همزمان کار می‌کند
- app یا هیچ response نمی‌گیرد یا device عملاً busy است



#### اقدام

قبل از هر تست:

- نرم‌افزار شرکت را کامل ببند
- اگر service/background process دارد، آن را هم stop کن

---



### 9.3 TCP connect موفق است ولی مسیر transaction پایدار نیست

گاهی:

- `connect_ex` موفق می‌شود
- اما connection در طول interaction پایدار نمی‌ماند

چون app:

- connect می‌کند
- packet می‌فرستد
- 120 ثانیه منتظر می‌ماند

اگر مسیر network/NAT/bridge ناپایدار باشد، response برنمی‌گردد.

#### علامت‌ها

- `pos_connection_established`
- `pos_data_sent`
- بعد:
  - `pos_connection_verification_failed`
  - `pos_connection_lost`
  - `pos_receive_error`
  - `pos_communication_network_error`



#### نکته

این مورد مخصوصاً وقتی مهم می‌شود که:

- app داخل Docker bridge است
- ولی vendor software روی host OS مستقیم به LAN می‌رود

---



### 9.4 ACK یا response از دستگاه می‌آید ولی parser/flow ما آن را درست مصرف نمی‌کند

این مورد کمتر شایع است اما واقعی است.

#### مثال

ممکن است دستگاه:

- ACK کوتاه بفرستد
- یا response چندمرحله‌ای بدهد

و کد ما:

- بخش اول را ACK فرض کند
- بخش دوم را دیر/ناقص بخواند
- یا اصلاً پاسخ نهایی به شکل مورد انتظار ما نباشد



#### علامت‌ها

- `pos_initial_response_received`
- `pos_ack_received_waiting_for_final`
- ولی بعد final response مناسب نداریم



#### نتیجه

ممکن است:

- پوز کاری کرده باشد
- ولی backend نتیجه را نفهمیده باشد

این سناریو بیشتر وقتی محتمل است که:

- مدل پوز دقیقاً مطابق capture اولیه نباشد
- firmware متفاوت باشد

---



### 9.5 payload معتبر نیست چون بعضی فیلدها برای آن دستگاه مهم‌اند

هرچند IP/Port درست است، بعضی دستگاه‌ها روی این چیزها حساس‌اند:

- format type
- terminal id
- merchant id
- counter format
- order-related tags
- customer/payment tags



#### علامت‌ها

- packet ارسال می‌شود
- دستگاه واکنشی نشان نمی‌دهد
- یا response خطای مبهم می‌دهد



#### نکته

این‌که vendor software کار می‌کند، لزوماً به این معنی نیست که:

- فقط IP/Port کافی بوده

ممکن است نرم‌افزار شرکت:

- `TL`
- `R`
- یا فیلدهای دیگر

را هم بفرستد که implementation فعلی ما در همهٔ حالات نمی‌فرستد.

---



### 9.6 connect test با send transaction فرق دارد

`test_connection()` فقط نشان می‌دهد:

- امکان باز شدن TCP socket هست

اما transaction واقعی نیاز دارد:

- packet معتبر باشد
- session باز بماند
- response cycle کامل شود

پس این دو نتیجه ممکن است همزمان درست باشند:

- `test_connection = success`
- `real payment = no amount on POS`

---



## 10. درخت تصمیم (وقتی mock نیست و IP/Port درست است)

```text
پرداخت زدی / send_pos_payment زدی
          │
          ▼
   مبلغ روی پوز آمد؟
     │           │
    بله         خیر
     │           │
     ▼           ▼
   موفق     چند ثانیه طول کشید؟
               │
      ┌────────┴────────┐
    ~2–4 ثانیه      1–2 دقیقه
      │                  │
      ▼                  ▼
 هنوز mock           لاگ را ببین
 یا UI timeout         │
                       ▼
              pos_data_sent هست؟
                 │           │
                خیر         بله
                 │           │
                 ▼           ▼
          send نرسیده     پوز packet را نفهمید
          (busy lock /    یا session اشغال است
           connect بعد از   │
           test شکست)       ▼
                      نرم‌افزار شرکت باز بود؟
                         │           │
                        بله         خیر
                         │           │
                         ▼           ▼
                    ببند و     ASCII packet را ببین
                    دوباره    │
                              ▼
                     با RQ شروع می‌شود؟
                       │           │
                      خیر         بله
                       │           │
                       ▼           ▼
                 dll_exact      فیلدهای TL/R/CU
                 → official     را با نرم‌افزار شرکت
                 + simple=True  مقایسه کن
```



### حکم سریع


| اگر دیدی                                                 | حکم                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| ~۳ ثانیه و سفارش موفق بدون پوز                           | هنوز mock است (این سند فرض می‌کند نیست؛ دوباره `show_pos_config` بزن) |
| `pos_data_sent` + پوز خاموش + `pos_no_response_received` | **فرمت packet**                                                       |
| `pos_data_sent` + vendor app باز                         | **تداخل session**                                                     |
| `pos_connection_lost` بعد از send                        | مسیر TCP ناپایدار (Docker/NAT)                                        |
| ACK کوتاه بدون مبلغ روی صفحه                             | parser/flow یا firmware متفاوت                                        |
| TCP OK ولی ASCII بدون `RQ`                               | همین فریم را عوض کن؛ تست UI نکن                                       |


---



## 11. نمونه لاگ خوب در مقابل بد



### ۱۱.۱ مسیر سالم (مبلغ روی پوز آمد)

ترتیب eventها تقریباً این است:

```text
pos_testing_connection
pos_connection_established          # تست TCP
pos_connection_test_success
pos_amount_format_simple            # یا pos_amount_format_full
pos_message_format_pardakht_novin_official
pos_message_final                   # ASCII شبیه 00xxRQ0xxPR00...
pos_payment_initiated
pos_connection_established          # اتصال دوم برای transaction
pos_sending_command
pos_data_sent
pos_connection_verified             # peer = IP:1362 پوز
pos_initial_response_received       # اغلب ACK کوتاه
pos_ack_received_waiting_for_final
pos_complete_response_received      # بعد از کارت/رمز
gateway_response_received           # success=true
```

`command_preview` سالم معمولاً شبیه:

```text
0044RQ039PR00xxxxxxxAM00510000CU00xxxxxxPD0011
```



### ۱۱.۲ مسیر خراب همین کیوسک (مبلغ نیامد، ۱–۲ دقیقه صبر)

```text
pos_testing_connection
pos_connection_established
pos_connection_test_success
pos_amount_format_full              # simple=False
pos_message_final                   # format_type=dll_exact
pos_sending_command                 # PR00AM005... بدون RQ
pos_data_sent                       # فریبنده: «ارسال شد»
pos_connection_verified
pos_no_immediate_response
pos_waiting_for_response            # تکرار تا ~120s
pos_no_response_received            # یا TimeoutError عجیب
```

`command_preview` خراب معمولاً شبیه:

```text
PR00AM00510000SOK-000123          
```

یعنی TCP OK است؛ دستگاه transaction را شروع نکرده.

### ۱۱.۳ تداخل با نرم‌افزار شرکت

```text
pos_connection_established
pos_sending_command
pos_data_sent
pos_connection_verification_failed  # گاهی
pos_receive_error / pos_connection_lost
```

یا connect دوم بعد از test شکست می‌خورد چون پورت تک‌کلاینت است.

### ۱۱.۴ Docker به LAN نمی‌رسد (خارج از فرض این بخش، برای تشخیص)

```text
pos_connection_failed   error=timed out
# یا connect_ex code 11 / 111
```

اینجا اصلاً به `pos_data_sent` نمی‌رسی.

---



## 12. ماتریس تشخیص بر اساس رفتار



### حالت A

- `pos_connection_established`
- `pos_data_sent`
- 1 تا 2 دقیقه انتظار
- پوز خاموش / بدون مبلغ
- `pos_no_response_received`

**محتمل‌ترین علت:** فرمت packet اشتباه

---



### حالت B

- `pos_connection_established`
- `pos_data_sent`
- بعد `pos_connection_lost` یا timeout شبکه

**محتمل‌ترین علت:** مشکل پایداری مسیر TCP یا تفاوت host/container path

---



### حالت C

- `test_connection` موفق
- `send_pos_payment` ناموفق
- vendor software موفق

**محتمل‌ترین علت:** payload ما با پروتکل واقعی device یکی نیست

---



### حالت D

- app می‌گوید packet فرستادم
- vendor software هم همان لحظه باز است
- دستگاه هیچ واکنشی ندارد

**محتمل‌ترین علت:** session conflict / single-client limitation

---



### حالت E

- ACK یا response کوتاه می‌آید
- ولی final state نداریم

**محتمل‌ترین علت:** parser/response handling mismatch

---



## 13. ترتیب دقیق عیب‌یابی روی دستگاه

این بخش دقیقاً برای زمانی است که:

- `mock` نیست
- IP/Port درست است



### مرحله 1: config واقعی را همان‌جا ببین

```bash
docker exec kiosk_backend python manage.py show_pos_config
```

فقط به این سه چیز نگاه نکن:

- host
- port
- gateway

بلکه حتماً این دو مورد را هم ببین:

- `POS_MESSAGE_FORMAT`
- `POS_USE_SIMPLE_FORMAT`

اگر:

- `dll_exact`
- و `False`

بینی، از همین‌جا باید به mismatch شک کنی.

---



### مرحله 2: packet نهایی را قبل از ارسال ببین

```bash
docker exec kiosk_backend python manage.py pos_preflight --host <IP> --port 1362 --amount 10000
```

این دستور این‌ها را می‌دهد:

- ASCII packet
- HEX packet
- format type



#### چیزی که باید ببینی

برای PNA معمولاً باید چیزی شبیه این باشد:

```text
00xxRQ0xxPR00...
```

اگر چیزی شبیه این دیدی:

```text
PR00AM00510000...
```

یعنی packet خام بدون `RQ`/length ارسال می‌شود و احتمال mismatch بالاست.

---



### مرحله 3: vendor software را ببند

قبل از هر تست app:

- vendor app را ببند
- اگر لازم است service آن را stop کن

بعد دوباره تست بزن.

---



### مرحله 4: ارسال مبلغ تستی

```bash
docker exec -it kiosk_backend python manage.py send_pos_payment 10000 --host <IP> --port 1362
```



#### تفسیر

اگر:

- لاگ ارسال داری
- پوز مبلغ نشان نمی‌دهد

احتمال اصلی همچنان format mismatch است.

---



### مرحله 5: لاگ‌های دقیق را جمع کن

```bash
docker exec kiosk_backend sh -c "grep -E 'pos_|gateway_response|payment_' /app/logs/kiosk.log | tail -100"
```

دنبال این eventها بگرد:

- `pos_sending_command`
- `pos_data_sent`
- `pos_connection_verified`
- `pos_initial_response_received`
- `pos_ack_received_waiting_for_final`
- `pos_no_response_received`
- `pos_receive_error`
- `pos_connection_lost`
- `pos_communication_network_error`

---



### مرحله 6: packet app را با packet نرم‌افزار شرکت مقایسه کن

اگر امکان capture یا لاگ packet نرم‌افزار شرکت را داری:

1. همان مبلغ را با vendor software بفرست
2. packet app را از `pos_preflight`
3. کنار هم مقایسه کن

مواردی که باید مقایسه شوند:

- وجود/عدم وجود `RQ`
- طول prefix
- ترتیب tagها
- `CU`
- `PD`
- `TL`
- `R`
- طول amount
- padding

اگر packet vendor software شبیه این است:

```text
0067RQ062PR006000000AM00510000CU003364TL00898194184R0009260227494PD0011
```

ولی packet app این است:

```text
PR00AM00510000SOTEST...
```

عملاً ریشهٔ مشکل پیدا شده است.

---



## 14. نتیجه‌گیری فنی برای سناریوی «IP و Port درست است»

اگر:

- `mock` نیست
- `IP/Port` درست است
- `connect` هم انجام می‌شود
- vendor software هم از همان دستگاه کار می‌کند
- ولی app فقط لاگ ارسال می‌دهد و پوز مبلغ نمی‌آورد

بالاترین احتمال این است که:

> **payload نهایی که پروژه می‌فرستد، با wire format مورد انتظار آن مدل پوز یکی نیست.**

به بیان ساده:

- app به دستگاه **وصل می‌شود**
- app چیزی **می‌فرستد**
- ولی دستگاه آن را **درخواست پرداخت معتبر** تشخیص نمی‌دهد

و به همین دلیل:

- مبلغ روی صفحه نمی‌آید
- اپ 120 ثانیه منتظر می‌ماند
- در نهایت timeout/no-response/connection side error می‌بینی

---



## 15. اقدام‌های پیشنهادی برای دفعهٔ بعد



### اولویت 1

حتماً روی دستگاه این را بررسی کن:

```env
POS_MESSAGE_FORMAT=pardakht_novin_official
POS_USE_SIMPLE_FORMAT=True
```



### اولویت 2

با `pos_preflight` packet نهایی را بگیر و ذخیره کن.

### اولویت 3

نرم‌افزار شرکت را قبل از تست app کامل ببند.

### اولویت 4

اگر باز هم مبلغ نیامد:

- packet vendor software و packet app را مقایسه کن
- اگر لازم شد builder را با همان فریم واقعی vendor align کن

---



## 16. دستورات مرجع



### نمایش config

```bash
docker exec kiosk_backend python manage.py show_pos_config
```



### preflight

```bash
docker exec kiosk_backend python manage.py pos_preflight --host <IP> --port 1362 --amount 10000
```



### ارسال واقعی

```bash
docker exec -it kiosk_backend python manage.py send_pos_payment 10000 --host <IP> --port 1362
```



### گرفتن لاگ

```bash
./scripts/pos-collect-logs.sh
# یا
docker exec kiosk_backend sh -c "grep -E 'pos_|gateway_response|payment_' /app/logs/kiosk.log | tail -100"
```

---



## 17. خلاصهٔ نهایی

در این پروژه، «مبلغ به پوز نمی‌رسد» با وجود درست بودن IP و Port معمولاً به این معنی نیست که network خراب است. بیشتر وقت‌ها یعنی:

- **packet از نظر TCP ارسال شده**
- اما **از نظر پروتکل برای آن پوز معتبر نبوده**

پس تمرکز اصلی عیب‌یابی باید از این به بعد روی این سه چیز باشد:

1. **packet واقعی که app می‌فرستد**
2. **packet واقعی که vendor software می‌فرستد**
3. **تفاوت این دو**

