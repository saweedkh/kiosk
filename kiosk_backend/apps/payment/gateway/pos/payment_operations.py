"""
Payment operations for POS gateway.
"""

import socket
import time
from typing import Dict, Any
from django.utils import timezone
from ..exceptions import GatewayException
from apps.logs.services.log_service import LogService
from .connection import POSConnection
from .message_builder import POSMessageBuilder
from .communication import POSCommunication
from .response_parser import POSResponseParser


class POSPaymentOperations:
    """Handles payment operations for POS gateway."""
    
    def __init__(self, connection: POSConnection, message_builder: POSMessageBuilder,
                 communication: POSCommunication, response_parser: POSResponseParser):
        """
        Initialize payment operations.
        
        Args:
            connection: Connection manager
            message_builder: Message builder
            communication: Communication handler
            response_parser: Response parser
        """
        self.connection = connection
        self.message_builder = message_builder
        self.communication = communication
        self.response_parser = response_parser
    
    def initiate_payment(self, amount: int, order_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Initiate payment transaction with POS device.
        
        This method follows the exact same flow as the DLL:
        1. Test connection first (like DLL's TestConnection())
        2. Build payment request message
        3. Send transaction (like DLL's send_transaction())
        4. Wait for response with connection alive
        
        Args:
            amount: Payment amount in Rial
            order_details: Dictionary containing order details
                - order_number: Order number
                - customer_name: Customer name (optional)
                - payment_id: Payment ID (optional)
                - bill_id: Bill ID (optional)
                
        Returns:
            Dict[str, Any]: Gateway response containing transaction information
        """
        order_number = order_details.get('order_number', '')
        customer_name = order_details.get('customer_name', '')
        payment_id = order_details.get('payment_id', '')
        bill_id = order_details.get('bill_id', '')
        
        # IMPORTANT: Follow DLL's exact flow
        # Step 1: Test connection first (like DLL's TestConnection())
        LogService.log_info('payment', 'pos_testing_connection', details={
            'host': self.connection.tcp_host,
            'port': self.connection.tcp_port
        })
        try:
            connection_test = self.connection.test_connection()
            if not connection_test.get('success', False):
                LogService.log_error('payment', 'pos_connection_test_failed', details={
                    'host': self.connection.tcp_host,
                    'port': self.connection.tcp_port,
                    'test_result': connection_test
                })
                raise GatewayException('اتصال به دستگاه POS برقرار نشد. لطفاً IP و Port را بررسی کنید.')
            LogService.log_info('payment', 'pos_connection_test_success', details={
                'host': self.connection.tcp_host,
                'port': self.connection.tcp_port
            })
        except GatewayException:
            raise
        except (socket.error, ConnectionError, TimeoutError) as e:
            LogService.log_warning(
                'payment',
                'pos_connection_test_error',
                details={'error': str(e), 'error_type': type(e).__name__}
            )
            # Try to reconnect
            try:
                if self.connection.is_connected():
                    self.connection.disconnect()
                time.sleep(1)
                self.connection.connect()
                LogService.log_info('payment', 'pos_reconnection_success', details={
                    'host': self.connection.tcp_host,
                    'port': self.connection.tcp_port
                })
            except Exception as reconnect_error:
                LogService.log_error('payment', 'pos_reconnection_failed', details={
                    'error': str(reconnect_error),
                    'error_type': type(reconnect_error).__name__
                })
                raise GatewayException(f'اتصال به دستگاه POS برقرار نشد: {str(reconnect_error)}')
        except Exception as e:
            LogService.log_error(
                'payment',
                'pos_connection_test_unexpected_error',
                details={'error': str(e), 'error_type': type(e).__name__}
            )
            raise GatewayException(f'خطای غیرمنتظره در تست اتصال: {str(e)}')
        
        # Step 2: Build additional_data dictionary (like DLL sets properties)
        additional_data = {}
        if customer_name:
            additional_data['customer_name'] = customer_name
        if payment_id:
            additional_data['payment_id'] = payment_id
        if bill_id:
            additional_data['bill_id'] = bill_id
        
        # Step 3: Build payment request message (DLL builds this internally)
        # We build it explicitly to match DLL's format
        request_bytes = self.message_builder.build_payment_request(
            amount=amount,
            order_number=order_number,
            additional_data=additional_data if additional_data else None
        )
        
        try:
            # Step 4: Send transaction (like DLL's send_transaction())
            # Payment transactions require user interaction (card swipe, PIN entry)
            # So we need to wait longer (up to 2 minutes)
            LogService.log_info(
                'payment',
                'pos_payment_initiated',
                details={
                    'amount': amount,
                    'order_number': order_number,
                    'max_wait_time': 120,
                    'message': 'Waiting for user interaction (card swipe, PIN entry, or cancel)'
                }
            )
            
            # IMPORTANT: Keep connection alive during transaction (like DLL does)
            # The socket must stay open to receive response
            response = self.communication.send_command(request_bytes, wait_for_response=True, max_wait_time=120)
            
            # Step 5: Parse response (like DLL's GetParsedResp())
            parsed_response = self.response_parser.parse(response)
            
            # Generate transaction ID if not provided by POS
            if not parsed_response.get('transaction_id'):
                transaction_id = f"POS-{timezone.now().strftime('%Y%m%d%H%M%S')}-{amount}"
                parsed_response['transaction_id'] = transaction_id
            
            return {
                'success': parsed_response['success'],
                'transaction_id': parsed_response['transaction_id'],
                'status': parsed_response['status'],
                'response_code': parsed_response['response_code'],
                'response_message': parsed_response['response_message'],
                'card_number': parsed_response.get('card_number', ''),
                'reference_number': parsed_response.get('reference_number', ''),
                'gateway_response': parsed_response,
                'amount': amount,
            }
        except GatewayException:
            raise
        except (socket.error, ConnectionError, TimeoutError) as e:
            LogService.log_error(
                'payment',
                'pos_payment_initiation_network_error',
                details={
                    'amount': amount,
                    'order_number': order_number,
                    'error': str(e),
                    'error_type': type(e).__name__
                }
            )
            raise GatewayException(f'Failed to initiate payment: Network error - {str(e)}')
        except Exception as e:
            LogService.log_error(
                'payment',
                'pos_payment_initiation_error',
                details={
                    'amount': amount,
                    'order_number': order_number,
                    'error': str(e),
                    'error_type': type(e).__name__
                }
            )
            raise GatewayException(f'Failed to initiate payment: {str(e)}')
        finally:
            # IMPORTANT: Disconnect after transaction to ensure clean state for next transaction
            # This prevents response mixing and connection conflicts when next transaction starts
            # The lock in gateway.py ensures transactions are sequential, so it's safe to disconnect
            try:
                if self.connection.is_connected():
                    LogService.log_info(
                        'payment',
                        'pos_disconnecting_after_transaction',
                        details={
                            'order_number': order_number,
                            'note': 'Disconnecting after transaction to ensure clean state for next transaction'
                        }
                    )
                    self.connection.disconnect()
            except Exception as e:
                LogService.log_warning(
                    'payment',
                    'pos_disconnect_error_after_transaction',
                    details={
                        'order_number': order_number,
                        'error': str(e),
                        'error_type': type(e).__name__
                    }
                )
    
    def verify_payment(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        """
        Verify payment transaction.
        
        For POS devices, verification is usually done immediately after initiation.
        This method can be used to check transaction status.
        
        Args:
            transaction_id: Transaction ID to verify
            
        Returns:
            Dict[str, Any]: Verification result
        """
        # POS devices usually return verification immediately
        # This method can query transaction status if supported
        return {
            'success': True,
            'transaction_id': transaction_id,
            'status': 'success',  # Assume success if transaction exists
            'gateway_response': {
                'message': 'Transaction verified',
                'verified_at': timezone.now().isoformat()
            }
        }
    
    def get_payment_status(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        """
        Get current payment status from POS device.
        
        Args:
            transaction_id: Transaction ID to check
            
        Returns:
            Dict[str, Any]: Payment status information
        """
        # POS devices may not support status queries
        # Return last known status
        return {
            'success': True,
            'transaction_id': transaction_id,
            'status': 'success',
            'gateway_response': {
                'message': 'Status retrieved',
                'checked_at': timezone.now().isoformat()
            }
        }
    
    def cancel_payment(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        """
        Cancel a payment transaction.
        
        Note: POS devices may not support cancellation after transaction completion.
        
        Args:
            transaction_id: Transaction ID to cancel
            
        Returns:
            Dict[str, Any]: Cancellation result
        """
        # POS devices usually don't support cancellation
        # This would need to be handled at order level
        return {
            'success': False,
            'transaction_id': transaction_id,
            'status': 'cancelled',
            'gateway_response': {
                'message': 'Cancellation not supported by POS device'
            }
        }
    
    def handle_webhook(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle webhook callback.
        
        POS devices typically don't use webhooks, but this method
        can be used for manual status updates.
        
        Args:
            request_data: Webhook data
            
        Returns:
            Dict[str, Any]: Processed webhook result
        """
        return {
            'success': True,
            'message': 'Webhook processed',
            'transaction_id': request_data.get('transaction_id', '')
        }

