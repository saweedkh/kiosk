# راهنمای دسترسی به POS و Printer از داخل Docker

## مشکل

وقتی بک‌اند داخل کانتینر Docker است، باید بتواند به دستگاه‌های شبکه محلی دسترسی داشته باشد:
- **POS (کارت‌خوان)**: از طریق TCP/IP (مثلاً `192.168.1.100:1362`)
- **Printer (پرینتر)**: از طریق TCP/IP (مثلاً `192.168.1.100:9100`)

## راه‌حل‌ها

### راه‌حل 1: استفاده از `extra_hosts` (پیش‌فرض)

این راه‌حل در `docker-compose.production.yml` پیاده‌سازی شده است:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

**مزایا:**
- کار می‌کند در Windows Docker Desktop
- کار می‌کند در Linux و Mac
- امن‌تر از `network_mode: host`

**نحوه استفاده:**
- از IP مستقیم دستگاه‌ها استفاده کنید (مثلاً `192.168.1.100`)
- کانتینر می‌تواند به شبکه محلی دسترسی داشته باشد

### راه‌حل 2: استفاده از `network_mode: host` (برای WSL2/Linux)

اگر از **WSL2** یا **Linux** استفاده می‌کنید، می‌توانید از `docker-compose.production.host-network.yml` استفاده کنید:

```bash
docker-compose -f docker-compose.production.host-network.yml up -d
```

**مزایا:**
- دسترسی مستقیم به شبکه میزبان
- ساده‌تر برای اتصال به دستگاه‌های شبکه

**محدودیت‌ها:**
- در Windows Docker Desktop (بدون WSL2) کار نمی‌کند
- امنیت کمتر (کانتینر مستقیماً به شبکه میزبان متصل است)

### راه‌حل 3: استفاده از IP Gateway

اگر راه‌حل‌های بالا کار نکرد، می‌توانید IP Gateway شبکه را پیدا کنید و از آن استفاده کنید:

```bash
# در Windows
ipconfig

# در Linux/Mac
ip route | grep default
```

سپس در `docker-compose.yml`:

```yaml
networks:
  kiosk_network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: "br0"
    ipam:
      config:
        - subnet: 192.168.1.0/24  # مطابق با شبکه شما
          gateway: 192.168.1.1    # Gateway شبکه شما
```

## تست اتصال

### تست POS

```bash
# از داخل کانتینر
docker exec -it kiosk_backend python manage.py test_pos_connection

# یا از خارج
docker exec -it kiosk_backend python manage.py test_pos_connection --host 192.168.1.100 --port 1362
```

### تست Printer

```bash
# از داخل کانتینر
docker exec -it kiosk_backend python manage.py test_printer
```

### تست دستی با ping

```bash
# تست دسترسی به شبکه
docker exec -it kiosk_backend ping 192.168.1.100

# تست دسترسی به POS
docker exec -it kiosk_backend python -c "import socket; s = socket.socket(); s.settimeout(5); result = s.connect_ex(('192.168.1.100', 1362)); print('Connected' if result == 0 else 'Failed')"

# تست دسترسی به Printer
docker exec -it kiosk_backend python -c "import socket; s = socket.socket(); s.settimeout(5); result = s.connect_ex(('192.168.1.100', 9100)); print('Connected' if result == 0 else 'Failed')"
```

## تنظیمات Environment Variables

مطمئن شوید که IP و Port دستگاه‌ها درست تنظیم شده است:

```env
# POS Configuration
POS_TCP_HOST=192.168.1.100
POS_TCP_PORT=1362
POS_TIMEOUT=30

# Printer Configuration
PRINTER_ENABLED=True
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
```

## عیب‌یابی

### مشکل: نمی‌تواند به POS/Printer وصل شود

1. **بررسی IP و Port:**
   ```bash
   # از میزبان تست کنید
   telnet 192.168.1.100 1362  # برای POS
   telnet 192.168.1.100 9100  # برای Printer
   ```

2. **بررسی Firewall:**
   - مطمئن شوید Windows Firewall مانع نمی‌شود
   - پورت‌های 1362 و 9100 را باز کنید

3. **بررسی شبکه Docker:**
   ```bash
   docker network inspect kiosk_kiosk_network
   ```

4. **لاگ‌های کانتینر:**
   ```bash
   docker logs kiosk_backend
   ```

### مشکل: در Windows کار نمی‌کند

- از `docker-compose.production.yml` استفاده کنید (با `extra_hosts`)
- یا از WSL2 استفاده کنید و `docker-compose.production.host-network.yml` را استفاده کنید

### مشکل: در Linux/WSL2 کار نمی‌کند

- از `docker-compose.production.host-network.yml` استفاده کنید
- یا مطمئن شوید که `extra_hosts` درست تنظیم شده است

## نکات مهم

1. **IP دستگاه‌ها باید ثابت باشد** - از DHCP Reservation استفاده کنید
2. **Firewall را بررسی کنید** - پورت‌های لازم باید باز باشند
3. **شبکه باید در دسترس باشد** - کانتینر و دستگاه‌ها باید در یک شبکه باشند
4. **برای Production** - از IP های ثابت استفاده کنید، نه DHCP

## مثال تنظیمات

### Windows Docker Desktop (پیش‌فرض)

```yaml
# docker-compose.production.yml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

### WSL2 یا Linux

```yaml
# docker-compose.production.host-network.yml
network_mode: host
```

