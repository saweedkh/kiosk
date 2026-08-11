"""Load PosBridge settings from environment / .env files.

Priority (last wins for dotenv):
  1) package root `.env`  (same file as Docker / run.bat)
  2) `pos_bridge/.env`    (optional overrides)

So on a delivery machine you usually only edit the root `.env`
(POS_TCP_HOST, POS_BRIDGE_PORT, POS_BRIDGE_TOKEN, …).
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent
_PACKAGE_ROOT = _ROOT.parent

# Root first, then local overrides
load_dotenv(_PACKAGE_ROOT / '.env')
load_dotenv(_ROOT / '.env', override=True)


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None or str(value).strip() == '':
        return default
    return str(value).strip().lower() in ('1', 'true', 'yes', 'on')


def _first(*keys: str, default: str = '') -> str:
    for key in keys:
        val = os.getenv(key)
        if val is not None and str(val).strip() != '':
            return str(val).strip()
    return default


def _default_dll_path() -> Path:
    """Prefer DLL next to the bridge (delivery ZIP); else repo layout."""
    candidates = [
        _ROOT / 'pna.pcpos.dll',
        _PACKAGE_ROOT / 'kiosk_backend' / 'pna.pcpos.dll',
    ]
    for path in candidates:
        if path.is_file():
            return path.resolve()
    return candidates[0].resolve()


BRIDGE_HOST = _first('BRIDGE_HOST', default='0.0.0.0') or '0.0.0.0'
BRIDGE_PORT = int(_first('BRIDGE_PORT', 'POS_BRIDGE_PORT', default='9000') or 9000)

_dll = _first('POS_DLL_PATH')
POS_DLL_PATH = Path(_dll).expanduser().resolve() if _dll else _default_dll_path()

POS_IP = _first('POS_IP', 'POS_TCP_HOST', default='192.168.1.100')
POS_PORT = int(_first('POS_PORT', 'POS_TCP_PORT', default='1362') or 1362)
POS_TIMEOUT_SECONDS = int(
    _first('POS_TIMEOUT_SECONDS', 'POS_BRIDGE_TIMEOUT', default='120') or 120
)

BRIDGE_TOKEN = _first('BRIDGE_TOKEN', 'POS_BRIDGE_TOKEN')
DEBUG = _bool(os.getenv('BRIDGE_DEBUG'), False)
