from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BasePaymentGateway(ABC):
    """
    Abstract base class for payment gateway implementations.
    
    All payment gateway implementations must inherit from this class
    and implement all abstract methods.
    """
    
    @abstractmethod
    def initiate_payment(self, amount: int, order_details: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Initiate a payment transaction with the payment gateway.
        
        Args:
            amount: Payment amount in Rial
            order_details: Dictionary containing order details
            **kwargs: Additional gateway-specific parameters
            
        Returns:
            Dict[str, Any]: Gateway response containing transaction information
                - transaction_id: Gateway transaction ID
                - status: Transaction status
                - redirect_url: URL for payment page (if applicable)
                - other gateway-specific fields
                
        Raises:
            GatewayException: If payment initiation fails
        """
        pass
    
    @abstractmethod
    def verify_payment(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        """
        Verify a payment transaction with the payment gateway.
        
        Args:
            transaction_id: Transaction ID to verify
            **kwargs: Additional gateway-specific parameters
            
        Returns:
            Dict[str, Any]: Verification result
                - status: Payment status ('success', 'failed', 'pending')
                - amount: Verified amount
                - transaction_id: Transaction ID
                - other gateway-specific fields
                
        Raises:
            GatewayException: If verification fails
        """
        pass
    
    @abstractmethod
    def get_payment_status(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        """
        Get current payment status from the payment gateway.
        
        Args:
            transaction_id: Transaction ID to check
            **kwargs: Additional gateway-specific parameters
            
        Returns:
            Dict[str, Any]: Payment status information
                - status: Current payment status
                - amount: Transaction amount
                - transaction_id: Transaction ID
                - other gateway-specific fields
                
        Raises:
            GatewayException: If status check fails
        """
        pass
    
    @abstractmethod
    def cancel_payment(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        """
        Cancel a payment transaction.
        
        Args:
            transaction_id: Transaction ID to cancel
            **kwargs: Additional gateway-specific parameters
            
        Returns:
            Dict[str, Any]: Cancellation result
                - status: Cancellation status
                - transaction_id: Transaction ID
                - other gateway-specific fields
                
        Raises:
            GatewayException: If cancellation fails
        """
        pass
    
    @abstractmethod
    def handle_webhook(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle webhook callback from payment gateway.
        
        Args:
            request_data: Webhook data from payment gateway
                - transaction_id: Transaction ID
                - status: Payment status
                - amount: Transaction amount
                - other gateway-specific fields
                
        Returns:
            Dict[str, Any]: Processed webhook result
                - status: Processing status
                - transaction_id: Transaction ID
                - other gateway-specific fields
                
        Raises:
            GatewayException: If webhook processing fails
        """
        pass

