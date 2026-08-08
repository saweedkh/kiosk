from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        'Convenience: export from SQLite then import into PostgreSQL in one step. '
        'Prefer export_sqlite_data + import_data_to_postgres for a two-step workflow.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--sqlite-path', default='/tmp/db.sqlite3')
        parser.add_argument('--keep-existing', action='store_true')
        parser.add_argument('--export-file', default='/tmp/kiosk_sqlite_export.json')

    def handle(self, *args, **options):
        call_command(
            'export_sqlite_data',
            sqlite_path=options['sqlite_path'],
            output=options['export_file'],
        )
        kwargs = {'input': options['export_file']}
        if options['keep_existing']:
            kwargs['keep_existing'] = True
        call_command('import_data_to_postgres', **kwargs)
        self.stdout.write(self.style.SUCCESS('One-shot SQLite → PostgreSQL migration finished.'))
