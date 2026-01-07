"""
Management command to test printer connection and print a test receipt.

Usage:
    python manage.py test_printer
"""
from django.core.management.base import BaseCommand
from escpos.printer import Network
from apps.orders.services.print_service import PrintService


class Command(BaseCommand):
    help = 'تست اتصال به پرینتر و چاپ تست'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== تست اتصال به پرینتر ===\n'))
        
        # Get printer configuration
        config = PrintService.get_printer_config()
        
        # Display configuration
        self.stdout.write('تنظیمات پرینتر:')
        self.stdout.write(f'  فعال: {"✅ بله" if config.get("enabled") else "❌ خیر"}')
        self.stdout.write(f'  IP: {config.get("ip")}')
        self.stdout.write(f'  Port: {config.get("port")}')
        self.stdout.write('')
        
        # Check if printing is enabled
        if not config.get('enabled'):
            self.stdout.write(self.style.WARNING('⚠️  چاپ غیرفعال است!'))
            self.stdout.write('برای فعال کردن، PRINTER_ENABLED=True را در .env تنظیم کنید.')
            return
        
        # Test connection
        self.stdout.write('تست اتصال...')
        printer_ip = config.get('ip')
        printer_port = config.get('port', 9100)
        
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((printer_ip, printer_port))
            sock.close()
            
            if result == 0:
                self.stdout.write(self.style.SUCCESS(f'✅ اتصال به {printer_ip}:{printer_port} موفق بود!'))
            else:
                self.stdout.write(self.style.ERROR(f'❌ اتصال به {printer_ip}:{printer_port} ناموفق بود!'))
                self.stdout.write('لطفاً IP و Port را بررسی کنید.')
                return
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ خطا در اتصال: {e}'))
            return
        
        self.stdout.write('')
        
        # Test printing
        self.stdout.write('تست چاپ رسید...')
        try:
            # Create test receipt data
            from apps.orders.services.receipt_service import ReceiptService
            
            # Generate 20 test items
            test_items = []
            item_names = [
                'نوشابه', 'چیپس', 'آب معدنی', 'شیر', 'نان', 'پنیر', 'کره', 'تخم مرغ',
                'گوجه فرنگی', 'خیار', 'سیب', 'موز', 'پرتقال', 'چای', 'قهوه', 'شکر',
                'برنج', 'روغن', 'ماکارونی', 'لوبیا'
            ]
            total_amount = 0
            
            for i, name in enumerate(item_names):
                quantity = (i % 3) + 1  # 1, 2, or 3
                price = (i + 1) * 10000  # 10000, 20000, 30000, ...
                total_amount += price * quantity
                test_items.append({
                    'name': name,
                    'quantity': quantity,
                    'price': f'{price:,} تومان'
                })
            
            test_receipt_data = {
                'store_name': 'نانوایی ستاره سرخ',
                'date': '1404/10/10',
                'time': '14:30',
                'receipt_number': '999',
                'items': test_items,
                'total_amount': f'{total_amount:,} تومان'
            }
            
            # Generate complete receipt image
            receipt_image = PrintService.generate_receipt_image(test_receipt_data, width=576)
            
            # Create printer instance
            printer = Network(printer_ip, port=printer_port)
            
            # Set printer profile BEFORE using set() to avoid warnings
            printer.profile.media['width']['pixel'] = 576  # 120mm thermal printer width
            
            # Print the complete receipt image
            printer.set(align='center')
            
            # Ensure image is in RGB mode
            if receipt_image.mode != 'RGB':
                receipt_image = receipt_image.convert('RGB')
            
            # Print image
            printer.image(receipt_image, impl='bitImageRaster')
            
            # Feed paper before cutting
            printer.text("\n\n")
            
            # Cut paper
            printer.cut()
            printer.close()
            
            self.stdout.write(self.style.SUCCESS('✅ رسید تست با موفقیت چاپ شد!'))
            self.stdout.write('لطفاً پرینتر را بررسی کنید.')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ خطا در چاپ: {e}'))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))
            self.stdout.write('لطفاً تنظیمات و اتصال را بررسی کنید.')
        
        self.stdout.write('')
