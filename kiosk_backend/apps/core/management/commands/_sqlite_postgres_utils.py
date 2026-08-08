"""Shared helpers for SQLite ↔ PostgreSQL data migration commands."""

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
    settings.DATABASES[alias] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': sqlite_path,
        'OPTIONS': {'timeout': 30},
    }
    connections.databases[alias] = settings.DATABASES[alias]
    if alias in connections:
        try:
            connections[alias].close()
        except Exception:
            pass
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
