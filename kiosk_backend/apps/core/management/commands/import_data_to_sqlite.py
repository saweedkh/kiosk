from pathlib import Path

from django.core.management.base import BaseCommand

from ._sqlite_postgres_utils import import_dumpdata_json


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
        dest = import_dumpdata_json(
            options['input'],
            sqlite_path=options.get('sqlite_path') or '',
            keep_existing=options['keep_existing'],
            log=self.stdout.write,
        )
        self.stdout.write(self.style.SUCCESS(
            f'Import complete: {dest}. Copy product/logo images into the media folder '
            'next to this DB (%APPDATA%\\com.kiosk.desktop\\media).'
        ))
