"""
Management command to send payment amount to POS device.

Usage:
    python manage.py send_pos_payment 50000
    python manage.py send_pos_payment 50000 --order-number "ORDER-001"
    python manage.py send_pos_payment 50000 --customer-name "علی احمدی"
"""
import os
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from apps.payment.gateway.adapter import PaymentGatewayAdapter
from apps.payment.gateway.exceptions import GatewayException


class Command(BaseCommand):
    help = 'ارسال مبلغ به دستگاه POS'

    def add_arguments(self, parser):
        parser.add_argument(
            'amount',
            type=int,
            help='مبلغ به ریال (مثال: 50000)',
        )
        parser.add_argument(
            '--order-number',
            type=str,
            default='',
            help='شماره سفارش (اختیاری)',
        )
        parser.add_argument(
            '--customer-name',
            type=str,
            default='',
            help='نام مشتری (اختیاری)',
        )
        parser.add_argument(
            '--payment-id',
            type=str,
            default='',
            help='شناسه پرداخت (Payment ID) - حداکثر 11 کاراکتر (اختیاری)',
        )
        parser.add_argument(
            '--bill-id',
            type=str,
            default='',
            help='شناسه قبض (Bill ID) - حداکثر 20 کاراکتر (اختیاری)',
        )
        parser.add_argument(
            '--connection-type',
            type=str,
            choices=['tcp', 'serial'],
            help='نوع اتصال (tcp یا serial)',
        )
        parser.add_argument(
            '--host',
            type=str,
            help='آدرس IP برای اتصال TCP',
        )
        parser.add_argument(
            '--port',
            type=str,
            help='پورت TCP یا نام پورت سریال',
        )

    def handle(self, *args, **options):
        amount = options['amount']
        
        if amount <= 0:
            raise CommandError('مبلغ باید بیشتر از صفر باشد')
        
        self.stdout.write(self.style.SUCCESS(f'\n=== ارسال مبلغ {amount:,} ریال به دستگاه POS ===\n'))
        
        # Get gateway configuration from admin SiteSettings
        from apps.core.services.hardware_config import HardwareConfig

        config = HardwareConfig.payment_gateway_config().copy()
        
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
        
        # Display configuration
        self.stdout.write('تنظیمات:')
        self.stdout.write(f'  مبلغ: {amount:,} ریال')
        self.stdout.write(f'  نوع Gateway: {config.get("gateway_name", "pos")}')
        self.stdout.write(f'  نوع اتصال: {config.get("connection_type", "tcp")}')
        
        if config.get('connection_type') == 'tcp':
            self.stdout.write(f'  IP: {config.get("tcp_host", "N/A")}')
            self.stdout.write(f'  Port: {config.get("tcp_port", "N/A")}')
        else:
            self.stdout.write(f'  پورت سریال: {config.get("serial_port", "N/A")}')
            self.stdout.write(f'  Baudrate: {config.get("serial_baudrate", "N/A")}')
        
        if options.get('order_number'):
            self.stdout.write(f'  شماره سفارش: {options["order_number"]}')
        if options.get('customer_name'):
            self.stdout.write(f'  نام مشتری: {options["customer_name"]}')
        if options.get('payment_id'):
            self.stdout.write(f'  شناسه پرداخت: {options["payment_id"]}')
        if options.get('bill_id'):
            self.stdout.write(f'  شناسه قبض: {options["bill_id"]}')
        
        self.stdout.write('')
        
        # Get gateway instance
        try:
            gateway = PaymentGatewayAdapter.get_gateway()
            self.stdout.write(f'Gateway: {gateway.__class__.__name__}\n')
        except GatewayException as e:
            raise CommandError(f'خطا در ایجاد Gateway: {str(e)}')
        
        # Prepare order details
        order_details = {
            'order_number': options.get('order_number') or f'TEST-{os.urandom(4).hex().upper()}',
            'customer_name': options.get('customer_name', ''),
            'payment_id': options.get('payment_id', ''),
            'bill_id': options.get('bill_id', ''),
        }
        
        # Send payment
        self.stdout.write('در حال ارسال درخواست پرداخت به دستگاه POS...')
        self.stdout.write('\n')
        self.stdout.write(self.style.WARNING('⚠️  توجه: مبلغ روی دستگاه نمایش داده می‌شود.'))
        self.stdout.write(self.style.WARNING('   لطفاً منتظر بمانید تا:'))
        self.stdout.write(self.style.WARNING('   1. کارت را بکشید'))
        self.stdout.write(self.style.WARNING('   2. رمز را وارد کنید'))
        self.stdout.write(self.style.WARNING('   3. یا در دستگاه لغو کنید'))
        self.stdout.write(self.style.WARNING('   (حداکثر 2 دقیقه منتظر می‌مانیم)\n'))
        
        try:
            result = gateway.initiate_payment(
                amount=amount,
                order_details=order_details
            )
            
            # Display result
            self.stdout.write('\n' + '='*60 + '\n')
            
            if result.get('success'):
                self.stdout.write(self.style.SUCCESS('✅ تراکنش موفق بود!'))
            else:
                self.stdout.write(self.style.ERROR('❌ تراکنش ناموفق بود!'))
            
            self.stdout.write('\nجزئیات تراکنش:')
            self.stdout.write(f'  شناسه تراکنش: {result.get("transaction_id", "N/A")}')
            self.stdout.write(f'  وضعیت: {result.get("status", "N/A")}')
            self.stdout.write(f'  مبلغ: {result.get("amount", amount):,} ریال')
            
            if result.get('response_code'):
                self.stdout.write(f'  کد پاسخ: {result.get("response_code")}')
            
            if result.get('response_message'):
                self.stdout.write(f'  پیام: {result.get("response_message")}')
            
            if result.get('reference_number'):
                self.stdout.write(f'  شماره مرجع: {result.get("reference_number")}')
            
            if result.get('card_number'):
                # Mask card number for security
                card = result.get('card_number', '')
                if len(card) > 4:
                    masked = '*' * (len(card) - 4) + card[-4:]
                    self.stdout.write(f'  شماره کارت: {masked}')
                else:
                    self.stdout.write(f'  شماره کارت: {card}')
            
            # Additional details from gateway response
            gateway_response = result.get('gateway_response', {})
            if gateway_response:
                if gateway_response.get('transaction_datetime'):
                    self.stdout.write(f'  تاریخ و زمان: {gateway_response.get("transaction_datetime")}')
                if gateway_response.get('bank_name'):
                    self.stdout.write(f'  بانک: {gateway_response.get("bank_name")}')
            
            self.stdout.write('\n' + '='*60 + '\n')
            
            # Show detailed response information (both success and error)
            self.stdout.write('\n' + self.style.WARNING('=== جزئیات پاسخ از دستگاه POS ==='))
            
            # Show parsed response if available
            if gateway_response.get('parsed_response'):
                self.stdout.write(f'\n📄 پاسخ پارس شده:')
                self.stdout.write(self.style.SUCCESS(gateway_response.get('parsed_response')))
            
            # Show raw response if available
            if gateway_response.get('raw_response'):
                self.stdout.write(f'\n📦 پاسخ خام (Raw) از دستگاه:')
                self.stdout.write(self.style.WARNING(gateway_response.get('raw_response')))
            
            # Show all available fields from gateway response
            if gateway_response:
                self.stdout.write(f'\n📋 تمام فیلدهای پاسخ:')
                import json
                self.stdout.write(json.dumps(gateway_response, indent=2, ensure_ascii=False))
            
            # If no response at all, show debugging info
            if not gateway_response.get('parsed_response') and not gateway_response.get('raw_response'):
                self.stdout.write('\n⚠️  هیچ پاسخی از دستگاه دریافت نشد!')
                self.stdout.write('\nممکن است:')
                self.stdout.write('  - دستگاه منتظر کارت است (کارت را بکشید)')
                self.stdout.write('  - دستگاه timeout شده است')
                self.stdout.write('  - خطا در ارتباط با دستگاه')
            
            self.stdout.write('')
            
        except GatewayException as e:
            self.stdout.write('\n' + '='*60 + '\n')
            self.stdout.write(self.style.ERROR(f'❌ خطا در ارسال پرداخت: {str(e)}'))
            self.stdout.write('\n' + '='*60 + '\n')
            
            self.stdout.write(self.style.WARNING('\nنکات عیب‌یابی:'))
            self.stdout.write('  - بررسی کنید که دستگاه POS روشن و متصل است')
            self.stdout.write('  - اتصال شبکه را بررسی کنید')
            self.stdout.write('  - تنظیمات IP و Port را بررسی کنید')
            self.stdout.write('  - لاگ‌های سیستم را بررسی کنید')
            
        except KeyboardInterrupt:
            self.stdout.write('\n\nعملیات توسط کاربر لغو شد.')
        except Exception as e:
            raise CommandError(f'خطای غیرمنتظره: {str(e)}')

