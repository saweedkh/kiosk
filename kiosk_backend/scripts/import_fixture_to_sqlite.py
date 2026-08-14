#!/usr/bin/env python
"""Load a dumpdata JSON into a SQLite file using whatever Django is already installed.

Works inside an old kiosk_backend container (no new management commands, no image rebuild).
Never flushes PostgreSQL: retargets DATABASES['default'] to SQLite first.
"""
from __future__ import annotations

import os
import sys
from copy import deepcopy
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print('Usage: import_fixture_to_sqlite.py <fixture.json> <kiosk.db>', file=sys.stderr)
        return 2

    fixture = Path(sys.argv[1])
    sqlite_path = Path(sys.argv[2])
    if not fixture.is_file() or fixture.stat().st_size < 3:
        print(f'Fixture missing or empty: {fixture}', file=sys.stderr)
        return 1

    os.chdir('/app')
    if '/app' not in sys.path:
        sys.path.insert(0, '/app')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

    import django
    from django.conf import settings
    from django.core.management import call_command
    from django.db import connections

    django.setup()

    sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    cfg = deepcopy(settings.DATABASES['default'])
    cfg.update(
        {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': str(sqlite_path),
            'USER': '',
            'PASSWORD': '',
            'HOST': '',
            'PORT': '',
            'CONN_MAX_AGE': 0,
            'OPTIONS': {'timeout': 30},
        }
    )
    cfg.pop('CONN_HEALTH_CHECKS', None)
    settings.DATABASES['default'] = cfg
    connections.close_all()
    if hasattr(connections, '_settings'):
        connections._settings = None
    connections['default'].ensure_connection()

    engine = settings.DATABASES['default'].get('ENGINE', '')
    if 'sqlite' not in engine:
        print(f'Refused to continue: default engine is still {engine}', file=sys.stderr)
        return 1

    print(f'Target SQLite: {sqlite_path}')
    connections.close_all()
    for extra in ('', '-wal', '-shm', '-journal'):
        leftover = Path(str(sqlite_path) + extra)
        if leftover.is_file():
            leftover.unlink()
            print(f'Removed old {leftover.name}')
    connections['default'].ensure_connection()

    call_command('migrate', interactive=False, verbosity=1)
    call_command('flush', interactive=False, verbosity=1)
    call_command('loaddata', str(fixture), verbosity=1)
    try:
        call_command('setup_permission_groups', verbosity=0)
    except Exception as exc:  # noqa: BLE001 — old images may lack this command
        print(f'setup_permission_groups skipped: {exc}')

    print(f'Import complete: {sqlite_path} ({sqlite_path.stat().st_size} bytes)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
