from typing import Optional
from django.db.models import QuerySet
from apps.payment.models import Transaction


class TransactionSelector:
    """
    Transaction query selector.
    
    This class encapsulates all database queries related to payment transactions.
    """
    
    @staticmethod
    def get_transaction_by_id(transaction_id: int) -> Optional[Transaction]:
        """
        Get transaction by database ID.
        
        Args:
            transaction_id: Transaction database ID
            
        Returns:
            Optional[Transaction]: Transaction instance if found, None otherwise
        """
        return Transaction.objects.filter(id=transaction_id).first()
    
    @staticmethod
    def get_transaction_by_transaction_id(transaction_id: str) -> Optional[Transaction]:
        """
        Get transaction by transaction ID (unique identifier).
        
        Args:
            transaction_id: Transaction ID string
            
        Returns:
            Optional[Transaction]: Transaction instance if found, None otherwise
        """
        return Transaction.objects.filter(transaction_id=transaction_id).first()
    
    @staticmethod
    def get_transactions_by_order(order_id: int) -> QuerySet[Transaction]:
        """
        Get all transactions for an order ordered by creation date (newest first).
        
        Args:
            order_id: Order ID
            
        Returns:
            QuerySet[Transaction]: QuerySet of transactions for the order
        """
        return Transaction.objects.filter(order_id=order_id).order_by('-created_at')
    
    @staticmethod
    def get_pending_transactions() -> QuerySet[Transaction]:
        """
        Get all pending transactions ordered by creation date (newest first).
        
        Returns:
            QuerySet[Transaction]: QuerySet of pending transactions
        """
        return Transaction.objects.filter(status='pending').order_by('-created_at')
    
    @staticmethod
    def get_successful_transactions() -> QuerySet[Transaction]:
        """
        Get all successful transactions ordered by creation date (newest first).
        
        Returns:
            QuerySet[Transaction]: QuerySet of successful transactions
        """
        return Transaction.objects.filter(status='success').order_by('-created_at')
    
    @staticmethod
    def get_failed_transactions() -> QuerySet[Transaction]:
        """
        Get all failed transactions ordered by creation date (newest first).
        
        Returns:
            QuerySet[Transaction]: QuerySet of failed transactions
        """
        return Transaction.objects.filter(status='failed').order_by('-created_at')
    
    @staticmethod
    def get_transactions_by_status(status: str) -> QuerySet[Transaction]:
        """
        Get transactions by status ordered by creation date (newest first).
        
        Args:
            status: Transaction status (e.g., 'pending', 'success', 'failed')
            
        Returns:
            QuerySet[Transaction]: QuerySet of transactions with specified status
        """
        return Transaction.objects.filter(status=status).order_by('-created_at')
    
    @staticmethod
    def get_transactions_by_gateway(gateway_name: str) -> QuerySet[Transaction]:
        """
        Get transactions by payment gateway name ordered by creation date (newest first).
        
        Args:
            gateway_name: Payment gateway name
            
        Returns:
            QuerySet[Transaction]: QuerySet of transactions for the gateway
        """
        return Transaction.objects.filter(gateway_name=gateway_name).order_by('-created_at')

