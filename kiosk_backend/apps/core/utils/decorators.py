from typing import Callable, Any
from functools import wraps
from apps.logs.services.log_service import LogService


def log_action(action_name: str, log_type: str = 'admin_action') -> Callable:
    """
    Decorator for logging function execution and errors.
    
    This decorator automatically logs function execution and any exceptions
    that occur during execution.
    
    Args:
        action_name: Name of the action being logged
        log_type: Type of log (default: 'admin_action')
        
    Returns:
        Callable: Decorated function
        
    Example:
        @log_action('process_payment', log_type='payment')
        def process_payment(amount):
            # payment processing logic
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                result = func(*args, **kwargs)
                LogService.log_info(
                    log_type=log_type,
                    action=action_name,
                    details={'function': func.__name__}
                )
                return result
            except Exception as e:
                LogService.log_error(
                    log_type=log_type,
                    action=f'{action_name}_error',
                    details={
                        'function': func.__name__,
                        'error': str(e),
                        'error_type': type(e).__name__
                    }
                )
                raise
        return wrapper
    return decorator

