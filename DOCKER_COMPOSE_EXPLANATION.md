# توضیح فایل‌های Docker Compose

## 📋 چرا سه فایل docker-compose داریم؟

سه فایل docker-compose برای **سه سناریو مختلف** طراحی شده‌اند:

---

## 1️⃣ `docker-compose.yml` - Development (توسعه)

### استفاده:
برای **توسعه‌دهنده** در زمان توسعه و تست

### ویژگی‌ها:
- ✅ از `build` استفاده می‌کند (Images را از Dockerfile می‌سازد)
- ✅ برای تغییرات سریع در کد مناسب است
- ✅ نیازی به ساخت Images از قبل نیست

### نحوه استفاده:
```bash
docker-compose up -d
```

### تفاوت کلیدی:
```yaml
services:
  backend:
    build:                    # ← Images را می‌سازد
      context: ./kiosk_backend
      dockerfile: Dockerfile
```

---

## 2️⃣ `docker-compose.production.yml` - Production (Windows)

### استفاده:
برای **مشتری** در محیط Production روی **Windows Docker Desktop**

### ویژگی‌ها:
- ✅ از `image` استفاده می‌کند (Images از قبل ساخته شده)
- ✅ برای تحویل به مشتری مناسب است
- ✅ از `extra_hosts` برای دسترسی به شبکه محلی استفاده می‌کند
- ✅ در Windows Docker Desktop کار می‌کند

### نحوه استفاده:
```bash
# ابتدا Images را لود کنید
docker load -i images/backend.tar
docker load -i images/frontend.tar
docker load -i images/nginx.tar

# سپس اجرا کنید
docker-compose -f docker-compose.production.yml up -d
```

### تفاوت کلیدی:
```yaml
services:
  backend:
    image: kiosk-backend:latest    # ← از Image آماده استفاده می‌کند
    extra_hosts:                   # ← برای دسترسی به شبکه
      - "host.docker.internal:host-gateway"
```

**این فایل در پکیج تحویلی به مشتری به نام `docker-compose.yml` کپی می‌شود!**

---

## 3️⃣ `docker-compose.production.host-network.yml` - Production (WSL2/Linux)

### استفاده:
برای **مشتری** در محیط Production روی **WSL2** یا **Linux**

### ویژگی‌ها:
- ✅ از `image` استفاده می‌کند (Images از قبل ساخته شده)
- ✅ از `network_mode: host` استفاده می‌کند
- ✅ دسترسی مستقیم به شبکه میزبان
- ✅ **فقط در WSL2 یا Linux کار می‌کند** (در Windows Docker Desktop کار نمی‌کند)

### نحوه استفاده:
```bash
# ابتدا Images را لود کنید
docker load -i images/backend.tar
docker load -i images/frontend.tar
docker load -i images/nginx.tar

# سپس اجرا کنید
docker-compose -f docker-compose.production.host-network.yml up -d
```

### تفاوت کلیدی:
```yaml
services:
  backend:
    image: kiosk-backend:latest
    network_mode: host            # ← دسترسی مستقیم به شبکه میزبان
```

**⚠️ توجه:** `network_mode: host` در Windows Docker Desktop (بدون WSL2) کار نمی‌کند!

---

## 📊 جدول مقایسه

| ویژگی | docker-compose.yml | docker-compose.production.yml | docker-compose.production.host-network.yml |
|-------|-------------------|------------------------------|-------------------------------------------|
| **استفاده** | Development | Production (Windows) | Production (WSL2/Linux) |
| **Build/Image** | `build` | `image` | `image` |
| **دسترسی شبکه** | `extra_hosts` | `extra_hosts` | `network_mode: host` |
| **پلتفرم** | همه | Windows | WSL2/Linux |
| **در پکیج** | ❌ خیر | ✅ بله (به نام docker-compose.yml) | ✅ بله (اختیاری) |

---

## 🎯 کدام را استفاده کنیم؟

### برای توسعه‌دهنده:
```bash
docker-compose up -d
```
→ از `docker-compose.yml` استفاده می‌کند

### برای مشتری (Windows):
```bash
# در run.bat
docker-compose -f docker-compose.yml up -d
```
→ از `docker-compose.production.yml` استفاده می‌کند (که به نام docker-compose.yml کپی شده)

### برای مشتری (WSL2/Linux):
```bash
docker-compose -f docker-compose.production.host-network.yml up -d
```
→ از `docker-compose.production.host-network.yml` استفاده می‌کند

---

## 🔍 تفاوت‌های فنی

### 1. Build vs Image

**docker-compose.yml:**
```yaml
build:
  context: ./kiosk_backend
  dockerfile: Dockerfile
```
- Images را از Dockerfile می‌سازد
- برای تغییرات در کد مناسب است

**docker-compose.production.yml:**
```yaml
image: kiosk-backend:latest
```
- از Image آماده استفاده می‌کند
- برای Production مناسب است

### 2. دسترسی به شبکه

**docker-compose.yml & docker-compose.production.yml:**
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```
- در Windows Docker Desktop کار می‌کند
- دسترسی به شبکه محلی از طریق gateway

**docker-compose.production.host-network.yml:**
```yaml
network_mode: host
```
- دسترسی مستقیم به شبکه میزبان
- فقط در WSL2/Linux کار می‌کند

---

## 📝 خلاصه

1. **`docker-compose.yml`** → برای توسعه (از build استفاده می‌کند)
2. **`docker-compose.production.yml`** → برای Production در Windows (از image استفاده می‌کند)
3. **`docker-compose.production.host-network.yml`** → برای Production در WSL2/Linux (از image + host network استفاده می‌کند)

**در پکیج تحویلی:**
- `docker-compose.production.yml` به نام `docker-compose.yml` کپی می‌شود
- `docker-compose.production.host-network.yml` هم کپی می‌شود (برای مشتریانی که از WSL2 استفاده می‌کنند)

---

## ✅ نتیجه

**سه فایل برای سه سناریو مختلف:**
- Development (توسعه)
- Production Windows (مشتری Windows)
- Production WSL2/Linux (مشتری WSL2/Linux)

همه فایل‌ها لازم هستند و هر کدام برای هدف خاصی طراحی شده‌اند! 🎯

