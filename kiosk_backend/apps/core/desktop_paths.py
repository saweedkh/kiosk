"""Paths for Tauri / desktop bundle (SQLite, media, logs)."""

from __future__ import annotations

import os
import sys
from pathlib import Path


APP_ID = 'com.kiosk.desktop'
NO_DEMO_SEED_FILENAME = 'no_demo_seed'


def get_package_root() -> Path:
    """Django project root (kiosk_backend/) or folder of the frozen EXE."""
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[2]


def _appdata_dir() -> Path:
    if os.name == 'nt':
        roaming = (os.environ.get('APPDATA') or '').strip()
        if roaming:
            return Path(roaming) / APP_ID
        return Path.home() / 'AppData' / 'Roaming' / APP_ID
    return Path.home() / 'Library' / 'Application Support' / APP_ID


def get_data_dir() -> Path:
    """Always %APPDATA%\\com.kiosk.desktop (or macOS equivalent)."""
    return _appdata_dir()


def demo_seed_blocked() -> bool:
    """True after a Postgres→SQLite import so EXE must not plant cafe demo rows."""
    return (get_data_dir() / NO_DEMO_SEED_FILENAME).is_file()


def ensure_data_dirs() -> Path:
    data = get_data_dir()
    (data / 'media').mkdir(parents=True, exist_ok=True)
    (data / 'logs').mkdir(parents=True, exist_ok=True)
    return data


def resolve_pos_dll_path() -> Path:
    """
    Locate pna.pcpos.dll beside the desktop app (same folder as kiosk.exe / backend exe).
    """
    env = os.environ.get('POS_DLL_PATH', '').strip()
    if env:
        return Path(env)

    root = get_package_root()
    candidates = [
        root / 'pna.pcpos.dll',
        root.parent / 'pna.pcpos.dll',
        root / 'kiosk_backend' / 'pna.pcpos.dll',
        Path(__file__).resolve().parents[2] / 'pna.pcpos.dll',
    ]
    for path in candidates:
        if path.is_file():
            return path
    return root / 'pna.pcpos.dll'

