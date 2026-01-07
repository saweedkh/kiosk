from typing import Optional, Dict, Any
import logging
from django.contrib.auth import get_user_model

User = get_user_model()

logger = logging.getLogger('kiosk')


class LogService:
    """
    Logging service for system and transaction logs.
    
    This class provides methods for creating various types of logs
    with different severity levels.
    """
    
    @staticmethod
    def _format_message(log_type: str, action: str, **kwargs) -> str:
        """
        Format log message with provided parameters.
        
        Args:
            log_type: Type of log (e.g., 'order', 'payment', 'product')
            action: Action being logged (e.g., 'order_created', 'payment_initiated')
            **kwargs: Additional parameters
                - user: User instance or username
                - session_key: Session key (truncated to 8 chars)
                - details: Dictionary with additional details
                - ip_address: IP address
                
        Returns:
            str: Formatted log message
        """
        message_parts = [f"[{log_type.upper()}] {action}"]
        
        if kwargs.get('user'):
            message_parts.append(f"User: {kwargs['user']}")
        
        if kwargs.get('session_key'):
            message_parts.append(f"Session: {kwargs['session_key'][:8]}...")
        
        if kwargs.get('details'):
            import json
            details_str = json.dumps(kwargs['details'], ensure_ascii=False)
            message_parts.append(f"Details: {details_str}")
        
        if kwargs.get('ip_address'):
            message_parts.append(f"IP: {kwargs['ip_address']}")
        
        return " | ".join(message_parts)
    
    @staticmethod
    def create_system_log(
        log_type: str,
        action: str,
        level: str = 'info',
        user: Optional[User] = None,
        session_key: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """
        Create a system log entry.
        
        Args:
            log_type: Type of log (e.g., 'order', 'payment', 'product', 'admin')
            action: Action being logged
            level: Log level ('info', 'warning', 'error', 'critical')
            user: User instance (optional)
            session_key: Session key (optional)
            details: Dictionary with additional details (optional)
            ip_address: IP address (optional)
            user_agent: User agent string (optional)
        """
        message = LogService._format_message(
            log_type=log_type,
            action=action,
            user=user,
            session_key=session_key,
            details=details,
            ip_address=ip_address
        )
        
        getattr(logger, level)(message)
    
    @staticmethod
    def log_info(log_type: str, action: str, **kwargs) -> None:
        """
        Create an info level log entry.
        
        Args:
            log_type: Type of log
            action: Action being logged
            **kwargs: Additional parameters (user, session_key, details, ip_address, etc.)
        """
        LogService.create_system_log(
            log_type=log_type,
            action=action,
            level='info',
            **kwargs
        )
    
    @staticmethod
    def log_warning(log_type: str, action: str, **kwargs) -> None:
        """
        Create a warning level log entry.
        
        Args:
            log_type: Type of log
            action: Action being logged
            **kwargs: Additional parameters (user, session_key, details, ip_address, etc.)
        """
        LogService.create_system_log(
            log_type=log_type,
            action=action,
            level='warning',
            **kwargs
        )
    
    @staticmethod
    def log_error(log_type: str, action: str, **kwargs) -> None:
        """
        Create an error level log entry.
        
        Args:
            log_type: Type of log
            action: Action being logged
            **kwargs: Additional parameters (user, session_key, details, ip_address, etc.)
        """
        LogService.create_system_log(
            log_type=log_type,
            action=action,
            level='error',
            **kwargs
        )
    
    @staticmethod
    def log_critical(log_type: str, action: str, **kwargs) -> None:
        """
        Create a critical level log entry.
        
        Args:
            log_type: Type of log
            action: Action being logged
            **kwargs: Additional parameters (user, session_key, details, ip_address, etc.)
        """
        LogService.create_system_log(
            log_type=log_type,
            action=action,
            level='critical',
            **kwargs
        )
    
    @staticmethod
    def create_transaction_log(
        transaction: Optional[Any] = None,
        transaction_ref: Optional[str] = None,
        log_type: Optional[str] = None,
        message: Optional[str] = None,
        request_data: Optional[Dict[str, Any]] = None,
        response_data: Optional[Dict[str, Any]] = None,
        error_details: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Create a transaction-specific log entry.
        
        Args:
            transaction: Transaction instance (optional)
            transaction_ref: Transaction reference ID (optional)
            log_type: Type of transaction log
            message: Log message
            request_data: Request data dictionary (optional)
            response_data: Response data dictionary (optional)
            error_details: Error details dictionary (optional)
        """
        transaction_id = transaction_ref or (transaction.transaction_id if transaction else 'N/A')
        
        log_message = f"[TRANSACTION] {log_type} | Transaction: {transaction_id} | {message}"
        
        if request_data:
            import json
            log_message += f" | Request: {json.dumps(request_data, ensure_ascii=False)}"
        
        if response_data:
            import json
            log_message += f" | Response: {json.dumps(response_data, ensure_ascii=False)}"
        
        if error_details:
            import json
            log_message += f" | Error: {json.dumps(error_details, ensure_ascii=False)}"
        
        logger.info(log_message)
