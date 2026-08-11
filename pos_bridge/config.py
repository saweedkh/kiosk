"""Load PosBridge settings from environment / .env."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent
load_dotenv(_ROOT / '.env')

_DEFAULT_DLL = (_ROOT.parent / 'kiosk_backend' / 'pna.pcpos.dll').resolve()


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None or str(value).strip() == '':
        return default
    return str(value).strip().lower() in ('1', 'true', 'yes', 'on')


BRIDGE_HOST = os.getenv('BRIDGE_HOST', '0.0.0.0').strip() or '0.0.0.0'
BRIDGE_PORT = int(os.getenv('BRIDGE_PORT', '9000') or 9000)

_dll = (os.getenv('POS_DLL_PATH') or '').strip()
POS_DLL_PATH = Path(_dll).expanduser().resolve() if _dll else _DEFAULT_DLL

POS_IP = (os.getenv('POS_IP') or '192.168.1.100').strip()
POS_PORT = int(os.getenv('POS_PORT', '1362') or 1362)
POS_TIMEOUT_SECONDS = int(os.getenv('POS_TIMEOUT_SECONDS', '120') or 120)

BRIDGE_TOKEN = (os.getenv('BRIDGE_TOKEN') or '').strip()
DEBUG = _bool(os.getenv('BRIDGE_DEBUG'), False)
