"""Paths for Tauri / desktop bundle (SQLite, media, logs)."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def get_package_root() -> Path:
    """Django project root (kiosk_backend/)."""
    if getattr(sys, 'frozen', False):
        # PyInstaller one-file/one-dir: resources next to executable
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[2]


NO_DEMO_SEED_FILENAME = 'no_demo_seed'


def get_data_dir() -> Path:
    """
    Writable app data directory.
    Tauri sets KIOSK_DATA_DIR to %APPDATA%\\com.kiosk.desktop before spawning backend.
    """
    env = os.environ.get('KIOSK_DATA_DIR', '').strip()
    if env:
        return Path(env)
    return get_package_root().parent / 'data'


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

