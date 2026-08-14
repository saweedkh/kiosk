import logging
import os
import time
from pathlib import Path

import requests
from django.core.management.base import BaseCommand
from django.conf import settings

from apps.bale_bot.client import BaleClient
from apps.bale_bot.handlers.router import UpdateHandler
from apps.bale_bot.models import BaleBotSettings
from apps.bale_bot.services.config_service import BaleConfigService

logger = logging.getLogger(__name__)


def _acquire_single_instance_lock():
    """
    Prevent two bale_poll processes fighting over getUpdates.
    Lock file is held open for the life of this process.
    """
    try:
        from apps.core.desktop_paths import get_data_dir

        lock_path = get_data_dir() / 'bale_poll.lock'
    except Exception:
        lock_path = Path('bale_poll.lock')

    lock_path.parent.mkdir(parents=True, exist_ok=True)
    handle = open(lock_path, 'a+', encoding='utf-8')
    try:
        if os.name == 'nt':
            import msvcrt

            handle.seek(0)
            handle.write('0')
            handle.flush()
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl

            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        handle.seek(0)
        handle.truncate()
        handle.write(str(os.getpid()))
        handle.flush()
        return handle
    except OSError:
        handle.close()
        return None


class Command(BaseCommand):
    help = 'Long-poll Bale Bot API for updates and handle admin commands'

    def add_arguments(self, parser):
        parser.add_argument(
            '--timeout',
            type=int,
            default=getattr(settings, 'BALE_POLL_TIMEOUT', 25),
            help='Long-poll timeout in seconds',
        )
        parser.add_argument(
            '--idle-seconds',
            type=int,
            default=10,
            help='Sleep when bot is disabled in panel or token missing',
        )

    def handle(self, *args, **options):
        lock_handle = _acquire_single_instance_lock()
        if lock_handle is None:
            self.stdout.write(self.style.WARNING(
                'Another bale_poll is already running — exiting.'
            ))
            logger.info('bale_poll exiting: single-instance lock held')
            return

        # Master kill-switch from .env / compose — do not poll at all.
        if not getattr(settings, 'BALE_BOT_ENABLED', True):
            self.stdout.write(self.style.WARNING(
                'BALE_BOT_ENABLED=False — polling will not start. '
                'Set BALE_BOT_ENABLED=True in .env and recreate the bale_bot service.'
            ))
            logger.info('bale_poll exiting because BALE_BOT_ENABLED is False')
            lock_handle.close()
            return

        timeout = options['timeout']
        idle_seconds = options['idle_seconds']
        client = BaleClient.from_settings()
        handler = UpdateHandler(client)
        offset = None
        was_active = None
        consecutive_network_errors = 0

        self.stdout.write(self.style.SUCCESS(
            'Bale poll worker started. Enable the bot and set token from admin panel.'
        ))

        try:
            while True:
                try:
                    # Re-check env each loop in case process wasn't restarted after .env change
                    # (normally requires recreate; this still protects if settings reloaded somehow)
                    if not getattr(settings, 'BALE_BOT_ENABLED', True):
                        self.stdout.write(self.style.WARNING(
                            'BALE_BOT_ENABLED became False — stopping poll worker.'
                        ))
                        return

                    cfg = BaleBotSettings.get_solo()
                    client.refresh_credentials()
                    active = cfg.is_runtime_active()

                    if active != was_active:
                        if active:
                            self.stdout.write(self.style.SUCCESS('Bot is ENABLED — polling updates...'))
                        else:
                            if not cfg.is_env_enabled():
                                reason = 'disabled by BALE_BOT_ENABLED env'
                            elif not cfg.is_enabled:
                                reason = 'disabled in panel'
                            else:
                                reason = 'token missing'
                            self.stdout.write(self.style.WARNING(
                                f'Bot is idle ({reason}). Waiting for configuration...'
                            ))
                        was_active = active

                    if not active:
                        # Keep heartbeat while idle so "بررسی وضعیت" knows the
                        # worker process is up (waiting for panel/token).
                        BaleConfigService.mark_worker_heartbeat()
                        time.sleep(idle_seconds)
                        continue

                    # Heartbeat before long-poll so admin health is not "degraded"
                    # for the whole BALE_POLL_TIMEOUT window (often 25–30s).
                    BaleConfigService.mark_worker_heartbeat()
                    updates = client.get_updates(offset=offset, timeout=timeout)
                    consecutive_network_errors = 0
                    BaleConfigService.mark_poll_success()
                    for update in updates:
                        update_id = update.get('update_id')
                        if update_id is not None:
                            offset = update_id + 1
                        handler.handle(update)
                except KeyboardInterrupt:
                    self.stdout.write(self.style.WARNING('Stopped by user.'))
                    break
                except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as exc:
                    consecutive_network_errors += 1
                    BaleConfigService.mark_poll_error(str(exc))
                    wait = min(30, 2 + consecutive_network_errors)
                    if consecutive_network_errors == 1 or consecutive_network_errors % 5 == 0:
                        logger.warning(
                            'Bale network timeout/connection issue (retry %s): %s',
                            consecutive_network_errors,
                            exc,
                        )
                        self.stdout.write(self.style.WARNING(
                            f'Network hiccup to Bale API — retrying in {wait}s…'
                        ))
                    time.sleep(wait)
                except Exception as exc:
                    BaleConfigService.mark_poll_error(str(exc))
                    logger.exception('Bale poll loop error: %s', exc)
                    self.stderr.write(self.style.ERROR(f'Poll error: {exc}'))
                    time.sleep(5)
        finally:
            try:
                lock_handle.close()
            except Exception:
                pass
