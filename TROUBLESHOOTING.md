# راهنمای رفع مشکلات Docker و Imageها

## مشکلات رایج و راه‌حل‌ها

### مشکل 1: خطای I/O در Docker
**علائم:**
```
write /var/lib/desktop-containerd/daemon/io.containerd.metadata.v1.bolt/meta.db: input/output error
unable to get image 'kiosk-frontend:latest': Error response from daemon
```

**راه‌حل:**
1. اجرای `fix-docker-safe.bat` (دیتابیس حفظ می‌شود)
2. Restart کردن Docker Desktop
3. اجرای `build-images.bat`
4. اجرای `run.bat`

---

### مشکل 2: Imageها load نمی‌شوند
**علائم:**
```
ERROR: Failed to load backend image!
The image file may be corrupted.
```

**راه‌حل:**
1. حذف imageهای قدیمی:
   ```batch
   docker rmi kiosk-backend:latest kiosk-frontend:latest kiosk-nginx:latest
   ```
2. Rebuild کردن imageها:
   ```batch
   build-images.bat
   ```
3. دوباره اجرای `run.bat`

---

### مشکل 3: Containerها start نمی‌شوند
**علائم:**
```
ERROR: Failed to start containers!
```

**راه‌حل:**
1. بررسی وضعیت Docker:
   ```batch
   docker info
   ```
2. Stop کردن همه containerها:
   ```batch
   docker-compose down
   ```
3. بررسی لاگ‌ها:
   ```batch
   docker-compose logs
   ```
4. اگر مشکل ادامه داشت، اجرای `fix-docker-safe.bat`

---

### مشکل 4: Imageهای قدیمی استفاده می‌شوند
**علائم:**
- تغییرات کد اعمال نمی‌شوند
- مبالغ POS درست محاسبه نمی‌شوند

**راه‌حل:**
1. Rebuild کامل imageها:
   ```batch
   rebuild-and-run.bat
   ```
   یا به صورت دستی:
   ```batch
   build-images.bat
   run.bat
   ```

---

### مشکل 5: فایل‌های .tar پیدا نمی‌شوند
**علائم:**
```
ERROR: images\backend.tar not found!
```

**راه‌حل:**
1. بررسی وجود پوشه `images`:
   ```batch
   dir images
   ```
2. اگر روی ماشین **توسعه** هستید:
   ```batch
   build-images.bat
   ```
3. اگر روی پکیج **تحویل** هستید، دوباره ZIP را Extract کنید یا از تیم delivery فایل‌های `.tar` را بگیرید.

---

### مشکل 6: دیتابیس / Postgres
**علائم:** backend بالا نمی‌آید، `database` error در لاگ

**راه‌حل:**
1. `docker compose ps` — کانتینر `kiosk_db` باید healthy باشد
2. `docker logs kiosk_db` و `docker logs kiosk_backend`
3. در `.env` مقادیر `POSTGRES_*` را چک کنید
4. بعد از تغییر `.env`: `docker compose up -d --force-recreate backend bale_bot`
5. مهاجرت از SQLite: فایل `MIGRATE_SQLITE_TO_POSTGRES.md`

---

## اسکریپت‌های مفید

### `run.bat` / `stop.bat`
استارت/استاپ روزمره. `run.bat` دیگر image پاک نمی‌کند؛ فقط در صورت نبودن image از `.tar` لود می‌کند و Postgres را هم pull می‌کند.

### `backup-database.bat` / `restore-database.bat`
بکاپ و بازگردانی **PostgreSQL + media**.

### `export-sqlite-data.bat` / `import-data-to-postgres.bat`
مهاجرت داده از SQLite قدیمی به Postgres (راهنما: `MIGRATE_SQLITE_TO_POSTGRES.md`).

### `fix-docker-safe.bat`
رفع مشکل I/O Docker با حفظ volumeهای `postgres_data` و `backend_media`.  
`fix-docker-io-error.bat` تهاجمی‌تر است — فقط در موارد بحرانی.

### `rebuild-and-run.bat` / `build-images.bat`
فقط روی **ریپوی سورس** (نه پکیج تحویل مشتری).

### `build-images.bat`
Build کردن imageها از کد جدید:
- با `--no-cache` build می‌کند
- Imageها را به فایل `.tar` export می‌کند

---

## مراحل عیب‌یابی استاندارد

1. **بررسی Docker:**
   ```batch
   docker info
   ```

2. **Stop کردن همه چیز:**
   ```batch
   docker-compose down
   ```

3. **پاک کردن imageهای قدیمی:**
   ```batch
   docker rmi kiosk-backend:latest kiosk-frontend:latest kiosk-nginx:latest
   ```

4. **Rebuild:**
   ```batch
   build-images.bat
   ```

5. **Run:**
   ```batch
   run.bat
   ```

6. **اگر مشکل ادامه داشت:**
   ```batch
   fix-docker-safe.bat
   ```
   سپس Docker Desktop را restart کنید و دوباره مراحل 4 و 5 را انجام دهید.

---

## نکات مهم

- همیشه قبل از rebuild، از دیتابیس backup بگیرید
- اگر Docker I/O error دارید، حتماً Docker Desktop را restart کنید
- برای اطمینان از استفاده از کد جدید، همیشه `build-images.bat` را با `--no-cache` اجرا کنید
- اگر از ZIP package استفاده می‌کنید، مطمئن شوید که imageهای `.tar` به‌روز هستند

---

## پوز: پینگ OK است ولی مبلغ روی دستگاه نمی‌آید

این موضوع Docker I/O نیست. راهنما:

- چک‌لیست سر دستگاه: `docs/POS_ONSITE_CHECKLIST.md`
- پروتکل و درخت تصمیم: `docs/POS_PROTOCOL_AND_TROUBLESHOOTING.md`
- تست: `scripts/pos-preflight.sh` / `scripts/pos-preflight.bat`

