"""
Receipt generation service for customer transaction receipts.
"""
from typing import Dict, Any, Optional
from django.utils import timezone
from django.conf import settings
from jdatetime import datetime as jdatetime
from apps.orders.models import Order
from apps.orders.selectors.order_selector import OrderSelector
from apps.orders.services.receipt_constants import ReceiptConstants
from apps.core.models.settings import SiteSettings


class ReceiptService:
    """
    Receipt generation service for customer transaction receipts.
    
    This service generates receipt data in a format suitable for printing
    after successful payment.
    """

    @staticmethod
    def get_receipt_branding() -> Dict[str, Any]:
        """Load store name / receipt header/footer/logo from site settings (DB only)."""
        site = SiteSettings.get_settings()
        site_name = (site.site_name or '').strip()
        # Optional receipt-specific header; otherwise use site name from DB
        header = (site.receipt_header or '').strip() or site_name
        footer = (site.receipt_footer or '').strip() or ReceiptConstants.THANK_YOU_MESSAGE
        logo_path = ''
        if site.logo:
            try:
                logo_path = site.logo.path
            except (ValueError, OSError):
                logo_path = ''
        return {
            'store_name': header,
            'thank_you_message': footer,
            'logo_path': logo_path,
            'receipt_template': site.resolve_receipt_template(),
            'receipt_template_mode': getattr(site, 'receipt_template_mode', None) or 'normal',
        }

    @staticmethod
    def get_receipt_texts() -> Dict[str, str]:
        """Backward-compatible alias for header/footer texts."""
        branding = ReceiptService.get_receipt_branding()
        return {
            'store_name': branding['store_name'],
            'thank_you_message': branding['thank_you_message'],
        }
    
    @staticmethod
    def allocate_receipt_number() -> int:
        """
        Allocate next persistent receipt number from site settings counter.
        Continues across restarts; reset only via admin panel.
        """
        return SiteSettings.allocate_next_receipt_number()

    @staticmethod
    def get_daily_receipt_number(order: Order = None) -> int:
        """
        Backward-compatible alias for allocate_receipt_number.
        """
        return ReceiptService.allocate_receipt_number()
    
    @staticmethod
    def generate_receipt_data(order: Order, use_stored_receipt_number: bool = True) -> Dict[str, Any]:
        """
        Generate receipt data for an order.
        
        Args:
            order: Order instance with items prefetched
            
        Returns:
            Dict[str, Any]: Receipt data dictionary containing:
                - store_name: Store name
                - date: Receipt date (Jalali format)
                - receipt_number: Persistent sequential receipt number
                - order_number: Order number
                - items: List of order items
                    - name: Product name
                    - quantity: Quantity
                    - price: Unit price (formatted)
                - total_amount: Total amount (formatted)
        """
        # Convert date to Jalali (Persian) calendar with time
        # First, convert to local timezone (Tehran) if USE_TZ is enabled
        if settings.USE_TZ and order.created_at.tzinfo:
            # Convert to local timezone (Tehran)
            gregorian_datetime = timezone.localtime(order.created_at)
        else:
            gregorian_datetime = order.created_at
        
        # Convert to naive datetime for jdatetime
        if gregorian_datetime.tzinfo:
            gregorian_datetime = gregorian_datetime.replace(tzinfo=None)
        
        jalali_datetime = jdatetime.fromgregorian(datetime=gregorian_datetime)
        date_str = jalali_datetime.strftime('%Y/%m/%d')
        time_str = jalali_datetime.strftime('%H:%M:%S')
        
        # Use stored receipt number; never allocate a new one during reprint
        if use_stored_receipt_number and order.receipt_number is not None and order.receipt_number > 0:
            receipt_number = order.receipt_number
        else:
            receipt_number = order.receipt_number or 0
        
        # Prepare items data (ensure items are prefetched to avoid N+1)
        items_data = []
        # Use select_related to fetch products in one query
        items = list(order.items.select_related('product').all())
        items_subtotal = 0
        for item in items:
            product_name = ''
            if item.product:
                product_name = item.product.name
            elif item.product_name:
                product_name = item.product_name
            else:
                product_name = 'محصول حذف‌شده'
            items_subtotal += int(item.quantity) * int(item.unit_price)
            items_data.append({
                'name': product_name,
                'quantity': item.quantity,
                'price': f"{item.unit_price:,} ریال"
            })

        # Prefer fee stored on the order; for older orders (fee=0) recompute from products + settings.
        fulfillment = getattr(order, 'fulfillment_type', None) or 'dine_in'
        site_settings = SiteSettings.get_settings()
        stored_fee = int(getattr(order, 'service_fee', 0) or 0)
        if stored_fee > 0:
            service_fee = stored_fee
            total_amount = int(order.total_amount or 0)
        else:
            products = [item.product for item in items if item.product_id]
            service_fee = site_settings.resolve_order_service_fee(
                products,
                fulfillment_type=fulfillment,
            )
            total_amount = items_subtotal + service_fee

        service_title = site_settings.get_service_title(fulfillment) if service_fee > 0 else ''
        if service_fee > 0:
            items_data.append({
                'name': service_title,
                'quantity': 1,
                'price': f"{service_fee:,} ریال"
            })
        
        branding = ReceiptService.get_receipt_branding()
        fulfillment_label = (
            'بیرون‌بر' if fulfillment == 'takeaway' else 'داخل سالن'
        )
        return {
            'store_name': branding['store_name'],
            'thank_you_message': branding['thank_you_message'],
            'logo_path': branding['logo_path'],
            'receipt_template': branding.get('receipt_template', 'modern'),
            'date': date_str,
            'time': time_str,
            'receipt_number': receipt_number,
            'order_number': order.order_number,
            'items': items_data,
            'service_fee': service_fee,
            'service_title': service_title,
            'items_subtotal': items_subtotal,
            'total_amount': f"{total_amount:,} ریال",
            'fulfillment_type': fulfillment,
            'fulfillment_label': fulfillment_label,
            'copy_label': '',
        }

    @staticmethod
    def generate_receipt_data_for_copy(
        order: Order,
        copy_label: str,
        use_stored_receipt_number: bool = True,
    ) -> Dict[str, Any]:
        data = ReceiptService.generate_receipt_data(
            order, use_stored_receipt_number=use_stored_receipt_number
        )
        data['copy_label'] = (copy_label or '').strip()
        return data
    
    @staticmethod
    def get_receipt_by_order_number(order_number: str) -> Optional[Dict[str, Any]]:
        """
        Get receipt data for an order by order number.
        
        Args:
            order_number: Order number
            
        Returns:
            Optional[Dict[str, Any]]: Receipt data if order found and payment successful, None otherwise
        """
        order = OrderSelector.get_order_by_number(order_number)
        
        if not order:
            return None
        
        # Only generate receipt for paid orders
        if order.payment_status != 'paid':
            return None
        
        return ReceiptService.generate_receipt_data(order)
    
    @staticmethod
    def get_receipt_by_order_id(order_id: int) -> Optional[Dict[str, Any]]:
        """
        Get receipt data for an order by order ID.
        
        Args:
            order_id: Order ID
            
        Returns:
            Optional[Dict[str, Any]]: Receipt data if order found and payment successful, None otherwise
        """
        order = OrderSelector.get_order_by_id(order_id)
        
        if not order:
            return None
        
        # Only generate receipt for paid orders
        if order.payment_status != 'paid':
            return None
        
        return ReceiptService.generate_receipt_data(order)

