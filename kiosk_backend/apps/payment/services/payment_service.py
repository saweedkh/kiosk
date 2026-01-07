from typing import Dict, Any
from django.db import transaction
from django.utils import timezone
from apps.payment.models import Transaction
from apps.payment.selectors.transaction_selector import TransactionSelector
from apps.payment.gateway.adapter import PaymentGatewayAdapter
from apps.payment.gateway.exceptions import GatewayException
from apps.logs.services.log_service import LogService
from apps.core.exceptions.payment import PaymentFailedException


class PaymentService:
    """
    Payment processing service.
    
    This class handles all payment-related operations including
    payment initiation, verification, and status checking.
    """
    
    @staticmethod
    def generate_transaction_id() -> str:
        """
        Generate unique transaction ID.
        
        Format: TXN-YYYYMMDDHHMMSS-XXXX
        Where XXXX is microsecond suffix for uniqueness.
        
        Returns:
            str: Unique transaction ID
        """
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        random_suffix = str(timezone.now().microsecond)[:4]
        return f"TXN-{timestamp}-{random_suffix}"
    
    @staticmethod
    @transaction.atomic
    def initiate_payment(order_id: int, amount: int, order_details: Dict[str, Any]) -> Transaction:
        """
        Initiate payment transaction with payment gateway.
        
        Args:
            order_id: Order ID associated with payment
            amount: Payment amount in Rial
            order_details: Dictionary containing order details
                - order_number: Order number
                - items: List of order items
                - customer_info: Customer information (optional)
                
        Returns:
            Transaction: Created transaction instance
            
        Raises:
            GatewayException: If payment gateway is not active
            PaymentFailedException: If payment initiation fails
        """
        gateway = PaymentGatewayAdapter.get_gateway()
        transaction_id = PaymentService.generate_transaction_id()
        
        try:
            gateway_response = gateway.initiate_payment(
                amount=amount,
                order_details=order_details
            )
            
            transaction_obj = Transaction.objects.create(
                transaction_id=transaction_id,
                order_id=order_id,
                order_details=order_details,
                amount=amount,
                status='pending',
                gateway_name=gateway.__class__.__name__,
                gateway_request_data={'amount': amount, 'order_details': order_details},
                gateway_response_data=gateway_response
            )
            
            LogService.log_info(
                'payment',
                'payment_initiated',
                details={
                    'transaction_id': transaction_id,
                    'order_id': order_id,
                    'amount': amount,
                    'gateway': gateway.__class__.__name__
                }
            )
            
            return transaction_obj
            
        except Exception as e:
            LogService.log_error(
                'payment',
                'payment_initiation_failed',
                details={
                    'order_id': order_id,
                    'amount': amount,
                    'error': str(e)
                }
            )
            raise PaymentFailedException(f'Failed to initiate payment: {str(e)}')
    
    @staticmethod
    @transaction.atomic
    def verify_payment(transaction_id: str) -> Transaction:
        """
        Verify payment transaction with payment gateway.
        
        Args:
            transaction_id: Transaction ID to verify
            
        Returns:
            Transaction: Updated transaction instance with verification result
            
        Raises:
            GatewayException: If transaction not found
            PaymentFailedException: If payment verification fails
        """
        transaction_obj = TransactionSelector.get_transaction_by_transaction_id(transaction_id)
        if not transaction_obj:
            raise GatewayException('Transaction not found')
        
        gateway = PaymentGatewayAdapter.get_gateway()
        
        try:
            verification_result = gateway.verify_payment(transaction_id)
            
            # Map gateway status to transaction status
            gateway_status = verification_result.get('status', 'failed')
            if gateway_status == 'success':
                transaction_obj.status = 'success'
            elif gateway_status == 'failed':
                transaction_obj.status = 'failed'
            else:
                transaction_obj.status = 'pending'
            
            transaction_obj.gateway_response_data = verification_result
            transaction_obj.save()
            
            LogService.log_info(
                'payment',
                'payment_verified',
                details={
                    'transaction_id': transaction_id,
                    'status': transaction_obj.status
                }
            )
            
            return transaction_obj
            
        except Exception as e:
            transaction_obj.status = 'failed'
            transaction_obj.error_message = str(e)
            transaction_obj.save()
            
            LogService.log_error(
                'payment',
                'payment_verification_failed',
                details={
                    'transaction_id': transaction_id,
                    'error': str(e)
                }
            )
            raise PaymentFailedException(f'Failed to verify payment: {str(e)}')
    
    @staticmethod
    def get_payment_status(transaction_id: str) -> Transaction:
        """
        Get current payment status from payment gateway.
        
        Args:
            transaction_id: Transaction ID to check
            
        Returns:
            Transaction: Transaction instance with updated status
            
        Raises:
            GatewayException: If transaction not found or status check fails
        """
        transaction_obj = TransactionSelector.get_transaction_by_transaction_id(transaction_id)
        if not transaction_obj:
            raise GatewayException('Transaction not found')
        
        gateway = PaymentGatewayAdapter.get_gateway()
        
        try:
            status_result = gateway.get_payment_status(transaction_id)
            
            transaction_obj.gateway_response_data = status_result
            transaction_obj.status = status_result.get('status', transaction_obj.status)
            transaction_obj.save()
            
            return transaction_obj
            
        except Exception as e:
            LogService.log_error(
                'payment',
                'payment_status_check_failed',
                details={
                    'transaction_id': transaction_id,
                    'error': str(e)
                }
            )
            raise GatewayException(f'Failed to get payment status: {str(e)}')
    
    @staticmethod
    @transaction.atomic
    def handle_webhook(webhook_data: Dict[str, Any]) -> Transaction:
        """
        Handle payment gateway webhook callback.
        
        Args:
            webhook_data: Dictionary containing webhook data from payment gateway
                - transaction_id: Transaction ID
                - status: Payment status
                - amount: Payment amount
                - other gateway-specific fields
                
        Returns:
            Transaction: Updated transaction instance
            
        Raises:
            GatewayException: If transaction ID not found in webhook data or transaction not found
        """
        transaction_id = webhook_data.get('transaction_id')
        if not transaction_id:
            raise GatewayException('Transaction ID not found in webhook data')
        
        transaction_obj = TransactionSelector.get_transaction_by_transaction_id(transaction_id)
        if not transaction_obj:
            raise GatewayException('Transaction not found')
        
        gateway = PaymentGatewayAdapter.get_gateway()
        
        try:
            webhook_result = gateway.handle_webhook(webhook_data)
            
            new_status = webhook_data.get('status', transaction_obj.status)
            transaction_obj.status = new_status
            transaction_obj.gateway_response_data = webhook_result
            transaction_obj.save()
            
            LogService.log_info(
                'payment',
                'webhook_processed',
                details={
                    'transaction_id': transaction_id,
                    'status': new_status
                }
            )
            
            return transaction_obj
            
        except Exception as e:
            LogService.log_error(
                'payment',
                'webhook_processing_failed',
                details={
                    'transaction_id': transaction_id,
                    'error': str(e)
                }
            )
            raise GatewayException(f'Failed to process webhook: {str(e)}')

