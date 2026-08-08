from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from ._sqlite_postgres_utils import DUMPDATA_EXCLUDE, register_sqlite_database


class Command(BaseCommand):
    help = (
        'Export application data from a SQLite file to a JSON fixture. '
        'Does not touch PostgreSQL.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--sqlite-path',
            default='/app/db.sqlite3',
            help='SQLite file path inside the process environment',
        )
        parser.add_argument(
            '--output',
            required=True,
            help='Output JSON path (e.g. /tmp/kiosk_data_export.json)',
        )

    def handle(self, *args, **options):
        sqlite_path = Path(options['sqlite_path'])
        output = Path(options['output'])

        if not sqlite_path.is_file():
            raise CommandError(
                f'SQLite file not found: {sqlite_path}. '
                'If the DB lived in a Docker volume, copy it into the container first.'
            )

        register_sqlite_database(str(sqlite_path))
        self.stdout.write(self.style.SUCCESS(f'SQLite readable: {sqlite_path}'))

        output.parent.mkdir(parents=True, exist_ok=True)
        self.stdout.write(f'Writing export to {output} ...')
        with output.open('w', encoding='utf-8') as fh:
            call_command(
                'dumpdata',
                database='sqlite_source',
                natural_foreign=True,
                natural_primary=True,
                exclude=DUMPDATA_EXCLUDE,
                indent=2,
                stdout=fh,
                verbosity=1,
            )

        size = output.stat().st_size
        if size < 3:
            raise CommandError('Export file is empty.')

        self.stdout.write(self.style.SUCCESS(
            f'Export ready: {output} ({size} bytes). '
            'Keep this file and run import-data-to-postgres later.'
        ))
