from typing import Dict, Any
from django.db import transaction
from django.utils import timezone
from django.core.files.base import ContentFile
import json
from apps.orders.models import Invoice
from apps.orders.selectors.invoice_selector import InvoiceSelector
from apps.orders.selectors.order_selector import OrderSelector
from apps.core.invoice.generator import InvoiceGenerator
from apps.logs.services.log_service import LogService


class InvoiceService:
    """
    Invoice generation service.
    
    This class handles invoice creation, including PDF and JSON generation.
    """
    
    @staticmethod
    def generate_invoice_number() -> str:
        """
        Generate unique invoice number.
        
        Format: INV-YYYYMMDDHHMMSS-XXXX
        Where XXXX is microsecond suffix for uniqueness.
        
        Returns:
            str: Unique invoice number
        """
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        random_suffix = str(timezone.now().microsecond)[:4]
        return f"INV-{timestamp}-{random_suffix}"
    
    @staticmethod
    @transaction.atomic
    def create_invoice(order_id: int) -> Invoice:
        """
        Create invoice for an order.
        
        If invoice already exists for the order, returns existing invoice.
        Generates both PDF and JSON formats.
        
        Args:
            order_id: Order ID
            
        Returns:
            Invoice: Created or existing invoice instance
            
        Raises:
            ValueError: If order not found
        """
        order = OrderSelector.get_order_by_id(order_id)
        if not order:
            raise ValueError('Order not found')
        
        existing_invoice = InvoiceSelector.get_invoice_by_order(order_id)
        if existing_invoice:
            return existing_invoice
        
        invoice_number = InvoiceService.generate_invoice_number()
        
        invoice_data = InvoiceService.get_invoice_data(order_id)
        invoice_data['invoice_number'] = invoice_number
        
        json_string = InvoiceGenerator.generate_json(invoice_data)
        pdf_buffer = InvoiceGenerator.generate_pdf(invoice_data)
        pdf_filename = f"{invoice_number}.pdf"
        
        invoice = Invoice()
        invoice.invoice_number = invoice_number
        invoice.order = order
        invoice.json_data = json.loads(json_string)
        invoice.pdf_file.save(pdf_filename, ContentFile(pdf_buffer.read()), save=False)
        invoice.save()
        
        LogService.log_info(
            'order',
            'invoice_created',
            details={
                'invoice_id': invoice.id,
                'invoice_number': invoice_number,
                'order_id': order_id,
                'order_number': order.order_number
            }
        )
        
        return invoice
    
    @staticmethod
    def get_invoice_data(order_id: int) -> Dict[str, Any]:
        """
        Get invoice data dictionary from order.
        
        Args:
            order_id: Order ID
            
        Returns:
            Dict[str, Any]: Dictionary containing invoice data
                - invoice_number: Invoice number (if exists)
                - order_number: Order number
                - created_at: Order creation date (ISO format)
                - total_amount: Total order amount
                - status: Order status
                - payment_status: Payment status
                - items: List of order items with details
                    
        Raises:
            ValueError: If order not found
        """
        order = OrderSelector.get_order_by_id(order_id)
        if not order:
            raise ValueError('Order not found')
        
        items_data = []
        for item in order.items.all():
            items_data.append({
                'product_name': item.product.name,
                'quantity': item.quantity,
                'unit_price': item.unit_price,
                'subtotal': item.subtotal
            })
        
        return {
            'invoice_number': order.invoice.invoice_number if hasattr(order, 'invoice') else None,
            'order_number': order.order_number,
            'created_at': order.created_at.isoformat(),
            'total_amount': order.total_amount,
            'status': order.status,
            'payment_status': order.payment_status,
            'items': items_data
        }

