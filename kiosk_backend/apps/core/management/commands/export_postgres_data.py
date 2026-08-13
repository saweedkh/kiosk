from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from ._sqlite_postgres_utils import DUMPDATA_EXCLUDE, require_postgres_default


class Command(BaseCommand):
    help = (
        'Export application data from PostgreSQL (Docker/default DB) to a JSON fixture. '
        'Does not write to SQLite.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            required=True,
            help='Output JSON path (e.g. /tmp/kiosk_postgres_export.json)',
        )

    def handle(self, *args, **options):
        require_postgres_default()
        output = Path(options['output'])

        self.stdout.write('Ensuring PostgreSQL migrations are applied...')
        call_command('migrate', database='default', interactive=False, verbosity=1)

        output.parent.mkdir(parents=True, exist_ok=True)
        self.stdout.write(f'Writing export to {output} ...')
        with output.open('w', encoding='utf-8') as fh:
            call_command(
                'dumpdata',
                database='default',
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
            'Import with import_data_to_sqlite (and copy media separately).'
        ))
