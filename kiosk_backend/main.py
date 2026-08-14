#!/usr/bin/env python3
"""
Kiosk desktop backend entry — Waitress WSGI for Tauri sidecar / dev.

Usage:
  DJANGO_SETTINGS_MODULE=config.settings.desktop python main.py
"""

from __future__ import annotations

import os
import sys
import time


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


def _log(msg: str) -> None:
    """Always emit startup timings (Tauri captures stderr into django.log)."""
    print(f'[kiosk-backend] {msg}', flush=True)


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


def _has_pending_migrations() -> bool:
    from django.db import connections
    from django.db.migrations.executor import MigrationExecutor

    connection = connections['default']
    connection.ensure_connection()
    executor = MigrationExecutor(connection)
    targets = executor.loader.graph.leaf_nodes()
    return bool(executor.migration_plan(targets))


def _permission_groups_ready() -> bool:
    from django.contrib.auth.models import Group

    return Group.objects.filter(name='مدیر').exists()


def _catalog_ready() -> bool:
    from apps.products.models import Product

    return Product.objects.exists()


def _run_bootstrap_commands() -> None:
    """
    Migrate / seed only when needed so warm starts stay fast.

    First empty DB still pays for migrate + optional demo seed.
    """
    from django.core.management import call_command

    v = _startup_verbosity()
    t0 = time.perf_counter()

    if _has_pending_migrations():
        _log('migrate: pending changes — applying…')
        call_command('migrate', '--noinput', verbosity=v)
        _log(f'migrate: done in {time.perf_counter() - t0:.1f}s')
    else:
        _log(f'migrate: skipped (already current) in {time.perf_counter() - t0:.1f}s')

    t1 = time.perf_counter()
    if not _permission_groups_ready():
        call_command('setup_permission_groups', verbosity=0)
        _log(f'permission groups: created in {time.perf_counter() - t1:.1f}s')
    else:
        _log(f'permission groups: skipped in {time.perf_counter() - t1:.1f}s')

    if os.environ.get('SEED_DEMO_DATA', '1') == '0':
        _log('seed: disabled (SEED_DEMO_DATA=0)')
        return

    t2 = time.perf_counter()
    if _catalog_ready():
        _log(f'seed: skipped (catalog exists) in {time.perf_counter() - t2:.1f}s')
        return

    _log('seed: empty catalog — seeding demo data…')
    call_command('seed_demo_data', verbosity=0)
    _log(f'seed: done in {time.perf_counter() - t2:.1f}s')


def main() -> None:
    started = time.perf_counter()
    _configure_stdio_utf8()
    _log('starting…')

    t0 = time.perf_counter()
    _bootstrap_django()
    _log(f'django.setup: {time.perf_counter() - t0:.1f}s')

    _run_bootstrap_commands()

    host = os.environ.get('KIOSK_API_HOST', '0.0.0.0')
    port = int(os.environ.get('KIOSK_API_PORT', '18765'))

    from waitress import serve
    from config.wsgi import application

    _log(
        f'ready to serve http://{host}:{port}/ '
        f'(total bootstrap {time.perf_counter() - started:.1f}s)'
    )
    if not _is_packaged():
        print(f'Kiosk backend (Django) http://{host}:{port}/', flush=True)
    serve(application, host=host, port=port, threads=6, channel_timeout=120)


if __name__ == '__main__':
    main()
