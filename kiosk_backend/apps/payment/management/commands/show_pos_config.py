"""
Management command to show POS connection configuration.

Usage:
    python manage.py show_pos_config
"""
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'نمایش تنظیمات اتصال POS'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== تنظیمات اتصال POS ===\n'))
        
        config = settings.PAYMENT_GATEWAY_CONFIG
        gateway_name = config.get('gateway_name', 'mock')
        fmt = config.get('pos_message_format', 'dll_exact')
        simple = config.get('pos_use_simple_format', False)

        self.stdout.write(f'Gateway: {gateway_name}')
        if gateway_name == 'mock':
            self.stdout.write(self.style.WARNING(
                '⚠️  mock فعال است — هیچ پکتی به پوز نمی‌رود. PAYMENT_GATEWAY_NAME=pos بگذارید.'
            ))
        elif gateway_name == 'pos':
            self.stdout.write(self.style.SUCCESS('✅ درگاه واقعی پوز'))

        self.stdout.write('')
        # Connection type
        connection_type = config.get('connection_type', 'tcp')
        self.stdout.write(f'نوع اتصال: {connection_type.upper()}')
        
        if connection_type == 'tcp':
            self.stdout.write(self.style.SUCCESS('✅ استفاده از TCP/IP (Socket)'))
            self.stdout.write(f'  IP: {config.get("tcp_host", "N/A")}')
            self.stdout.write(f'  Port: {config.get("tcp_port", "N/A")}')
            self.stdout.write(f'  Timeout: {config.get("timeout", 30)} ثانیه')
        else:
            self.stdout.write(self.style.WARNING('⚠️  استفاده از Serial (توصیه نمی‌شود)'))
            self.stdout.write(f'  Port: {config.get("serial_port", "N/A")}')
            self.stdout.write(f'  Baudrate: {config.get("serial_baudrate", "N/A")}')
        
        self.stdout.write('')
        self.stdout.write('پروتکل / فریم:')
        self.stdout.write(f'  POS_MESSAGE_FORMAT: {fmt}')
        self.stdout.write(f'  POS_USE_SIMPLE_FORMAT: {simple}')
        if gateway_name == 'pos' and (fmt != 'pardakht_novin_official' or not simple):
            self.stdout.write(self.style.WARNING(
                '⚠️  برای PNA توصیه: pardakht_novin_official + POS_USE_SIMPLE_FORMAT=True'
            ))

        self.stdout.write('')
        self.stdout.write('تنظیمات دستگاه:')
        self.stdout.write(f'  Terminal ID: {config.get("terminal_id", "N/A")}')
        self.stdout.write(f'  Serial Number: {config.get("device_serial_number", "N/A")}')
        self.stdout.write(f'  Merchant ID: {config.get("merchant_id", "N/A")}')
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=== پایان تنظیمات ===\n'))

