# -*- mode: python ; coding: utf-8 -*-
# Build (Windows): pyinstaller kiosk-backend.spec
# Output: dist/kiosk-backend.exe — copy beside Tauri as
#   kiosk-backend-x86_64-pc-windows-msvc.exe

import os

from PyInstaller.building.build_main import Analysis, COLLECT, EXE, PYZ
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# SPECPATH is set by PyInstaller to the directory containing this .spec
# (do not use __file__; it is undefined when the spec is exec'd).
spec_dir = SPECPATH
project_root = spec_dir

# python-escpos ships capabilities.json (and related data) next to the package.
# Without these datas, a frozen EXE crashes on `from escpos.printer import Network`.
escpos_datas = collect_data_files("escpos")
try:
    arabic_datas = collect_data_files("arabic_reshaper")
except Exception:
    arabic_datas = []

# Receipt Persian text needs a bundled TTF (not in collectstatic).
_receipt_font = os.path.join(project_root, "static", "Vazirmatn-Bold.ttf")
if not os.path.isfile(_receipt_font):
    _receipt_font = os.path.join(
        project_root, "..", "kiosk_frontend", "public", "font", "Vazir-Bold.ttf"
    )
if not os.path.isfile(_receipt_font):
    raise SystemExit(
        "Receipt font missing. Add kiosk_backend/static/Vazirmatn-Bold.ttf "
        "or ensure kiosk_frontend/public/font/Vazir-Bold.ttf exists before building."
    )
_receipt_font_datas = [(_receipt_font, "static")]

a = Analysis(
    [os.path.join(project_root, "main.py")],
    pathex=[project_root],
    binaries=[],
    datas=[
        (os.path.join(project_root, "apps"), "apps"),
        (os.path.join(project_root, "config"), "config"),
        *_receipt_font_datas,
        *escpos_datas,
        *arabic_datas,
    ],
    hiddenimports=[
        "django",
        "django.contrib.admin",
        "django.contrib.auth",
        "django.contrib.contenttypes",
        "django.contrib.sessions",
        "django.contrib.messages",
        "django.contrib.staticfiles",
        "rest_framework",
        "rest_framework_simplejwt",
        "rest_framework_simplejwt.token_blacklist",
        "corsheaders",
        "django_filters",
        "waitress",
        "apps.accounts",
        "apps.products",
        "apps.orders",
        "apps.payment",
        "apps.admin_panel",
        "apps.core",
        "apps.bale_bot",
        "apps.logs",
        "config.settings.desktop",
        "apps.core.management.commands._sqlite_postgres_utils",
        "apps.core.management.commands.import_data_to_sqlite",
        "apps.accounts.management.commands.setup_permission_groups",
        "django.core.management.commands.loaddata",
        "django.core.management.commands.migrate",
        "django.core.management.commands.flush",
        "clr",
        "pythonnet",
        "clr_loader",
        *collect_submodules("escpos"),
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
    name="kiosk-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
