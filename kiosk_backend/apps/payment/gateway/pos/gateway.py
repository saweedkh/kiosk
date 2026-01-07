"""
Main POS Payment Gateway class.
"""

import threading
from typing import Dict, Any
from ..base import BasePaymentGateway
from ..exceptions import GatewayException
from .connection import POSConnection
from .message_builder import POSMessageBuilder
from .communication import POSCommunication
from .response_parser import POSResponseParser
from .payment_operations import POSPaymentOperations
from apps.logs.services.log_service import LogService


class POSPaymentGateway(BasePaymentGateway):
    """
    Payment Gateway for POS Card Reader (Pardakht Novin) - Direct Protocol.
    
    This implementation uses direct TCP/IP socket communication without DLL.
    Based on the DLL protocol analysis, it uses tag-based message format.
    
    Supports:
    - TCP/IP connection (socket)
    - Tag-based message format (same as DLL)
    - Payment ID and Bill ID support
    - Connection keep-alive during transaction
    - Thread-safe concurrent transaction handling
    """
    
    # Class-level lock and flag to ensure only one transaction at a time
    # This is shared across all instances to prevent concurrent transactions
    # to the same POS device (even if multiple gateway instances exist)
    _transaction_lock = threading.Lock()
    _transaction_in_progress = False
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        # Force TCP/IP connection
        connection_type = self.config.get('connection_type', 'tcp')
        if connection_type == 'serial':
            connection_type = 'tcp'
            import warnings
            warnings.warn('Serial connection requested but using TCP/IP instead. Set POS_CONNECTION_TYPE=tcp in .env')
        
        self.connection_type = 'tcp'  # Always TCP/IP for socket connection
        self.tcp_host = self.config.get('tcp_host', '192.168.1.100')
        self.tcp_port = self.config.get('tcp_port', 1362)
        self.timeout = self.config.get('timeout', 30)
        self.merchant_id = self.config.get('merchant_id', '')
        self.terminal_id = self.config.get('terminal_id', '')
        
        # Initialize components
        self.connection = POSConnection(self.tcp_host, self.tcp_port, self.timeout)
        self.message_builder = POSMessageBuilder(self.config, self.terminal_id, self.merchant_id)
        self.response_parser = POSResponseParser()
        self.communication = POSCommunication(self.connection, self.response_parser)
        self.payment_operations = POSPaymentOperations(
            self.connection,
            self.message_builder,
            self.communication,
            self.response_parser
        )
    
    def test_connection(self) -> Dict[str, Any]:
        """
        Test connection to POS device.
        
        Returns:
            Dict[str, Any]: Test result containing:
                - success: bool - Whether connection was successful
                - message: str - Status message
                - connection_type: str - Type of connection used
                - details: dict - Additional connection details
        """
        return self.connection.test_connection()
    
    def initiate_payment(self, amount: int, order_details: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Initiate payment transaction with POS device.
        
        IMPORTANT: This method uses fail-fast strategy. If another transaction is
        already in progress, this will immediately reject the request instead of
        waiting. The caller should retry the request.
        
        Args:
            amount: Payment amount in Rial
            order_details: Dictionary containing order details
            **kwargs: Additional gateway-specific parameters
            
        Returns:
            Dict[str, Any]: Gateway response containing transaction information
            
        Raises:
            GatewayException: If another transaction is already in progress
        """
        order_number = order_details.get('order_number', 'UNKNOWN')
        
        # Check if transaction is already in progress (fail-fast strategy)
        with self._transaction_lock:
            if self._transaction_in_progress:
                LogService.log_warning(
                    'payment',
                    'pos_transaction_rejected_busy',
                    details={
                        'order_number': order_number,
                        'amount': amount,
                        'thread_id': threading.current_thread().ident,
                        'note': 'Transaction rejected - another transaction is already in progress. Please retry.'
                    }
                )
                raise GatewayException(
                    'دستگاه POS در حال پردازش تراکنش دیگری است. '
                    'لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.'
                )
            
            # Mark transaction as in progress
            self._transaction_in_progress = True
        
        try:
            LogService.log_info(
                'payment',
                'pos_transaction_starting',
                details={
                    'order_number': order_number,
                    'amount': amount,
                    'thread_id': threading.current_thread().ident,
                    'note': 'Starting transaction - device is now busy'
                }
            )
            
            # Ensure connection is clean before starting new transaction
            # Disconnect any existing connection to start fresh
            if self.connection.is_connected():
                LogService.log_info(
                    'payment',
                    'pos_cleaning_connection_before_transaction',
                    details={
                        'order_number': order_number,
                        'note': 'Disconnecting existing connection to start fresh transaction'
                    }
                )
                self.connection.disconnect()
            
            # Process payment
            result = self.payment_operations.initiate_payment(amount, order_details)
            
            LogService.log_info(
                'payment',
                'pos_transaction_completed',
                details={
                    'order_number': order_number,
                    'amount': amount,
                    'success': result.get('success', False),
                    'thread_id': threading.current_thread().ident,
                    'note': 'Transaction completed, device is now available'
                }
            )
            
            return result
            
        except Exception as e:
            LogService.log_error(
                'payment',
                'pos_transaction_error',
                details={
                    'order_number': order_number,
                    'amount': amount,
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'thread_id': threading.current_thread().ident,
                    'note': 'Transaction failed, device will be available for next transaction'
                }
            )
            # Re-raise exception
            raise
        finally:
            # Always mark transaction as complete (even if it failed)
            # This ensures device is available for next transaction
            with self._transaction_lock:
                self._transaction_in_progress = False
                LogService.log_info(
                    'payment',
                    'pos_transaction_flag_cleared',
                    details={
                        'order_number': order_number,
                        'thread_id': threading.current_thread().ident,
                        'note': 'Transaction flag cleared, device is now available'
                    }
                )
    
    def verify_payment(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        """
        Verify payment transaction.
        
        Args:
            transaction_id: Transaction ID to verify
            **kwargs: Additional gateway-specific parameters
            
        Returns:
            Dict[str, Any]: Verification result
        """
        return self.payment_operations.verify_payment(transaction_id, **kwargs)
    
    def get_payment_status(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        """
        Get current payment status from POS device.
        
        Args:
            transaction_id: Transaction ID to check
            **kwargs: Additional gateway-specific parameters
            
        Returns:
            Dict[str, Any]: Payment status information
        """
        return self.payment_operations.get_payment_status(transaction_id, **kwargs)
    
    def cancel_payment(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        """
        Cancel a payment transaction.
        
        Args:
            transaction_id: Transaction ID to cancel
            **kwargs: Additional gateway-specific parameters
            
        Returns:
            Dict[str, Any]: Cancellation result
        """
        return self.payment_operations.cancel_payment(transaction_id, **kwargs)
    
    def handle_webhook(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle webhook callback from payment gateway.
        
        Args:
            request_data: Webhook data from payment gateway
            
        Returns:
            Dict[str, Any]: Processed webhook result
        """
        return self.payment_operations.handle_webhook(request_data)

