from typing import Optional
from django.db.models import Sum, F, Prefetch, QuerySet
from apps.orders.models import Order, OrderItem


class OrderSelector:
    """
    Order query selector.
    
    This class encapsulates all database queries related to orders
    with optimized queries using select_related and prefetch_related.
    """
    
    @staticmethod
    def get_order_by_number(order_number: str) -> Optional[Order]:
        """
        Get order by order number with all items and product details prefetched.
        
        Args:
            order_number: Order number
            
        Returns:
            Optional[Order]: Order instance if found, None otherwise
        """
        return Order.objects.prefetch_related(
            Prefetch(
                'items',
                queryset=OrderItem.objects.select_related('product', 'product__category')
            )
        ).filter(order_number=order_number).first()
    
    @staticmethod
    def get_order_by_id(order_id: int) -> Optional[Order]:
        """
        Get order by ID with all items and product details prefetched.
        
        Args:
            order_id: Order ID
            
        Returns:
            Optional[Order]: Order instance if found, None otherwise
        """
        return Order.objects.prefetch_related(
            Prefetch(
                'items',
                queryset=OrderItem.objects.select_related('product', 'product__category')
            )
        ).filter(id=order_id).first()
    
    @staticmethod
    def get_orders_by_session(session_key: str) -> QuerySet[Order]:
        """
        Get all orders for a session ordered by creation date (newest first).
        
        Args:
            session_key: Django session key
            
        Returns:
            QuerySet[Order]: QuerySet of orders with items prefetched
        """
        return Order.objects.prefetch_related(
            Prefetch(
                'items',
                queryset=OrderItem.objects.select_related('product')
            )
        ).filter(session_key=session_key).order_by('-created_at')
    
    @staticmethod
    def get_order_items(order_id: int) -> QuerySet[OrderItem]:
        """
        Get all order items for an order with product and category information.
        
        Args:
            order_id: Order ID
            
        Returns:
            QuerySet[OrderItem]: QuerySet of order items with product and category prefetched
        """
        return OrderItem.objects.filter(
            order_id=order_id
        ).select_related('product', 'product__category')
    
    @staticmethod
    def calculate_order_total(order_id: int) -> int:
        """
        Calculate total amount of order items.
        
        Args:
            order_id: Order ID
            
        Returns:
            int: Total order amount in Rial (0 if order has no items)
        """
        result = OrderItem.objects.filter(
            order_id=order_id
        ).aggregate(
            total=Sum(F('quantity') * F('unit_price'))
        )
        return result['total'] or 0
    
    @staticmethod
    def get_pending_orders() -> QuerySet[Order]:
        """
        Get all pending orders ordered by creation date (newest first).
        
        Returns:
            QuerySet[Order]: QuerySet of pending orders
        """
        return Order.objects.filter(status='pending').order_by('-created_at')
    
    @staticmethod
    def get_completed_orders() -> QuerySet[Order]:
        """
        Get all completed orders ordered by creation date (newest first).
        
        Returns:
            QuerySet[Order]: QuerySet of completed orders
        """
        return Order.objects.filter(status='completed').order_by('-created_at')
    
    @staticmethod
    def get_orders_by_status(status: str) -> QuerySet[Order]:
        """
        Get orders by status ordered by creation date (newest first).
        
        Args:
            status: Order status (e.g., 'pending', 'completed', 'cancelled')
            
        Returns:
            QuerySet[Order]: QuerySet of orders with specified status
        """
        return Order.objects.filter(status=status).order_by('-created_at')

