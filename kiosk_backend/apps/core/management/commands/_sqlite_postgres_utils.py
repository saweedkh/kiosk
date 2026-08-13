"""Shared helpers for SQLite ↔ PostgreSQL data migration commands."""

from copy import deepcopy
from pathlib import Path

from django.apps import apps
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

# Old Docker SiteSettings field names → current model names
_SITESETTINGS_FIELD_REMAP = {
    'pos_host': 'pos_ip',
    'printer_host': 'printer_ip',
    'payment_mode': 'pos_payment_mode',
}


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


def disable_postgres_server_side_cursors(alias: str = 'default') -> None:
    """Avoid dumpdata failing with 'cursor does not exist' on PostgreSQL."""
    engine = settings.DATABASES.get(alias, {}).get('ENGINE', '')
    if 'postgresql' not in engine:
        return
    settings.DATABASES[alias]['DISABLE_SERVER_SIDE_CURSORS'] = True
    connections.close_all()


def require_postgres_default() -> None:
    engine = settings.DATABASES['default'].get('ENGINE', '')
    if 'postgresql' not in engine:
        raise CommandError(
            f'Default database is not PostgreSQL (ENGINE={engine}). '
            'Aborting to avoid writing into the wrong database.'
        )


def retarget_default_sqlite(sqlite_path: str) -> None:
    """
    Point DATABASES['default'] at a SQLite file.

    Import/migrate must use the default alias so data migrations (RunPython)
    hit the same database. A second alias leaves those operations on the
    wrong connection.
    """
    path = Path(sqlite_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    cfg = deepcopy(settings.DATABASES['default'])
    cfg.update(
        {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': str(path),
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
    settings.DATABASES['default'] = cfg
    connections.close_all()
    connections._settings = None
    connections['default'].ensure_connection()


def sanitize_dumpdata_fixture(input_path: Path) -> Path:
    """
    Drop/rename fixture fields that no longer exist on current models.

    Live Postgres dumps can include older SiteSettings columns
    (pos_host, printer_host, payment_mode, …).
    """
    import json

    data = json.loads(Path(input_path).read_text(encoding='utf-8'))
    if not isinstance(data, list):
        raise CommandError(f'Fixture is not a JSON list: {input_path}')

    cleaned = []
    dropped = 0
    skipped_models = 0
    for obj in data:
        if not isinstance(obj, dict) or 'model' not in obj:
            continue
        label = obj['model']
        try:
            model = apps.get_model(label)
        except LookupError:
            skipped_models += 1
            continue

        fields = dict(obj.get('fields') or {})
        if label == 'core.sitesettings':
            for old, new in _SITESETTINGS_FIELD_REMAP.items():
                if old in fields and new not in fields:
                    fields[new] = fields.pop(old)
                elif old in fields:
                    fields.pop(old)
            fee = fields.get('service_fee')
            if fee is not None:
                fields.setdefault('service_fee_dine_in_amount', fee)
                fields.setdefault('service_fee_takeaway_amount', fee)
            mode = str(fields.get('pos_payment_mode') or '').strip().lower()
            if mode == 'mock':
                fields['pos_payment_mode'] = 'mock'
            elif mode:
                fields['pos_payment_mode'] = 'real'

        valid = {f.name for f in model._meta.fields} | {
            f.attname for f in model._meta.fields
        }
        new_fields = {}
        for key, value in fields.items():
            if key in valid:
                new_fields[key] = value
            else:
                dropped += 1
        cleaned.append({**obj, 'fields': new_fields})

    out = Path(input_path).with_name(Path(input_path).stem + '.sanitized.json')
    out.write_text(json.dumps(cleaned, ensure_ascii=False, indent=2), encoding='utf-8')
    return out


def require_sqlite_engine(engine: str) -> None:
    if 'sqlite' not in (engine or ''):
        raise CommandError(
            f'Target is not SQLite (ENGINE={engine}). '
            'Aborting to avoid writing into the wrong database.'
        )
