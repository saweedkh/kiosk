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
2. اگر پوشه یا فایل‌ها وجود ندارند:
   ```batch
   build-images.bat
   ```

---

## اسکریپت‌های مفید

### `rebuild-and-run.bat`
اسکریپت کامل برای rebuild و run:
- Containerها را stop می‌کند
- Imageها را rebuild می‌کند
- Application را start می‌کند

### `fix-docker-safe.bat`
رفع مشکل I/O Docker با حفظ دیتابیس:
- از دیتابیس backup می‌گیرد
- Imageهای corrupted را پاک می‌کند
- Cache را پاک می‌کند
- **دیتابیس حفظ می‌شود**

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

