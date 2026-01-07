import uuid
import time
import random
from typing import Dict, Any
from django.utils import timezone
from .base import BasePaymentGateway
from .exceptions import GatewayException


class MockPaymentGateway(BasePaymentGateway):
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.mock_transactions = {}
        # Delay in seconds to simulate real POS payment processing time
        # Default: 3 seconds (from config or environment variable)
        self.payment_delay = self.config.get('mock_payment_delay', 3)
        # Whether payment should succeed (for testing failed payments)
        self.payment_success = self.config.get('mock_payment_success', True)
        # Success rate percentage (0-100) - if set, overrides payment_success
        self.success_rate = self.config.get('mock_payment_success_rate', 100)
    
    def initiate_payment(self, amount: int, order_details: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Initiate payment with mock gateway.
        
        For mock gateway, payment simulates real POS payment processing with a delay.
        This allows testing without a physical POS device while maintaining realistic behavior.
        """
        transaction_id = f"MOCK-{uuid.uuid4().hex[:16].upper()}"
        
        # Calculate delay with some randomness for realism
        delay = float(self.payment_delay)
        # Add random variation: ±0.5 seconds
        delay = delay + random.uniform(-0.5, 0.5)
        delay = max(1.0, delay)  # Minimum 1 second
        
        # Simulate payment processing delay (like real POS device)
        time.sleep(delay)
        
        # Determine if payment should succeed
        # If success_rate is set (not 100), use random chance
        if self.success_rate < 100:
            should_succeed = random.random() * 100 < self.success_rate
        else:
            # Use explicit success setting
            should_succeed = self.payment_success
        
        if should_succeed:
            # Successful payment
            status = 'success'
            self.mock_transactions[transaction_id] = {
                'transaction_id': transaction_id,
                'amount': amount,
                'order_details': order_details,
                'status': status,
                'created_at': timezone.now().isoformat(),
            }
            
            return {
                'success': True,
                'transaction_id': transaction_id,
                'status': 'success',
                'response_code': '00',  # Success response code
                'response_message': 'Payment successful (Mock)',
                'reference_number': f'REF-{uuid.uuid4().hex[:12].upper()}',
                'card_number': '****1234',  # Mock card number
                'gateway_response': {
                    'status': 'success',
                    'message': 'Payment processed successfully (Mock Gateway)',
                    'processed_at': timezone.now().isoformat(),
                    'processing_time': f'{delay:.2f}s'
                }
            }
        else:
            # Failed payment
            status = 'failed'
            self.mock_transactions[transaction_id] = {
                'transaction_id': transaction_id,
                'amount': amount,
                'order_details': order_details,
                'status': status,
                'created_at': timezone.now().isoformat(),
            }
            
            # Common failure reasons
            failure_reasons = [
                'Insufficient funds',
                'Card declined',
                'Transaction timeout',
                'Invalid card',
                'Payment cancelled by user'
            ]
            failure_message = random.choice(failure_reasons)
            
            return {
                'success': False,
                'transaction_id': transaction_id,
                'status': 'failed',
                'response_code': '51',  # Common failure code
                'response_message': f'Payment failed: {failure_message} (Mock)',
                'gateway_response': {
                    'status': 'failed',
                    'message': failure_message,
                    'error_code': '51',
                    'processed_at': timezone.now().isoformat(),
                    'processing_time': f'{delay:.2f}s'
                }
            }
    
    def verify_payment(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        if transaction_id not in self.mock_transactions:
            raise GatewayException('Transaction not found')
        
        transaction = self.mock_transactions[transaction_id]
        
        return {
            'success': True,
            'transaction_id': transaction_id,
            'status': transaction['status'],
            'amount': transaction['amount'],
            'gateway_response': {
                'status': transaction['status'],
                'verified_at': timezone.now().isoformat()
            }
        }
    
    def get_payment_status(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        if transaction_id not in self.mock_transactions:
            raise GatewayException('Transaction not found')
        
        transaction = self.mock_transactions[transaction_id]
        
        return {
            'success': True,
            'transaction_id': transaction_id,
            'status': transaction['status'],
            'amount': transaction['amount'],
            'gateway_response': {
                'status': transaction['status'],
                'checked_at': timezone.now().isoformat()
            }
        }
    
    def cancel_payment(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        if transaction_id not in self.mock_transactions:
            raise GatewayException('Transaction not found')
        
        transaction = self.mock_transactions[transaction_id]
        transaction['status'] = 'cancelled'
        
        return {
            'success': True,
            'transaction_id': transaction_id,
            'status': 'cancelled',
            'gateway_response': {
                'status': 'cancelled',
                'cancelled_at': timezone.now().isoformat()
            }
        }
    
    def handle_webhook(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        transaction_id = request_data.get('transaction_id')
        status = request_data.get('status', 'success')
        
        if transaction_id and transaction_id in self.mock_transactions:
            self.mock_transactions[transaction_id]['status'] = status
        
        return {
            'success': True,
            'message': 'Webhook processed successfully'
        }
    
    def simulate_payment_success(self, transaction_id: str):
        if transaction_id in self.mock_transactions:
            self.mock_transactions[transaction_id]['status'] = 'success'
    
    def simulate_payment_failure(self, transaction_id: str):
        if transaction_id in self.mock_transactions:
            self.mock_transactions[transaction_id]['status'] = 'failed'

