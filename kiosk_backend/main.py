#!/usr/bin/env python3
"""
Kiosk desktop backend entry — Waitress WSGI for Tauri sidecar / dev.

Usage:
  python main.py                         # fast API (no migrate/seed)
  python main.py migrate                 # apply migrations (manual)
  python main.py import-json <file.json> [kiosk.db]
  python main.py bale_poll

Packaged:
  kiosk-backend.exe                      # fast API
  kiosk-backend-migrate.exe              # migrations only (console)
  kiosk-backend.exe bale_poll
"""

from __future__ import annotations

import os
import sys
import time


def _configure_stdio_utf8() -> None:
    """Windows console defaults to cp1252; Persian log lines crash colorama/Django."""
    if os.name != 'nt':
        return
    # Windowed PyInstaller exe: stdout/stderr are None — print() would kill bale_poll.
    for name in ('stdout', 'stderr'):
        if getattr(sys, name, None) is None:
            try:
                setattr(sys, name, open(os.devnull, 'w', encoding='utf-8', errors='replace'))
            except Exception:
                pass
    try:
        import ctypes

        ctypes.windll.kernel32.SetConsoleTitleW('kiosk-backend')
    except Exception:
        pass
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


def _log(msg: str) -> None:
    """Always emit startup timings (Tauri captures stderr into django.log)."""
    line = f'[kiosk-backend] {msg}'
    try:
        print(line, flush=True)
    except Exception:
        pass


def _bale_file_log(msg: str) -> None:
    try:
        from apps.core.desktop_paths import get_data_dir

        path = get_data_dir() / 'bale_poll.log'
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'a', encoding='utf-8') as fh:
            fh.write(time.strftime('%Y-%m-%d %H:%M:%S') + ' ' + msg + '\n')
    except Exception:
        pass


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


def _permission_groups_ready() -> bool:
    from django.contrib.auth.models import Group

    return Group.objects.filter(name='مدیر').exists()


def _exe_stem() -> str:
    if getattr(sys, 'frozen', False):
        return os.path.splitext(os.path.basename(sys.executable))[0].lower()
    return ''


def _run_migrate_cli() -> int:
    """Manual DB setup: migrate + permission groups. No demo seed."""
    if os.name == 'nt':
        try:
            import ctypes

            ctypes.windll.kernel32.SetConsoleTitleW('kiosk-backend-migrate')
        except Exception:
            pass

    started = time.perf_counter()
    _log('migrate: starting (no seed)')
    t0 = time.perf_counter()
    _bootstrap_django()
    _log(f'django.setup: {time.perf_counter() - t0:.1f}s')

    from django.core.management import call_command

    t1 = time.perf_counter()
    call_command('migrate', '--noinput', verbosity=1)
    _log(f'migrate: done in {time.perf_counter() - t1:.1f}s')

    t2 = time.perf_counter()
    if not _permission_groups_ready():
        call_command('setup_permission_groups', verbosity=0)
        _log(f'permission groups: created in {time.perf_counter() - t2:.1f}s')
    else:
        _log(f'permission groups: already present in {time.perf_counter() - t2:.1f}s')

    _log(f'migrate: finished in {time.perf_counter() - started:.1f}s')
    if os.name == 'nt' and _is_packaged():
        try:
            input('تمام شد. Enter بزنید تا پنجره بسته شود… ')
        except EOFError:
            pass
    return 0


def _run_cli(argv: list[str]) -> int | None:
    """Handle sidecar CLI. Return exit code, or None to start the API server."""
    stem = _exe_stem()
    cmd = argv[0].lstrip('-').replace('_', '-') if argv else ''

    if stem in ('kiosk-backend-migrate', 'kiosk-backend-setup') or cmd in (
        'migrate',
        'setup',
    ):
        return _run_migrate_cli()

    if not argv:
        return None

    if cmd in ('help', 'h'):
        print('kiosk-backend.exe                  # fast API (no migrate/seed)')
        print('kiosk-backend-migrate.exe          # apply migrations (manual)')
        print('kiosk-backend.exe migrate')
        print('kiosk-backend.exe import-json <fixture.json> [kiosk.db]')
        print('kiosk-backend.exe bale_poll')
        return 0
    if cmd in ('bale-poll', 'balepoll'):
        return _run_bale_poll_cli()
    if cmd not in ('import-json', 'importjson'):
        return None
    if len(argv) < 2:
        print('Usage: kiosk-backend.exe import-json <fixture.json> [kiosk.db]', file=sys.stderr)
        return 2

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.desktop')
    os.environ['SEED_DEMO_DATA'] = '0'
    _bootstrap_django()
    from apps.core.management.commands._sqlite_postgres_utils import import_dumpdata_json

    dest = import_dumpdata_json(
        argv[1],
        sqlite_path=argv[2] if len(argv) > 2 else '',
    )
    print(f'KIOSK_IMPORT_OK {dest}', flush=True)
    return 0


def _run_bale_poll_cli() -> int:
    """Separate OS process for Bale long-poll — crash-isolated from Waitress."""
    _bale_file_log('bale_poll process starting')
    if os.name == 'nt':
        try:
            import ctypes

            ctypes.windll.kernel32.SetConsoleTitleW('kiosk-bale-poll')
        except Exception:
            pass

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.desktop')
    # Poller must not migrate/seed — API process owns bootstrap.
    os.environ['SEED_DEMO_DATA'] = '0'
    try:
        _bootstrap_django()
    except Exception as exc:  # noqa: BLE001
        _bale_file_log(f'django.setup failed: {exc}')
        raise

    from django.conf import settings as dj_settings
    from django.core.management import call_command

    if not getattr(dj_settings, 'BALE_BOT_ENABLED', True):
        _log('bale_poll: BALE_BOT_ENABLED=False — exit')
        _bale_file_log('exit: BALE_BOT_ENABLED=False')
        return 0

    _log('bale_poll: starting separate worker process')
    _bale_file_log('calling bale_poll command')
    try:
        call_command('bale_poll')
        _bale_file_log('bale_poll command returned')
    except Exception as exc:  # noqa: BLE001
        _bale_file_log(f'bale_poll crashed: {exc}')
        raise
    return 0


def main() -> None:
    started = time.perf_counter()
    _configure_stdio_utf8()

    try:
        cli = _run_cli(sys.argv[1:])
    except Exception as exc:  # noqa: BLE001 — CLI must not start Waitress on failure
        print(f'Import failed: {exc}', file=sys.stderr, flush=True)
        raise SystemExit(1) from exc
    if cli is not None:
        raise SystemExit(cli)

    _log('starting…')

    t0 = time.perf_counter()
    _bootstrap_django()
    _log(f'django.setup: {time.perf_counter() - t0:.1f}s')
    from apps.core.desktop_paths import get_data_dir

    _log(f'data dir: {get_data_dir()}')
    _log('startup: fast path (migrate/seed skipped — use kiosk-backend-migrate.exe)')

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

    # Load POS DLL in this process (same as before isolation) so the first
    # order is a direct send_transaction, not an HTTP hop to another EXE.
    if os.name == 'nt':
        try:
            from apps.payment.gateway.pos_dll.warmup import start_async as start_pos_warmup

            start_pos_warmup()
            _log('pos warmup started (background, in-process DLL)')
        except Exception as exc:  # noqa: BLE001
            _log(f'pos warmup start failed: {exc}')

    # Bale stays a separate OS process: kiosk-backend.exe bale_poll
    serve(application, host=host, port=port, threads=6, channel_timeout=180)


if __name__ == '__main__':
    main()
