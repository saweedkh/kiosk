import logging
import time

from django.core.management.base import BaseCommand
from django.conf import settings

from apps.bale_bot.client import BaleClient
from apps.bale_bot.handlers.router import UpdateHandler
from apps.bale_bot.models import BaleBotSettings

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Long-poll Bale Bot API for updates and handle admin commands'

    def add_arguments(self, parser):
        parser.add_argument(
            '--timeout',
            type=int,
            default=getattr(settings, 'BALE_POLL_TIMEOUT', 30),
            help='Long-poll timeout in seconds',
        )
        parser.add_argument(
            '--idle-seconds',
            type=int,
            default=10,
            help='Sleep when bot is disabled or token missing',
        )

    def handle(self, *args, **options):
        timeout = options['timeout']
        idle_seconds = options['idle_seconds']
        client = BaleClient.from_settings()
        handler = UpdateHandler(client)
        offset = None
        was_active = None

        self.stdout.write(self.style.SUCCESS(
            'Bale poll worker started. Enable the bot and set token from admin panel.'
        ))

        while True:
            try:
                cfg = BaleBotSettings.get_solo()
                client.refresh_credentials()
                active = cfg.is_runtime_active()

                if active != was_active:
                    if active:
                        self.stdout.write(self.style.SUCCESS('Bot is ENABLED — polling updates...'))
                    else:
                        reason = 'disabled in panel' if not cfg.is_enabled else 'token missing'
                        self.stdout.write(self.style.WARNING(
                            f'Bot is idle ({reason}). Waiting for panel configuration...'
                        ))
                    was_active = active

                if not active:
                    time.sleep(idle_seconds)
                    continue

                updates = client.get_updates(offset=offset, timeout=timeout)
                for update in updates:
                    update_id = update.get('update_id')
                    if update_id is not None:
                        offset = update_id + 1
                    handler.handle(update)
            except KeyboardInterrupt:
                self.stdout.write(self.style.WARNING('Stopped by user.'))
                break
            except Exception as exc:
                logger.exception('Bale poll loop error: %s', exc)
                self.stderr.write(self.style.ERROR(f'Poll error: {exc}'))
                time.sleep(5)
