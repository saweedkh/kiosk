"""
Management command to show POS connection configuration.

Usage:
    python manage.py show_pos_config
"""
from django.core.management.base import BaseCommand

from apps.core.services.hardware_config import HardwareConfig


class Command(BaseCommand):
    help = 'نمایش تنظیمات اتصال POS (از پنل ادمین)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== تنظیمات اتصال POS (پنل ادمین) ===\n'))

        mode = HardwareConfig.payment_mode()
        config = HardwareConfig.payment_gateway_config()

        self.stdout.write(f'حالت پرداخت: {mode}')
        self.stdout.write(f'Gateway: {config.get("gateway_name")}')
        self.stdout.write(f'  IP: {config.get("tcp_host", "N/A")}')
        self.stdout.write(f'  Port: {config.get("tcp_port", "N/A")}')
        self.stdout.write(f'  Timeout: {config.get("timeout", 30)} ثانیه')
        self.stdout.write(f'  Terminal ID: {config.get("terminal_id") or "—"}')
        self.stdout.write(f'  Merchant ID: {config.get("merchant_id") or "—"}')
        self.stdout.write(f'  Message format: {config.get("pos_message_format")}')
        self.stdout.write(f'  Simple format: {config.get("pos_use_simple_format")}')
        self.stdout.write(f'  Banner: {config.get("pos_banner") or "—"}')
        self.stdout.write(f'  Mock delay: {config.get("mock_payment_delay")}s')
        self.stdout.write(f'  Mock success: {config.get("mock_payment_success")}')
        self.stdout.write('')
        self.stdout.write('منبع: تنظیمات سایت در پنل ادمین → سخت‌افزار')
        self.stdout.write(self.style.SUCCESS('\n=== پایان تنظیمات ===\n'))
