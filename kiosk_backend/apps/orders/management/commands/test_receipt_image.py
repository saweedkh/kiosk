"""
Django management command to test receipt image generation.
"""
from django.core.management.base import BaseCommand
from apps.orders.models import Order
from apps.orders.selectors.order_selector import OrderSelector
from apps.orders.services.receipt_service import ReceiptService
from apps.orders.services.print_service import PrintService
from django.conf import settings
import os


class Command(BaseCommand):
    help = 'Generate and save receipt image for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--order-number',
            type=str,
            help='Order number to generate receipt image for (if not provided, uses the last paid order)',
        )

    def handle(self, *args, **options):
        order_number = options.get('order_number')
        
        # Get order
        if order_number:
            order = OrderSelector.get_order_by_number(order_number)
            if not order:
                self.stdout.write(self.style.ERROR(f'❌ Order with number {order_number} not found'))
                return
        else:
            # Get last paid order
            order = Order.objects.filter(payment_status='paid').order_by('-created_at').first()
            if not order:
                self.stdout.write(self.style.ERROR('❌ No paid orders found. Please provide an order number or create a paid order first.'))
                return
            order_number = order.order_number
        
        # Check if order is paid
        if order.payment_status != 'paid':
            self.stdout.write(self.style.ERROR(f'❌ Order {order_number} is not paid. Payment status: {order.payment_status}'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'📋 Generating receipt image for order: {order_number}'))
        
        try:
            # Generate receipt data
            receipt_data = ReceiptService.generate_receipt_data(order)
            
            # Generate receipt image
            receipt_image = PrintService.generate_receipt_image(receipt_data, width=576)
            
            # Save image
            image_url = PrintService.save_receipt_image(receipt_image, order_number)
            
            # Display info
            self.stdout.write(self.style.SUCCESS('\n✅ Receipt image generated successfully!'))
            self.stdout.write(f'\n📊 Receipt Details:')
            self.stdout.write(f'   Store Name: {receipt_data.get("store_name", "N/A")}')
            self.stdout.write(f'   Date: {receipt_data.get("date", "N/A")}')
            self.stdout.write(f'   Receipt Number: {receipt_data.get("receipt_number", "N/A")}')
            self.stdout.write(f'   Total Amount: {receipt_data.get("total_amount", "N/A")}')
            self.stdout.write(f'   Items Count: {len(receipt_data.get("items", []))}')
            
            # File path
            filename = f"receipt_{order_number}.png"
            file_path = os.path.join(settings.MEDIA_ROOT, 'receipts', filename)
            
            self.stdout.write(f'\n📁 File saved to:')
            self.stdout.write(f'   {file_path}')
            
            self.stdout.write(f'\n🌐 Image URL:')
            self.stdout.write(self.style.SUCCESS(f'   {image_url}'))
            
            # Check if file exists
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                self.stdout.write(f'\n📏 File size: {file_size:,} bytes ({file_size / 1024:.2f} KB)')
            
            self.stdout.write(f'\n💡 To view the image:')
            self.stdout.write(f'   1. Open in browser: {image_url}')
            self.stdout.write(f'   2. Or use API: GET /api/kiosk/orders/receipt/{order_number}/image/')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error generating receipt image: {str(e)}'))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))

