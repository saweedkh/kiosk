"""
Desktop / Tauri settings — full Django stack, SQLite, no Docker.
"""

from .base import *  # noqa: F401,F403
from .base import _env  # noqa: F401

import os
from pathlib import Path

from apps.core.desktop_paths import ensure_data_dirs, get_package_root

DEBUG = _env('DEBUG', 'False') == 'True'
# Bind is 0.0.0.0 so LAN clients can hit the API; allow any Host header on desktop.
_allowed = _env('ALLOWED_HOSTS', '')
if _allowed.strip():
    ALLOWED_HOSTS = [h.strip() for h in _allowed.split(',') if h.strip()]
else:
    ALLOWED_HOSTS = ['*']

DATA_DIR = ensure_data_dirs()
PACKAGE_ROOT = get_package_root()

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': str(DATA_DIR / 'kiosk.db'),
        # API + bale_poll are separate processes sharing one DB.
        'OPTIONS': {
            'timeout': 30,
        },
    }
}


def _enable_sqlite_wal(sender, connection, **kwargs):
    if connection.vendor != 'sqlite':
        return
    cursor = connection.cursor()
    cursor.execute('PRAGMA journal_mode=WAL;')
    cursor.execute('PRAGMA busy_timeout=30000;')


from django.db.backends.signals import connection_created  # noqa: E402

connection_created.connect(_enable_sqlite_wal)

MEDIA_ROOT = DATA_DIR / 'media'

# Prefer logs beside the Tauri EXE when KIOSK_LOG_DIR is set by the desktop shell
_log_dir = _env('KIOSK_LOG_DIR', '')
LOGS_DIR = Path(_log_dir) if _log_dir else (DATA_DIR / 'logs')
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Desktop: in-process pna.pcpos.dll (32-bit backend). No HTTP bridge, no raw TCP.
_PAYMENT_GATEWAY_NAME = _env(
    'PAYMENT_GATEWAY_NAME',
    'dll' if os.name == 'nt' else 'mock',
).lower()
# Legacy aliases → direct DLL
if _PAYMENT_GATEWAY_NAME in ('bridge', 'pos_bridge', 'dll_bridge', 'pos'):
    _PAYMENT_GATEWAY_NAME = 'dll'

PAYMENT_GATEWAY_CONFIG = {
    **PAYMENT_GATEWAY_CONFIG,
    'gateway_name': _PAYMENT_GATEWAY_NAME,
    # Wait longer than the device's own ~30s cancel so GetResponse arrives first.
    'timeout': int(_env('POS_TIMEOUT', '60') or 60),
}

# Override file logging path from base.py → same logs folder as Tauri
for handler in LOGGING.get('handlers', {}).values():
    if handler.get('class') == 'logging.FileHandler':
        handler['filename'] = str(LOGS_DIR / 'django-app.log')

# Packaged sidecar: Tauri captures stdout into django.log — keep console quiet.
import sys as _sys

if getattr(_sys, 'frozen', False) or _env('KIOSK_QUIET_STARTUP', '').lower() in ('1', 'true', 'yes', 'on'):
    for _logger_cfg in LOGGING.get('loggers', {}).values():
        _logger_cfg['handlers'] = [
            h for h in _logger_cfg.get('handlers', []) if h != 'console'
        ]
    LOGGING['root']['handlers'] = [
        h for h in LOGGING['root'].get('handlers', []) if h != 'console'
    ]

CORS_ALLOWED_ORIGINS = list(
    set(
        CORS_ALLOWED_ORIGINS
        + [
            'http://127.0.0.1:3000',
            'http://127.0.0.1:18765',
            'tauri://localhost',
            'http://tauri.localhost',
        ]
    )
)

STATIC_ROOT = DATA_DIR / 'staticfiles'

