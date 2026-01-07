"""
Connection management for POS device communication.
"""

import socket
from typing import Dict, Any
from ..exceptions import GatewayException
from apps.logs.services.log_service import LogService


class POSConnection:
    """Manages TCP/IP connection to POS device."""
    
    def __init__(self, tcp_host: str, tcp_port: int, timeout: int = 30):
        """
        Initialize connection manager.
        
        Args:
            tcp_host: POS device IP address
            tcp_port: POS device port
            timeout: Connection timeout in seconds
        """
        self.tcp_host = tcp_host
        self.tcp_port = tcp_port
        self.timeout = timeout
        self._connection = None
    
    def connect(self):
        """Establish TCP/IP connection to POS device."""
        # If already connected, reuse the connection
        if self._connection:
            try:
                self._connection.getpeername()
                # Connection is alive, reuse it
                return
            except (OSError, socket.error):
                # Connection is dead, reconnect
                self._connection = None
            except Exception as e:
                # Connection check failed, reconnect
                LogService.log_warning(
                    'payment',
                    'pos_connection_check_failed',
                    details={'error': str(e), 'error_type': type(e).__name__}
                )
                self._connection = None
        
        try:
            self._connection = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            # Set socket options to keep connection alive
            self._connection.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
            # Set timeout for connection (but keep it long for transaction waiting)
            self._connection.settimeout(30)  # 30 seconds for initial connection
            self._connection.connect((self.tcp_host, self.tcp_port))
            LogService.log_info(
                'payment',
                'pos_connection_established',
                details={
                    'host': self.tcp_host,
                    'port': self.tcp_port,
                    'connection_type': 'tcp'
                }
            )
        except (socket.error, ConnectionError, TimeoutError) as e:
            LogService.log_error(
                'payment',
                'pos_connection_failed',
                details={
                    'host': self.tcp_host,
                    'port': self.tcp_port,
                    'error': str(e),
                    'error_type': type(e).__name__
                }
            )
            raise GatewayException(f'Failed to connect to POS via TCP: {str(e)}')
        except Exception as e:
            LogService.log_error(
                'payment',
                'pos_connection_unexpected_error',
                details={
                    'host': self.tcp_host,
                    'port': self.tcp_port,
                    'error': str(e),
                    'error_type': type(e).__name__
                }
            )
            raise GatewayException(f'Failed to connect to POS via TCP: {str(e)}')
    
    def disconnect(self):
        """Close connection to POS device."""
        if self._connection:
            try:
                self._connection.close()
            except (OSError, socket.error) as e:
                LogService.log_warning(
                    'payment',
                    'pos_disconnect_error',
                    details={'error': str(e), 'error_type': type(e).__name__}
                )
            finally:
                self._connection = None
    
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
        result = {
            'success': False,
            'message': '',
            'connection_type': 'tcp',
            'details': {}
        }
        
        try:
            # Try to connect
            self.connect()
            
            if self._connection:
                result['success'] = True
                result['message'] = f'اتصال TCP/IP موفق بود (IP: {self.tcp_host}, Port: {self.tcp_port})'
                result['details'] = {
                    'host': self.tcp_host,
                    'port': self.tcp_port,
                    'timeout': self.timeout
                }
            
            # Disconnect after test
            self.disconnect()
            
        except GatewayException as e:
            result['message'] = f'خطا در اتصال: {str(e)}'
            result['details'] = {'error': str(e)}
        except (socket.error, ConnectionError, TimeoutError) as e:
            result['message'] = f'خطای شبکه: {str(e)}'
            result['details'] = {'error': str(e), 'error_type': type(e).__name__}
        except Exception as e:
            result['message'] = f'خطای غیرمنتظره: {str(e)}'
            result['details'] = {'error': str(e), 'error_type': type(e).__name__}
        finally:
            if self._connection:
                self.disconnect()
        
        return result
    
    @property
    def socket(self):
        """Get the socket connection."""
        return self._connection
    
    def is_connected(self) -> bool:
        """Check if connection is alive."""
        if not self._connection:
            return False
        try:
            self._connection.getpeername()
            return True
        except (OSError, socket.error):
            return False

