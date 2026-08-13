#!/usr/bin/env python3
"""
Kiosk desktop backend entry — Waitress WSGI for Tauri sidecar / dev.

Usage:
  DJANGO_SETTINGS_MODULE=config.settings.desktop python main.py
"""

from __future__ import annotations

import os
import sys


def _configure_stdio_utf8() -> None:
    """Windows console defaults to cp1252; Persian log lines crash colorama/Django."""
    if os.name != 'nt':
        return
    for name in ('stdout', 'stderr'):
        stream = getattr(sys, name, None)
        if stream is None:
            continue
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, OSError, ValueError):
            pass


def _is_packaged() -> bool:
    return getattr(sys, 'frozen', False)


def _startup_verbosity() -> int:
    """Packaged exe: no migration/seed spam in django.log."""
    if _is_packaged():
        return 0
    if os.environ.get('KIOSK_QUIET_STARTUP', '').lower() in ('1', 'true', 'yes', 'on'):
        return 0
    return 1


def _bootstrap_django() -> None:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.desktop')

    # PyInstaller: add bundle root to path
    if getattr(sys, 'frozen', False):
        bundle = os.path.dirname(sys.executable)
        if bundle not in sys.path:
            sys.path.insert(0, bundle)
        os.chdir(bundle)

    import django

    django.setup()


def _run_migrations() -> None:
    from django.core.management import call_command

    v = _startup_verbosity()
    call_command('migrate', '--noinput', verbosity=v)
    call_command('setup_permission_groups', verbosity=0)
    if os.environ.get('SEED_DEMO_DATA', '1') != '0':
        call_command('seed_demo_data', verbosity=0)


def main() -> None:
    _configure_stdio_utf8()
    _bootstrap_django()
    _run_migrations()

    host = os.environ.get('KIOSK_API_HOST', '127.0.0.1')
    port = int(os.environ.get('KIOSK_API_PORT', '8000'))

    from waitress import serve
    from config.wsgi import application

    if not _is_packaged():
        print(f'Kiosk backend (Django) http://{host}:{port}/', flush=True)
    serve(application, host=host, port=port, threads=6, channel_timeout=120)


if __name__ == '__main__':
    main()
