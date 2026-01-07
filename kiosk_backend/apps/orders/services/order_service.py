from typing import List, Dict
from django.db import transaction
from django.utils import timezone
from apps.orders.models import Order, OrderItem
from apps.orders.selectors.order_selector import OrderSelector
from apps.orders.services.receipt_service import ReceiptService
from apps.orders.services.print_service import PrintService
from apps.products.models import Product
from apps.products.services.stock_service import StockService
from apps.logs.services.log_service import LogService
from apps.core.exceptions.order import OrderNotFoundException, InsufficientStockException
from apps.payment.gateway.adapter import PaymentGatewayAdapter
from apps.payment.gateway.exceptions import GatewayException
from apps.payment.services.payment_service import PaymentService


class OrderService:
    """
    Order management service.
    
    This class contains all business logic related to order processing.
    """
    
    @staticmethod
    def generate_order_number() -> str:
        """
        Generate unique order number.
        
        Format: ORD-YYYYMMDDHHMMSS-XXXX
        Where XXXX is microsecond suffix for uniqueness.
        
        Returns:
            str: Unique order number
        """
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        random_suffix = str(timezone.now().microsecond)[:4]
        return f"ORD-{timestamp}-{random_suffix}"
    
    @staticmethod
    def create_order_from_items(session_key: str, items: List[Dict], process_payment: bool = True) -> Order:
        """
        Create order from items data sent from frontend and process payment directly.
        
        This method creates an order from items data, validates stock availability,
        and immediately processes payment through POS device. If payment is successful,
        stock is decreased and order status is updated to 'paid'.
        
        Args:
            session_key: Django session key
            items: List of order items with product_id and quantity
            process_payment: If True, payment will be processed immediately via POS
            
        Returns:
            Order: Created order with payment information
            
        Raises:
            ValueError: If items list is empty or product not found
            InsufficientStockException: If insufficient stock for any item
            GatewayException: If payment gateway is not active or payment fails
        """
        if not items:
            raise ValueError('Items list is empty')
        
        order_number = OrderService.generate_order_number()
        order_items_data, total_amount = OrderService._validate_and_prepare_items(items)
        
        # Create order and items in a transaction (commit before payment processing)
        order = OrderService._create_order_with_items(
            order_number, session_key, total_amount, order_items_data
        )
        
        # Process payment immediately if requested (outside transaction to ensure order is saved)
        if process_payment:
            OrderService._process_payment(order, order_number, total_amount)
        
        return order
    
    @staticmethod
    def _validate_and_prepare_items(items: List[Dict]) -> tuple[List[Dict], int]:
        """
        Validate products and prepare order items data.
        
        Args:
            items: List of order items with product_id and quantity
            
        Returns:
            Tuple of (order_items_data, total_amount)
            
        Raises:
            ValueError: If product not found
            InsufficientStockException: If insufficient stock
        """
        order_items_data = []
        total_amount = 0
        
        for item in items:
            product_id = item['product_id']
            quantity = item['quantity']
            
            try:
                product = Product.objects.get(id=product_id, is_active=True)
            except Product.DoesNotExist:
                raise ValueError(f'Product with id {product_id} does not exist or is not active')
            
            if product.stock_quantity < quantity:
                raise InsufficientStockException(
                    f'Insufficient stock for product {product.name}. '
                    f'Available: {product.stock_quantity}, Requested: {quantity}'
                )
            
            unit_price = product.price
            total_amount += quantity * unit_price
            order_items_data.append({
                'product': product,
                'quantity': quantity,
                'unit_price': unit_price
            })
        
        return order_items_data, total_amount
    
    @staticmethod
    def _create_order_with_items(
        order_number: str, session_key: str, total_amount: int, order_items_data: List[Dict]
    ) -> Order:
        """
        Create order and order items in a transaction.
        
        Args:
            order_number: Order number
            session_key: Session key
            total_amount: Total order amount
            order_items_data: List of order item data dictionaries
            
        Returns:
            Order: Created order instance
        """
        with transaction.atomic():
            order = Order.objects.create(
                order_number=order_number,
                session_key=session_key,
                status='pending',
                total_amount=total_amount,
                payment_status='pending'
            )
            
            for item_data in order_items_data:
                OrderItem.objects.create(
                    order=order,
                    product=item_data['product'],
                    product_name=item_data['product'].name,  # Save product name as backup
                    quantity=item_data['quantity'],
                    unit_price=item_data['unit_price']
                )
            
            LogService.log_info(
                'order',
                'order_created',
                details={
                    'order_id': order.id,
                    'order_number': order_number,
                    'session_key': session_key,
                    'total_amount': total_amount
                }
            )
        
        return order
    
    @staticmethod
    def _process_payment(order: Order, order_number: str, total_amount: int) -> None:
        """
        Process payment for an order.
        
        This method handles payment processing outside of the order creation transaction
        to ensure the order is saved even if payment fails.
        
        Args:
            order: Order instance (already saved in database)
            order_number: Order number
            total_amount: Total order amount
            
        Raises:
            GatewayException: If payment gateway is not active or payment fails
        """
        try:
            gateway = PaymentGatewayAdapter.get_gateway()
            order_details = {'order_number': order_number, 'order_id': order.id}
            gateway_response = gateway.initiate_payment(amount=total_amount, order_details=order_details)
            
            LogService.log_info(
                'payment',
                'gateway_response_received',
                details={
                    'order_id': order.id,
                    'gateway_response': gateway_response,
                    'success': gateway_response.get('success'),
                    'status': gateway_response.get('status')
                }
            )
            
            transaction_id = PaymentService.generate_transaction_id()
            payment_success = OrderService._determine_payment_success(gateway_response)
            
            # Update order with payment/transaction information
            order.transaction_id = transaction_id
            order.gateway_name = gateway.__class__.__name__
            order.gateway_request_data = {'amount': total_amount, 'order_details': order_details}
            order.gateway_response_data = gateway_response
            order.order_details = order_details
            
            if payment_success:
                OrderService._handle_successful_payment(order, order_number, total_amount, transaction_id)
            else:
                error_message = gateway_response.get('response_message', 'Payment failed')
                OrderService._mark_order_as_failed(
                    order, order_number, total_amount, transaction_id, error_message
                )
                raise GatewayException(f'Payment failed: {error_message}')
                
        except GatewayException:
            raise
        except (ConnectionError, TimeoutError, OSError) as e:
            # Network-related errors
            LogService.log_error(
                'payment',
                'payment_network_error',
                details={
                    'order_id': order.id,
                    'order_number': order_number,
                    'amount': total_amount,
                    'error': str(e),
                    'error_type': type(e).__name__
                }
            )
            OrderService._mark_order_as_failed(order, order_number, total_amount, None, f'Network error: {str(e)}')
            raise GatewayException(f'Failed to process payment: Network error - {str(e)}')
        except Exception as e:
            # Unexpected errors
            LogService.log_error(
                'payment',
                'payment_processing_error',
                details={
                    'order_id': order.id,
                    'order_number': order_number,
                    'amount': total_amount,
                    'error': str(e),
                    'error_type': type(e).__name__
                }
            )
            OrderService._mark_order_as_failed(order, order_number, total_amount, None, str(e))
            raise GatewayException(f'Failed to process payment: {str(e)}')
    
    @staticmethod
    def _determine_payment_success(gateway_response: Dict) -> bool:
        """
        Determine payment success from gateway response.
        
        Args:
            gateway_response: Gateway response dictionary
            
        Returns:
            bool: True if payment was successful, False otherwise
        """
        payment_success = gateway_response.get('success', False)
        gateway_status = gateway_response.get('status', '')
        return payment_success or gateway_status == 'success'
    
    @staticmethod
    def _mark_order_as_cancelled(order: Order, order_number: str, total_amount: int, error_message: str) -> None:
        """
        Mark order as cancelled due to payment gateway not being active.
        
        Args:
            order: Order instance
            order_number: Order number
            total_amount: Total order amount
            error_message: Error message
        """
        order.payment_status = 'pending'
        order.status = 'cancelled'
        order.error_message = error_message
        order.save()
        
        LogService.log_warning(
            'payment',
            'gateway_not_active',
            details={
                'order_id': order.id,
                'order_number': order_number,
                'total_amount': total_amount,
                'message': 'Order created but payment gateway is not active'
            }
        )
    
    @staticmethod
    def _mark_order_as_failed(
        order: Order, order_number: str, total_amount: int, transaction_id: str, error_message: str
    ) -> None:
        """
        Mark order as failed due to payment failure.
        
        Args:
            order: Order instance
            order_number: Order number
            total_amount: Total order amount
            transaction_id: Transaction ID (if available)
            error_message: Error message
        """
        order.payment_status = 'failed'
        order.status = 'cancelled'
        order.error_message = error_message
        order.save()
        
        LogService.log_error(
            'payment',
            'payment_failed',
            details={
                'transaction_id': transaction_id,
                'order_id': order.id,
                'order_number': order_number,
                'amount': total_amount,
                'error': error_message
            }
        )
    
    @staticmethod
    def _handle_successful_payment(
        order: Order, order_number: str, total_amount: int, transaction_id: str
    ) -> None:
        """
        Handle successful payment: update order status, decrease stock, and print receipt.
        
        Args:
            order: Order instance
            order_number: Order number
            total_amount: Total order amount
            transaction_id: Transaction ID
        """
        order.payment_status = 'paid'
        receipt_number = ReceiptService.get_daily_receipt_number(order)
        order.receipt_number = receipt_number
        
        OrderService.update_payment_status(order.id, 'paid')
        order.refresh_from_db()
        
        PrintService.print_receipt(order)
        
        LogService.log_info(
            'payment',
            'payment_completed',
            details={
                'transaction_id': transaction_id,
                'order_id': order.id,
                'order_number': order_number,
                'receipt_number': receipt_number,
                'amount': total_amount
            }
        )
    
    @staticmethod
    def _get_order_or_raise(order_id: int) -> Order:
        """
        Get order by ID or raise exception if not found.
        
        Args:
            order_id: Order ID
            
        Returns:
            Order: Order instance
            
        Raises:
            OrderNotFoundException: If order does not exist
        """
        order = OrderSelector.get_order_by_id(order_id)
        if not order:
            raise OrderNotFoundException()
        return order
    
    @staticmethod
    @transaction.atomic
    def update_order_status(order_id: int, status: str) -> Order:
        """
        Update order status.
        
        Args:
            order_id: Order ID
            status: New status (e.g., 'pending', 'processing', 'completed', 'cancelled')
            
        Returns:
            Order: Updated order instance
            
        Raises:
            OrderNotFoundException: If order does not exist
        """
        order = OrderService._get_order_or_raise(order_id)
        old_status = order.status
        order.status = status
        order.save()
        
        LogService.log_info(
            'order',
            'order_status_updated',
            details={
                'order_id': order.id,
                'order_number': order.order_number,
                'old_status': old_status,
                'new_status': status
            }
        )
        
        return order
    
    @staticmethod
    @transaction.atomic
    def update_payment_status(order_id: int, payment_status: str) -> Order:
        """
        Update order payment status.
        
        If payment_status is 'paid', order status is also set to 'paid' and stock is decreased.
        
        Args:
            order_id: Order ID
            payment_status: New payment status (e.g., 'pending', 'paid', 'failed')
            
        Returns:
            Order: Updated order instance
            
        Raises:
            OrderNotFoundException: If order does not exist
            InsufficientStockException: If insufficient stock when trying to complete payment
        """
        order = OrderService._get_order_or_raise(order_id)
        old_payment_status = order.payment_status
        old_status = order.status
        
        if payment_status == 'paid' and old_payment_status != 'paid':
            OrderService._validate_and_decrease_stock(order)
            
            if not order.receipt_number:
                order.receipt_number = ReceiptService.get_daily_receipt_number(order)
            
            order.status = 'paid'
            PrintService.print_receipt(order)
        
        order.payment_status = payment_status
        order.save()
        
        LogService.log_info(
            'order',
            'payment_status_updated',
            details={
                'order_id': order.id,
                'order_number': order.order_number,
                'old_payment_status': old_payment_status,
                'new_payment_status': payment_status,
                'old_status': old_status,
                'new_status': order.status
            }
        )
        
        return order
    
    @staticmethod
    def _validate_and_decrease_stock(order: Order) -> None:
        """
        Validate stock availability and decrease stock for order items.
        
        Args:
            order: Order instance (must have items prefetched with select_related('product'))
            
        Raises:
            InsufficientStockException: If insufficient stock for any item
        """
        # Fetch all items with products in one query to avoid N+1
        items = list(order.items.select_related('product').all())
        
        # Validate stock for all items
        for order_item in items:
            if not order_item.product:
                # Product was deleted, skip stock validation
                continue
            if order_item.product.stock_quantity < order_item.quantity:
                raise InsufficientStockException(
                    f'Insufficient stock for product {order_item.product.name}. '
                    f'Available: {order_item.product.stock_quantity}, Requested: {order_item.quantity}'
                )
        
        # Decrease stock for all items (reuse the same list to avoid duplicate query)
        for order_item in items:
            if not order_item.product:
                # Product was deleted, skip stock decrease
                continue
            StockService.decrease_stock(
                product_id=order_item.product_id,
                quantity=order_item.quantity,
                related_order_id=order.id
            )
    
    @staticmethod
    @transaction.atomic
    def cancel_order(order_id: int) -> Order:
        """
        Cancel order and restore stock quantities if payment was completed.
        
        Args:
            order_id: Order ID to cancel
            
        Returns:
            Order: Cancelled order instance
            
        Raises:
            OrderNotFoundException: If order does not exist
            ValueError: If order status is 'completed' or 'cancelled'
        """
        order = OrderService._get_order_or_raise(order_id)
        
        if order.status in ['completed', 'cancelled']:
            raise ValueError(f'Cannot cancel order with status: {order.status}')
        
        if order.payment_status == 'paid':
            # Fetch items with products in one query to avoid N+1
            items = order.items.select_related('product').all()
            for order_item in items:
                if not order_item.product:
                    # Product was deleted, skip stock restoration
                    continue
                StockService.increase_stock(
                    product_id=order_item.product_id,
                    quantity=order_item.quantity,
                    notes=f'Order {order.order_number} cancelled'
                )
        
        order.status = 'cancelled'
        order.save()
        
        LogService.log_info(
            'order',
            'order_cancelled',
            details={
                'order_id': order.id,
                'order_number': order.order_number,
                'payment_status': order.payment_status
            }
        )
        
        return order

