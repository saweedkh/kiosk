"""
Management command to test POS device connection.

Usage:
    python manage.py test_pos_connection
    python manage.py test_pos_connection --connection-type tcp
    python manage.py test_pos_connection --connection-type serial --port COM1
"""
import os
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from apps.payment.gateway.adapter import PaymentGatewayAdapter
from apps.payment.gateway.exceptions import GatewayException


class Command(BaseCommand):
    help = 'تست اتصال به دستگاه POS'

    def add_arguments(self, parser):
        parser.add_argument(
            '--connection-type',
            type=str,
            choices=['tcp', 'serial'],
            help='نوع اتصال (tcp یا serial)',
        )
        parser.add_argument(
            '--host',
            type=str,
            help='آدرس IP برای اتصال TCP (مثال: 192.168.1.100)',
        )
        parser.add_argument(
            '--port',
            type=str,
            help='پورت TCP یا نام پورت سریال (مثال: 1362 یا COM1)',
        )
        parser.add_argument(
            '--baudrate',
            type=int,
            help='نرخ انتقال برای پورت سریال (مثال: 9600)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== تست اتصال دستگاه POS ===\n'))
        
        # Get gateway configuration
        config = settings.PAYMENT_GATEWAY_CONFIG.copy()
        
        # Override with command line arguments if provided
        if options.get('connection_type'):
            config['connection_type'] = options['connection_type']
        
        if options.get('host'):
            config['tcp_host'] = options['host']
        
        if options.get('port'):
            if config.get('connection_type') == 'serial':
                config['serial_port'] = options['port']
            else:
                try:
                    config['tcp_port'] = int(options['port'])
                except ValueError:
                    raise CommandError(f'پورت باید یک عدد باشد: {options["port"]}')
        
        if options.get('baudrate'):
            config['serial_baudrate'] = options['baudrate']
        
        # Display configuration
        self.stdout.write('تنظیمات اتصال:')
        self.stdout.write(f'  نوع Gateway: {config.get("gateway_name", "pos")}')
        self.stdout.write(f'  نوع اتصال: {config.get("connection_type", "tcp")}')
        
        if config.get('connection_type') == 'tcp':
            self.stdout.write(f'  IP: {config.get("tcp_host", "N/A")}')
            self.stdout.write(f'  Port: {config.get("tcp_port", "N/A")}')
        else:
            self.stdout.write(f'  پورت سریال: {config.get("serial_port", "N/A")}')
            self.stdout.write(f'  Baudrate: {config.get("serial_baudrate", "N/A")}')
        
        self.stdout.write(f'  Timeout: {config.get("timeout", 30)} ثانیه\n')
        
        # Get gateway instance
        try:
            gateway = PaymentGatewayAdapter.get_gateway()
            self.stdout.write(f'Gateway انتخاب شده: {gateway.__class__.__name__}\n')
        except GatewayException as e:
            raise CommandError(f'خطا در ایجاد Gateway: {str(e)}')
        
        # Test connection
        self.stdout.write('در حال تست اتصال...\n')
        
        try:
            # Check if gateway has test_connection method
            if hasattr(gateway, 'test_connection'):
                result = gateway.test_connection()
            elif hasattr(gateway, '_test_connection'):
                # For DLL gateway
                try:
                    success = gateway._test_connection()
                    result = {
                        'success': success,
                        'message': 'اتصال موفق بود' if success else 'اتصال ناموفق بود',
                        'connection_type': config.get('connection_type', 'tcp'),
                        'details': {}
                    }
                except Exception as e:
                    result = {
                        'success': False,
                        'message': f'خطا در تست اتصال: {str(e)}',
                        'connection_type': config.get('connection_type', 'tcp'),
                        'details': {'error': str(e)}
                    }
            else:
                # Try to connect manually
                if hasattr(gateway, '_connect'):
                    try:
                        gateway._connect()
                        result = {
                            'success': True,
                            'message': 'اتصال موفق بود',
                            'connection_type': config.get('connection_type', 'tcp'),
                            'details': {}
                        }
                        if hasattr(gateway, '_disconnect'):
                            gateway._disconnect()
                    except Exception as e:
                        result = {
                            'success': False,
                            'message': f'خطا در اتصال: {str(e)}',
                            'connection_type': config.get('connection_type', 'tcp'),
                            'details': {'error': str(e)}
                        }
                else:
                    raise CommandError('Gateway انتخاب شده از تست اتصال پشتیبانی نمی‌کند.')
            
            # Display result
            self.stdout.write('\n' + '='*50 + '\n')
            if result.get('success'):
                self.stdout.write(self.style.SUCCESS('✅ نتیجه: اتصال موفق بود!'))
            else:
                self.stdout.write(self.style.ERROR('❌ نتیجه: اتصال ناموفق بود!'))
            
            self.stdout.write(f'\nپیام: {result.get("message", "N/A")}')
            self.stdout.write(f'نوع اتصال: {result.get("connection_type", "N/A")}')
            
            if result.get('details'):
                self.stdout.write('\nجزئیات:')
                for key, value in result['details'].items():
                    self.stdout.write(f'  {key}: {value}')
            
            self.stdout.write('\n' + '='*50 + '\n')
            
            if not result.get('success'):
                self.stdout.write(self.style.WARNING('\nنکات عیب‌یابی:'))
                if config.get('connection_type') == 'tcp':
                    self.stdout.write('  - بررسی کنید که IP و Port درست باشند')
                    self.stdout.write('  - مطمئن شوید که دستگاه POS و کامپیوتر در یک شبکه هستند')
                    self.stdout.write('  - فایروال را بررسی کنید')
                else:
                    self.stdout.write('  - بررسی کنید که پورت سریال درست باشد')
                    self.stdout.write('  - مطمئن شوید که دستگاه به پورت متصل است')
                    self.stdout.write('  - Baudrate را بررسی کنید')
            
        except Exception as e:
            raise CommandError(f'خطا در تست اتصال: {str(e)}')

