from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from ._sqlite_postgres_utils import register_sqlite_database, require_sqlite_engine


class Command(BaseCommand):
    help = (
        'Import a JSON fixture (from export_postgres_data / dumpdata) into a SQLite file. '
        'Flushes existing SQLite rows by default. Close the kiosk EXE first.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--input',
            required=True,
            help='JSON fixture path',
        )
        parser.add_argument(
            '--sqlite-path',
            default='',
            help='SQLite file to write (default: current DATABASES default if it is SQLite)',
        )
        parser.add_argument(
            '--keep-existing',
            action='store_true',
            help='Do not flush SQLite before import',
        )

    def handle(self, *args, **options):
        input_path = Path(options['input'])
        if not input_path.is_file():
            raise CommandError(f'Import file not found: {input_path}')

        size = input_path.stat().st_size
        if size < 3:
            raise CommandError('Import file is empty.')

        sqlite_path = (options.get('sqlite_path') or '').strip()
        if sqlite_path:
            register_sqlite_database(sqlite_path, alias='sqlite_target')
            database = 'sqlite_target'
            engine = settings.DATABASES[database]['ENGINE']
        else:
            database = 'default'
            engine = settings.DATABASES['default'].get('ENGINE', '')
            sqlite_path = str(settings.DATABASES['default'].get('NAME', ''))

        require_sqlite_engine(engine)

        self.stdout.write(f'Target SQLite: {sqlite_path}')
        self.stdout.write('Applying migrations...')
        call_command('migrate', database=database, interactive=False, verbosity=1)

        if not options['keep_existing']:
            self.stdout.write('Flushing existing SQLite data (schema kept)...')
            call_command('flush', interactive=False, database=database, verbosity=1)

        self.stdout.write(f'Loading fixture ({size} bytes)...')
        call_command('loaddata', str(input_path), database=database, verbosity=1)
        call_command('setup_permission_groups', verbosity=0)

        self.stdout.write(self.style.SUCCESS(
            'Import complete. Copy product/logo images into this app media folder too '
            '(Docker: backend_media → data/media or %APPDATA%\\com.kiosk.app\\media).'
        ))
