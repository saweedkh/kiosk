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


def get_data_dir() -> Path:
    """
    Writable app data directory.
    Tauri sets KIOSK_DATA_DIR to %APPDATA%/com.kiosk.app before spawning backend.
    """
    env = os.environ.get('KIOSK_DATA_DIR', '').strip()
    if env:
        return Path(env)
    return get_package_root().parent / 'data'


def ensure_data_dirs() -> Path:
    data = get_data_dir()
    (data / 'media').mkdir(parents=True, exist_ok=True)
    (data / 'logs').mkdir(parents=True, exist_ok=True)
    return data
