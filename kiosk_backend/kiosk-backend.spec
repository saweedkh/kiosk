# -*- mode: python ; coding: utf-8 -*-
"""Build Django backend as Tauri external binary (Windows x64).

SPECPATH is injected by PyInstaller when this file is executed (not __file__).
"""

from pathlib import Path

BACKEND = Path(SPECPATH).resolve()

block_cipher = None

a = Analysis(
    [str(BACKEND / 'main.py')],
    pathex=[str(BACKEND)],
    binaries=[],
    datas=[
        (str(BACKEND / 'apps'), 'apps'),
        (str(BACKEND / 'config'), 'config'),
        (str(BACKEND / 'manage.py'), '.'),
    ],
    hiddenimports=[
        'django',
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        'django.db.backends.sqlite3',
        'rest_framework',
        'rest_framework_simplejwt',
        'rest_framework_simplejwt.token_blacklist',
        'corsheaders',
        'django_filters',
        'drf_spectacular',
        'waitress',
        'apps.core',
        'apps.core.apps',
        'apps.products',
        'apps.products.apps',
        'apps.orders',
        'apps.orders.apps',
        'apps.payment',
        'apps.payment.apps',
        'apps.admin_panel',
        'apps.admin_panel.apps',
        'apps.accounts',
        'apps.accounts.apps',
        'apps.bale_bot',
        'apps.bale_bot.apps',
        'apps.logs',
        'apps.logs.apps',
        'config.settings.desktop',
        'config.wsgi',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['nuitka', 'PyInstaller'],
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
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
