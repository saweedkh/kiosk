# -*- mode: python ; coding: utf-8 -*-
"""Build Django backend as Tauri external binary (Windows x64)."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT

block_cipher = None

a = Analysis(
    [str(BACKEND / 'main.py')],
    pathex=[str(BACKEND), str(ROOT)],
    binaries=[],
    datas=[
        (str(BACKEND / 'apps'), 'apps'),
        (str(BACKEND / 'config'), 'config'),
        (str(BACKEND / 'manage.py'), '.'),
    ],
    hiddenimports=[
        'django',
        'rest_framework',
        'rest_framework_simplejwt',
        'corsheaders',
        'django_filters',
        'drf_spectacular',
        'waitress',
        'apps.core',
        'apps.products',
        'apps.orders',
        'apps.payment',
        'apps.admin_panel',
        'apps.accounts',
        'apps.bale_bot',
        'apps.logs',
        'config.settings.desktop',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='kiosk-backend-x86_64-pc-windows-msvc',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
