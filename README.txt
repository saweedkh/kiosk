==========================================
Kiosk - Installation & Startup Guide
==========================================

This package runs the kiosk locally on Windows using Docker.

Requirements:
-------------
1. Windows 10 or Windows 11
2. Docker Desktop installed and running
   https://www.docker.com/products/docker-desktop
3. Google Chrome (for kiosk fullscreen mode)
   https://www.google.com/chrome/
4. Python 3.11 32-bit (for POS DLL bridge)
   https://www.python.org/downloads/windows/

Install & start:
----------------
1. Extract the ZIP file
2. Start Docker Desktop and wait until it is ready
3. Edit the .env file:
   - Set a strong POSTGRES_PASSWORD and SECRET_KEY
   - Set POS_TCP_HOST to the card reader IP (e.g. 192.168.1.100)
   - Defaults: PAYMENT_GATEWAY_NAME=bridge, POS_USE_BRIDGE=True
   - Set BALE_BOT_TOKEN if you use Bale
4. Double-click run.bat
   - Loads Docker images from images\*.tar only if missing
     (backend, frontend, nginx, postgres — offline; no Hub pull needed)
   - bale_bot reuses the backend image (no separate bot image)
   - Starts Postgres + backend + frontend + nginx (+ bale_bot)
   - Starts PosBridge (PNA DLL) in the background
   - Opens Chrome fullscreen (app mode) at http://localhost

Exit fullscreen / work on the PC (touch kiosk):
-----------------------------------------------
1. Open admin panel (/admin) and tap "خروج از تمام‌صفحه"
   Tap "تمام‌صفحه" again to return to fullscreen.
2. Or double-click exit-kiosk.bat to close Chrome entirely
   (containers keep running; run.bat again for customer mode)

Stop everything:
----------------
Run stop.bat  (stops Docker AND PosBridge)

Update app images (new delivery):
---------------------------------
1. Replace the images\ folder with the new .tar files
   (keep your existing .env)
2. Double-click update-images.bat
   - Removes old kiosk images and loads the new .tar files
   - Keeps postgres_data and backend_media volumes
3. If Docker has I/O errors: fix-docker-safe.bat then run.bat

Do NOT use build-images.bat or rebuild-and-run.bat on the delivery
package — those scripts only exist in the source repository.

Auto-start on Windows boot:
---------------------------
1. Right-click setup-startup.bat → Run as administrator
2. To remove later:
   schtasks /delete /tn "KioskApp" /f

Database (PostgreSQL):
----------------------
- Database runs in container kiosk_db (volume: postgres_data)
- Images/media are in volume backend_media
- Daily/manual backup (DB + media):
    backup-database.bat
- Restore:
    restore-database.bat backups\kiosk_backup_XXXX.zip
- Open SQL shell:
    access-database.bat
- Full guide: DATABASE_MANAGEMENT.md

Migrating from old SQLite installs:
-----------------------------------
If you previously used db.sqlite3 and need to keep data:

1. export-sqlite-data.bat
   → creates exports\kiosk_data_....json
2. Start the new stack with run.bat
3. import-data-to-postgres.bat exports\kiosk_data_....json

Full guide: MIGRATE_SQLITE_TO_POSTGRES.md

Complete operations manual (recommended):
-----------------------------------------
OPERATIONS.md  — architecture, scripts, backup, migrate, troubleshooting

POS / Printer:
--------------
Option A — raw TCP (phase 1):
  In .env set:
    PAYMENT_GATEWAY_NAME=pos
    POS_TCP_HOST, POS_TCP_PORT
    PRINTER_IP, PRINTER_PORT, PRINTER_ENABLED=True
  See NETWORK_ACCESS.md

Option B — official PNA DLL bridge (default in delivery .env):
  run.bat starts pos_bridge automatically.
  Requirements: Python 3.11 32-bit installed once on the PC.
  In root .env:
       PAYMENT_GATEWAY_NAME=bridge
       POS_USE_BRIDGE=True
       POS_TCP_HOST=<POS IP>
       POS_BRIDGE_HOST=host.docker.internal
       POS_BRIDGE_PORT=9000
  Health: http://127.0.0.1:9000/health
  Full guide: POS_BRIDGE.md

Common issues:
--------------
1. Port 80 already in use → stop the other app or change docker-compose.yml ports
2. Docker not running → start/restart Docker Desktop
3. First start slow → waiting for Postgres + migrations is normal
4. NEVER run fix-docker-io-error.bat for normal restarts
   Only use fix-docker-safe.bat if Docker itself is corrupted
5. After .env changes → run: docker compose restart backend bale_bot
   (no full image rebuild needed)

Support:
--------
Contact your support team if problems continue.

==========================================
