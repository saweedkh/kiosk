"""
Management command to debug POS connection and DLL issues.

Usage:
    python manage.py debug_pos
"""
import os
import sys
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from apps.payment.gateway.adapter import PaymentGatewayAdapter
from apps.payment.gateway.exceptions import GatewayException


class Command(BaseCommand):
    help = 'عیب‌یابی اتصال POS و DLL'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== عیب‌یابی اتصال POS ===\n'))
        
        # 1. Check configuration
        self.stdout.write('1. بررسی تنظیمات:')
        config = settings.PAYMENT_GATEWAY_CONFIG
        self.stdout.write(f'   Gateway Name: {config.get("gateway_name")}')
        self.stdout.write(f'   Terminal ID: {config.get("terminal_id")}')
        self.stdout.write(f'   Serial Number: {config.get("device_serial_number")}')
        self.stdout.write(f'   Connection Type: {config.get("connection_type")}')
        self.stdout.write(f'   TCP Host: {config.get("tcp_host")}')
        self.stdout.write(f'   TCP Port: {config.get("tcp_port")}')
        self.stdout.write('')
        
        # 2. Try to get gateway
        self.stdout.write('2. تلاش برای ایجاد Gateway:')
        try:
            gateway = PaymentGatewayAdapter.get_gateway()
            self.stdout.write(self.style.SUCCESS(f'   ✅ Gateway ایجاد شد: {gateway.__class__.__name__}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ❌ خطا در ایجاد Gateway: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())
        self.stdout.write('')
        
        # 3. Network connectivity test
        self.stdout.write('3. تست اتصال شبکه:')
        import socket
        tcp_host = config.get('tcp_host', '192.168.20.249')
        tcp_port = config.get('tcp_port', 1362)
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((tcp_host, tcp_port))
            sock.close()
            if result == 0:
                self.stdout.write(self.style.SUCCESS(f'   ✅ اتصال به {tcp_host}:{tcp_port} موفق است'))
            else:
                self.stdout.write(self.style.ERROR(f'   ❌ اتصال به {tcp_host}:{tcp_port} ناموفق است (کد: {result})'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ❌ خطا در تست شبکه: {str(e)}'))
        self.stdout.write('')
        
        self.stdout.write(self.style.SUCCESS('\n=== پایان عیب‌یابی ===\n'))

