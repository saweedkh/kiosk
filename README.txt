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

Install & start:
----------------
1. Extract the ZIP file
2. Start Docker Desktop and wait until it is ready
3. Edit the .env file:
   - Set a strong POSTGRES_PASSWORD
   - Set POS / printer settings if needed
   - Set BALE_BOT_TOKEN if you use Bale
4. Double-click run.bat
   - Loads Docker images only if they are missing (does NOT delete images every time)
   - Starts Postgres + backend + frontend + nginx (+ bale_bot)
   - Opens Chrome in kiosk mode at http://localhost

Stop:
-----
Run stop.bat

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
Edit .env:
  POS_TCP_HOST, POS_TCP_PORT
  PRINTER_IP, PRINTER_PORT, PRINTER_ENABLED=True
  PAYMENT_GATEWAY_NAME=pos
See NETWORK_ACCESS.md for LAN details.

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
