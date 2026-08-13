"""Shared helpers for SQLite ↔ PostgreSQL data migration commands."""

from copy import deepcopy

from django.conf import settings
from django.core.management.base import CommandError
from django.db import connections

DUMPDATA_EXCLUDE = [
    'contenttypes.contenttype',
    'auth.permission',
    'admin.logentry',
    'sessions.session',
    'token_blacklist.outstandingtoken',
    'token_blacklist.blacklistedtoken',
]


def register_sqlite_database(sqlite_path: str, alias: str = 'sqlite_source') -> None:
    """
    Register a secondary SQLite DB for dumpdata.

    Django requires a full DATABASES entry (incl. TIME_ZONE, TEST, …).
    A minimal dict raises KeyError: 'TIME_ZONE' on ensure_connection().
    """
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
            'CONN_HEALTH_CHECKS': False,
            'OPTIONS': {'timeout': 30},
            'TIME_ZONE': None,
        }
    )
    cfg['OPTIONS'] = {'timeout': 30}

    settings.DATABASES[alias] = cfg

    # Force ConnectionHandler to rebuild from settings.DATABASES with defaults
    connections.close_all()
    connections._settings = None

    try:
        connections[alias].ensure_connection()
    except Exception as exc:
        raise CommandError(f'Cannot open SQLite database at {sqlite_path}: {exc}') from exc


def require_postgres_default() -> None:
    engine = settings.DATABASES['default'].get('ENGINE', '')
    if 'postgresql' not in engine:
        raise CommandError(
            f'Default database is not PostgreSQL (ENGINE={engine}). '
            'Aborting to avoid writing into the wrong database.'
        )


def require_sqlite_engine(engine: str) -> None:
    if 'sqlite' not in (engine or ''):
        raise CommandError(
            f'Target is not SQLite (ENGINE={engine}). '
            'Aborting to avoid writing into the wrong database.'
        )
