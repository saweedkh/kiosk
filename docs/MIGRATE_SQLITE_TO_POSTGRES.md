# Migrate from SQLite to PostgreSQL

> **خلاصه فارسی:**  
> ۱) با `export-sqlite-data.bat` از داخل کانتینر (یا فایل `db.sqlite3`) یک فایل JSON در پوشه `exports` بساز.  
> ۲) استک جدید را با `run.bat` بالا بیاور (شامل Postgres).  
> ۳) با `import-data-to-postgres.bat exports\kiosk_data_....json` داده را وارد کن.  
> تصاویر داخل JSON نیستند؛ volume `backend_media` را نگه دار. جزئیات کامل پایین همین فایل است.

This guide explains how to move existing kiosk data from the old **SQLite** file (`db.sqlite3`) to the new **PostgreSQL** stack without losing products, orders, users, or settings.

Media files (product images) are **not** stored inside SQLite. Keep the Docker volume `backend_media`, or restore them from a backup that includes `media/`.

---

## Overview (two steps)

| Step | Script (Windows) | Script (Linux/macOS) | What it does |
|------|------------------|----------------------|--------------|
| 1. Export | `export-sqlite-data.bat` | `./export-sqlite-data.sh` | Reads SQLite **inside** `kiosk_backend` (or a host file you pass) and writes a JSON fixture to `exports\` |
| 2. Import | `import-data-to-postgres.bat` | `./import-data-to-postgres.sh` | After Postgres is up, loads that JSON into `kiosk_db` |

Optional one-shot (same machine, both DBs available): `migrate-sqlite-to-postgres.bat` / `.sh`

---

## Prerequisites

1. Docker Desktop is running.
2. You have either:
   - the old backend container still able to see `/app/db.sqlite3`, **or**
   - a copy of `db.sqlite3` on disk (e.g. `kiosk_backend\db.sqlite3`).
3. For **import**, the new stack must be running (`kiosk_db` + `kiosk_backend`), with the **new** backend image that includes the management commands.
4. Edit `.env` and set a strong `POSTGRES_PASSWORD` before going to production.

---

## Step 1 — Export (save your data)

Run from the folder that contains the scripts (or the delivery package folder).

### If SQLite is still inside the running backend container

```cmd
export-sqlite-data.bat
```

```bash
./export-sqlite-data.sh
```

The script:

1. Checks that `kiosk_backend` is running  
2. Looks for `/app/db.sqlite3` inside the container  
3. Runs `python manage.py export_sqlite_data`  
4. Copies the result to the host, e.g.  
   `exports\kiosk_data_20260808_193000.json`

### If the SQLite file is on the host disk

```cmd
export-sqlite-data.bat kiosk_backend\db.sqlite3
```

```bash
./export-sqlite-data.sh ./kiosk_backend/db.sqlite3
```

### If SQLite lived only in an old Docker volume

Example (volume name may differ; check with `docker volume ls`):

```bash
docker run --rm -v kiosk_backend_db:/from -v "%cd%":/to alpine cp /from/db.sqlite3 /to/db.sqlite3
```

Then:

```cmd
export-sqlite-data.bat db.sqlite3
```

**Keep the JSON file safe** (USB, network share, etc.). You need it for step 2.

---

## Step 2 — Import into PostgreSQL

1. Deploy / start the **new** production stack (includes `kiosk_db`):

```cmd
run.bat
```

or:

```cmd
docker compose up -d
```

2. Wait until `kiosk_db` and `kiosk_backend` are healthy (`docker compose ps`).

3. Import the JSON from step 1:

```cmd
import-data-to-postgres.bat exports\kiosk_data_20260808_193000.json
```

```bash
./import-data-to-postgres.sh ./exports/kiosk_data_20260808_193000.json
```

By default this **flushes** existing Postgres rows (tables stay), then loads the fixture, resets sequences, and runs `setup_permission_groups`.

To skip the flush (risk of conflicts):

```cmd
import-data-to-postgres.bat --keep-existing exports\kiosk_data_....json
```

---

## Recommended production cutover

1. **Export** while the old system still has the SQLite data.  
2. **Backup media** as well (`backup-database.bat` on the new stack later includes DB + media; on the old stack, copy `/app/media` or the `backend_media` volume).  
3. Install / start the new package (`run.bat`) with Postgres.  
4. **Import** the JSON.  
5. Verify admin login, products, and images.  
6. Only then remove old SQLite files / unused volumes.

---

## What is included / excluded in the JSON

Included: users, groups, products, categories, orders, payments, app settings, Bale-related rows, etc.

Excluded (recreated or ephemeral):

- `contenttypes` / `auth.permission` (rebuilt by migrate)
- sessions, admin log entries
- JWT blacklist tokens

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| `SQLite file not found` in container | Pass the host path to `export-sqlite-data`, or copy from the old volume first |
| `export_sqlite_data` unknown command | Backend image is old — rebuild/reload the new `kiosk-backend` image |
| Import fails with duplicate key | Re-run **without** `--keep-existing` (default flush) |
| Products OK but images missing | Restore `backend_media` or a backup that contains `media/` |
| `kiosk_db` not running | Start stack with `run.bat` / `docker compose up -d` before import |

Check logs:

```cmd
docker logs kiosk_backend
docker logs kiosk_db
```

---

## Related scripts

| Script | Purpose |
|--------|---------|
| `backup-database.bat` / `.sh` | Backup **Postgres + media** (ongoing backups after migration) |
| `restore-database.bat` / `.sh` | Restore that backup |
| `access-database.bat` / `.sh` | Open `psql` in `kiosk_db` |
| `DATABASE_MANAGEMENT.md` | Day-to-day DB operations |

---

## Security notes

- Change `POSTGRES_PASSWORD` in `.env` on every production machine.  
- Do not publish Postgres port `5432` to the public network (production compose does not publish it).  
- Treat export JSON and backup ZIPs as sensitive (they contain business data).
