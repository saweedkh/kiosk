"""
Receipt generation service for customer transaction receipts.
"""
from typing import Dict, Any, Optional
from datetime import datetime
from django.utils import timezone
from django.conf import settings
from jdatetime import datetime as jdatetime
from apps.orders.models import Order
from apps.orders.selectors.order_selector import OrderSelector


class ReceiptService:
    """
    Receipt generation service for customer transaction receipts.
    
    This service generates receipt data in a format suitable for printing
    after successful payment.
    """
    
    # Store name from settings (with fallback to default)
    STORE_NAME = getattr(settings, 'STORE_NAME', 'نانوایی ستاره سرخ')
    
    @staticmethod
    def get_daily_receipt_number(order: Order) -> int:
        """
        Get daily receipt number for an order.
        
        This method counts how many paid orders were created on the same day
        with ID less than or equal to this order's ID, and returns that count.
        This ensures unique receipt numbers even if orders are created at the exact same time.
        
        Args:
            order: Order instance
            
        Returns:
            int: Daily receipt number (starts from 1 each day)
        """
        # Get the start and end of the day for the order's creation date
        order_date = order.created_at.date()
        start_of_day = timezone.make_aware(datetime.combine(order_date, datetime.min.time()))
        end_of_day = timezone.make_aware(datetime.combine(order_date, datetime.max.time()))
        
        # Count paid orders created on the same day with ID <= this order's ID
        # Using ID ensures unique ordering even if created_at is identical
        count = Order.objects.filter(
            payment_status='paid',
            created_at__gte=start_of_day,
            created_at__lte=end_of_day,
            id__lte=order.id
        ).count()
        
        # Receipt number is the count (first order of the day gets number 1)
        return count
    
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
                - receipt_number: Daily receipt number (starts from 1 each day)
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
        
        # Get daily receipt number (use stored value if available, otherwise calculate)
        if use_stored_receipt_number and order.receipt_number:
            receipt_number = order.receipt_number
        else:
            receipt_number = ReceiptService.get_daily_receipt_number(order)
        
        # Prepare items data (ensure items are prefetched to avoid N+1)
        items_data = []
        # Use select_related to fetch products in one query
        items = order.items.select_related('product').all()
        for item in items:
            items_data.append({
                'name': item.product.name,
                'quantity': item.quantity,
                'price': f"{item.unit_price:,} تومان"
            })
        
        return {
            'store_name': ReceiptService.STORE_NAME,
            'date': date_str,
            'time': time_str,
            'receipt_number': receipt_number,
            'order_number': order.order_number,
            'items': items_data,
            'total_amount': f"{order.total_amount:,} تومان"
        }
    
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

