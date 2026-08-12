# Kiosk — Tauri Desktop (Full Stack)

One **Tauri** installer ships **everything**:

| Layer | Technology |
|-------|------------|
| UI | Next.js static export (customer + admin) |
| API | **Full Django REST** (same as Docker/web) |
| DB | SQLite in app data dir |
| POS | Django `pos` gateway + `pna.pcpos.dll` on Windows |

Tauri only provides the window + lifecycle; **no partial Rust API rewrite**.

## Architecture

```text
kiosk.exe (Tauri)
  ├── WebView → Next.js out/  (/, /admin, …)
  └── sidecar: kiosk-backend.exe (Django + Waitress :8000)
        └── SQLite + media + full /api/kiosk/*
```

User runs **one app**. Backend starts automatically and stops with the app.

## Dev (macOS / Linux / Windows)

```bash
# Terminal 1 — optional: backend alone
cd kiosk_backend
DJANGO_SETTINGS_MODULE=config.settings.desktop python main.py

# Terminal 2 — Tauri (falls back to python main.py if sidecar missing)
cd kiosk_desktop
npm install
npm run dev
```

On first launch without a built sidecar, Tauri spawns `python3 kiosk_backend/main.py`.

Env:

```bash
export KIOSK_DATA_DIR=/tmp/kiosk-data
export PAYMENT_GATEWAY_NAME=mock
export POS_TCP_HOST=192.168.1.100
```

## Production build (Windows)

```bat
scripts\windows\build-tauri.bat
```

Steps:

1. `build-backend-sidecar.bat` — PyInstaller → `src-tauri/binaries/kiosk-backend-x86_64-pc-windows-msvc.exe`
2. `npm run build:tauri` — static Next.js
3. `tauri build` — bundles UI + sidecar

Output:

```text
kiosk_desktop\src-tauri\target\release\kiosk.exe
kiosk_desktop\src-tauri\target\release\bundle\msi\*.msi
```

Copy `pna.pcpos.dll` next to `kiosk.exe` on the kiosk machine (optional; for real POS).

## CI build from Mac (GitHub Actions)

You cannot build Windows EXE locally on macOS; use GitHub Actions instead:

1. Push branch `feature/tauri-desktop` or `main` (or **Actions → Build Tauri Windows → Run workflow**)
2. Wait for the job on `windows-latest`
3. Download artifact **`kiosk-tauri-windows-<sha>`** (contains `kiosk.exe`, MSI/NSIS if built)

Workflow: `.github/workflows/build-tauri-windows.yml`

## Data location

| OS | Path |
|----|------|
| Windows | `%APPDATA%\com.kiosk.app\` |
| macOS | `~/Library/Application Support/com.kiosk.app/` |

Contains `kiosk.db`, `media/`, `logs/`.

## API parity

All `/api/kiosk/*` routes from Django — products, orders, payment, admin auth, settings, coupons, reports, accounts, bale, analytics.

Frontend `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api` at build time.

Relative `/media/` URLs are resolved via `lib/media-url.ts` in the WebView.

## Security (Tauri skill)

- Shell: only allowlisted sidecar + dev python
- CSP: `connect-src` / `img-src` → localhost API
- `freezePrototype: true`
- No broad filesystem permissions

## Branch

`feature/tauri-desktop`
