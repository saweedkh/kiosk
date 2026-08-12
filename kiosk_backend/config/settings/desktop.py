"""
Desktop / Tauri settings — full Django stack, SQLite, no Docker.
"""

from .base import *  # noqa: F401,F403
from .base import _env  # noqa: F401

import os
from pathlib import Path

from apps.core.desktop_paths import ensure_data_dirs, get_package_root

DEBUG = _env('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'tauri.localhost']

DATA_DIR = ensure_data_dirs()
PACKAGE_ROOT = get_package_root()

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': str(DATA_DIR / 'kiosk.db'),
    }
}

MEDIA_ROOT = DATA_DIR / 'media'

# Prefer logs beside the Tauri EXE when KIOSK_LOG_DIR is set by the desktop shell
_log_dir = _env('KIOSK_LOG_DIR', '')
LOGS_DIR = Path(_log_dir) if _log_dir else (DATA_DIR / 'logs')
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Desktop: no bridge; Windows uses direct POS TCP/DLL via pos gateway
_PAYMENT_GATEWAY_NAME = _env(
    'PAYMENT_GATEWAY_NAME',
    'pos' if os.name == 'nt' else 'mock',
).lower()
if _PAYMENT_GATEWAY_NAME in ('bridge', 'pos_bridge', 'dll_bridge'):
    _PAYMENT_GATEWAY_NAME = 'pos'

PAYMENT_GATEWAY_CONFIG = {
    **PAYMENT_GATEWAY_CONFIG,
    'gateway_name': _PAYMENT_GATEWAY_NAME,
}

# Override file logging path from base.py → same logs folder as Tauri
for handler in LOGGING.get('handlers', {}).values():
    if handler.get('class') == 'logging.FileHandler':
        handler['filename'] = str(LOGS_DIR / 'django-app.log')

CORS_ALLOWED_ORIGINS = list(
    set(
        CORS_ALLOWED_ORIGINS
        + [
            'http://127.0.0.1:3000',
            'tauri://localhost',
            'http://tauri.localhost',
        ]
    )
)

STATIC_ROOT = DATA_DIR / 'staticfiles'
