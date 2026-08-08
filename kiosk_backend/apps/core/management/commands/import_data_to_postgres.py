from pathlib import Path

from django.apps import apps
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.core.management.color import no_style
from django.db import connections

from ._sqlite_postgres_utils import require_postgres_default


class Command(BaseCommand):
    help = (
        'Import a JSON fixture (from export_sqlite_data) into PostgreSQL. '
        'Flushes existing Postgres rows by default.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--input',
            required=True,
            help='JSON fixture path inside the container/host',
        )
        parser.add_argument(
            '--keep-existing',
            action='store_true',
            help='Do not flush PostgreSQL before import',
        )

    def handle(self, *args, **options):
        require_postgres_default()

        input_path = Path(options['input'])
        if not input_path.is_file():
            raise CommandError(f'Import file not found: {input_path}')

        size = input_path.stat().st_size
        if size < 3:
            raise CommandError('Import file is empty.')

        self.stdout.write('Ensuring PostgreSQL migrations are applied...')
        call_command('migrate', database='default', interactive=False, verbosity=1)

        if not options['keep_existing']:
            self.stdout.write('Flushing existing PostgreSQL data (schema kept)...')
            call_command('flush', interactive=False, database='default', verbosity=1)

        self.stdout.write(f'Loading fixture ({size} bytes)...')
        call_command('loaddata', str(input_path), database='default', verbosity=1)

        self._reset_postgres_sequences()
        call_command('setup_permission_groups', verbosity=1)

        self.stdout.write(self.style.SUCCESS(
            'Import complete. Media/images are separate (backend_media volume).'
        ))

    def _reset_postgres_sequences(self) -> None:
        connection = connections['default']
        models = [m for m in apps.get_models() if m._meta.managed and not m._meta.proxy]
        sql_list = connection.ops.sequence_reset_sql(no_style(), models)
        if not sql_list:
            return
        self.stdout.write('Resetting PostgreSQL sequences...')
        with connection.cursor() as cursor:
            for sql in sql_list:
                cursor.execute(sql)
