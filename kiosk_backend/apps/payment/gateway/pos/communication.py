"""
Socket communication with POS device.
"""

import socket
import select
import time
from typing import Optional
from ..exceptions import GatewayException
from apps.logs.services.log_service import LogService
from .connection import POSConnection
from .response_parser import POSResponseParser


class POSCommunication:
    """Handles socket communication with POS device."""
    
    def __init__(self, connection: POSConnection, response_parser: POSResponseParser):
        """
        Initialize communication handler.
        
        Args:
            connection: POS connection manager
            response_parser: Response parser instance
        """
        self.connection = connection
        self.response_parser = response_parser
    
    def send_command(self, command: bytes, wait_for_response: bool = True, max_wait_time: int = 120) -> str:
        """
        Send command to POS device and receive response.
        
        IMPORTANT: Connection stays alive during the entire transaction.
        The socket remains open until response is received or timeout.
        
        Args:
            command: Command bytes to send
            wait_for_response: Whether to wait for response
            max_wait_time: Maximum time to wait for response in seconds
            
        Returns:
            str: Response from POS device
            
        Raises:
            GatewayException: If communication fails
        """
        if not self.connection.is_connected():
            self.connection.connect()
        
        conn = self.connection.socket
        if not conn:
            raise GatewayException('Connection not available')
        
        try:
            # Log what we're sending
            try:
                command_str = command.decode('utf-8', errors='replace')
                LogService.log_info(
                    'payment',
                    'pos_sending_command',
                    details={
                        'command_length': len(command),
                        'command_preview': command_str[:100] if len(command_str) > 100 else command_str,
                        'hex_preview': command.hex()[:100]
                    }
                )
            except (UnicodeDecodeError, AttributeError) as e:
                LogService.log_info(
                    'payment',
                    'pos_sending_command_binary',
                    details={
                        'command_length': len(command),
                        'command_preview': str(command[:50]),
                        'error': str(e)
                    }
                )
            
            # IMPORTANT: Keep connection alive - don't close it!
            # Send command
            try:
                bytes_sent = conn.sendall(command)
                LogService.log_info(
                    'payment',
                    'pos_data_sent',
                    details={'bytes_sent': len(command)}
                )
                
                # Verify data was sent by checking socket state
                try:
                    # Try to get socket info to verify it's still connected
                    peer = conn.getpeername()
                    LogService.log_info(
                        'payment',
                        'pos_connection_verified',
                        details={'peer_host': peer[0], 'peer_port': peer[1]}
                    )
                except (OSError, socket.error) as e:
                    LogService.log_warning(
                        'payment',
                        'pos_connection_verification_failed',
                        details={'error': str(e), 'error_type': type(e).__name__}
                    )
                
            except socket.error as e:
                LogService.log_error(
                    'payment',
                    'pos_send_data_failed',
                    details={'error': str(e), 'error_type': type(e).__name__, 'bytes_attempted': len(command)}
                )
                raise GatewayException(f'Failed to send data to POS: {str(e)}')
            
            # Small delay to ensure data is sent and device processes it
            time.sleep(0.5)
            
            if not wait_for_response:
                # For commands that don't need response
                return ''
            
            # Wait for response - POS devices may take time to respond
            # Especially for payment transactions that require user interaction
            # IMPORTANT: Keep connection open and wait for response
            response = ''
            start_time = time.time()
            ack_received = False  # Flag to track if we received an ACK
            
            # Set socket timeout for reading (will be adjusted if ACK received)
            conn.settimeout(1.0)
            
            # First, try to get immediate response (acknowledgment)
            try:
                # Use select() to check if data is available (non-blocking check)
                ready, _, _ = select.select([conn], [], [], 2.0)
                if ready:
                    chunk = conn.recv(4096)
                    if chunk:
                        initial_ack = chunk.decode('utf-8', errors='ignore')
                        LogService.log_info(
                            'payment',
                            'pos_initial_response_received',
                            details={'response_preview': initial_ack[:100] if len(initial_ack) > 100 else initial_ack}
                        )
                        
                        # Check if this is just an ACK (short response without transaction details)
                        if len(initial_ack) < 30 or ('RS013' in initial_ack and 'SR' not in initial_ack and 'RN' not in initial_ack):
                            # This is just an ACK, not final response
                            ack_received = True
                            LogService.log_info(
                                'payment',
                                'pos_ack_received_waiting_for_final',
                                details={
                                    'ack_length': len(initial_ack),
                                    'ack_preview': initial_ack,
                                    'note': 'Received ACK, waiting for transaction completion (card swipe/PIN/cancel)'
                                }
                            )
                            # Don't add to response yet - wait for actual transaction response
                        else:
                            # This might be the full response already
                            response = initial_ack
                else:
                    # No immediate response - that's OK, device might process and respond later
                    LogService.log_info('payment', 'pos_no_immediate_response', details={
                        'note': 'Device is processing, waiting for response'
                    })
            except (OSError, socket.error) as e:
                LogService.log_warning(
                    'payment',
                    'pos_initial_response_error',
                    details={'error': str(e), 'error_type': type(e).__name__}
                )
                # Don't disconnect - connection might still be valid
            
            # Now wait for actual transaction response (user interaction required)
            # IMPORTANT: Use select() for event-driven I/O instead of polling
            # select() waits for socket to be ready for reading (event-driven, not polling!)
            # This is more efficient than recv() with timeout in a loop
            
            # Adjust timeout based on whether ACK was received
            if ack_received:
                conn.settimeout(0.5)  # Faster polling if ACK received
            
            # If we already got full response from initial check, return it
            if response:
                LogService.log_info('payment', 'pos_complete_response_received_immediate')
                return response
            
            while time.time() - start_time < max_wait_time:
                elapsed = int(time.time() - start_time)
                
                # IMPORTANT: Wait for actual response from POS device
                # Don't timeout early - user might be entering PIN or processing payment
                # Only return cancelled if we actually receive a cancellation response
                
                # Use select() to wait for data (event-driven, not polling!)
                # select() blocks until socket is ready for reading or timeout
                # This is much more efficient than recv() with timeout in a loop
                timeout_seconds = 0.5 if ack_received else 1.0  # Faster check if ACK received
                ready_sockets, _, _ = select.select([conn], [], [], timeout_seconds)
                
                if ready_sockets:
                    # Socket is ready for reading - data is available!
                    try:
                        chunk = conn.recv(4096)
                        if chunk:
                            chunk_str = chunk.decode('utf-8', errors='ignore')
                            response += chunk_str
                            LogService.log_info(
                                'payment',
                                'pos_data_chunk_received',
                                details={
                                    'chunk_preview': chunk_str[:100] if len(chunk_str) > 100 else chunk_str,
                                    'total_response_length': len(response)
                                }
                            )
                            
                            # If we got some data, try to get more data if available (keep connection open)
                            # Use select() to check if more data is available (non-blocking check)
                            # IMPORTANT: Only check once to avoid infinite loop
                            time.sleep(0.1)  # Small delay to allow data to arrive
                            try:
                                # Check if more data is available (non-blocking, only once)
                                ready, _, _ = select.select([conn], [], [], 0.1)
                                if ready:
                                    more_chunk = conn.recv(4096)
                                    if more_chunk:
                                        more_str = more_chunk.decode('utf-8', errors='ignore')
                                        response += more_str
                                        LogService.log_info(
                                            'payment',
                                            'pos_additional_data_received',
                                            details={'chunk_preview': more_str[:100] if len(more_str) > 100 else more_str}
                                        )
                            except (OSError, socket.error):
                                # No more data or error, we're done
                                # But connection is still open!
                                pass
                        else:
                            # Socket was ready but recv() returned empty - connection may be closed
                            # Check if connection is still alive
                            try:
                                conn.getpeername()
                                # Connection is alive, just no data - continue waiting
                                continue
                            except (OSError, socket.error):
                                LogService.log_error('payment', 'pos_connection_closed')
                                raise GatewayException('اتصال به دستگاه POS قطع شد')
                        
                        # Check if response is complete (only if we got data)
                        if response and len(response) > 10:
                            # Parse to see if it's ACK or final response
                            temp_parsed = self.response_parser.parse(response)
                            
                            # Log the parsed result for debugging
                            LogService.log_info(
                                'payment',
                                'pos_response_parsed_check',
                                details={
                                    'response_length': len(response),
                                    'response_preview': response[:200],
                                    'parsed_status': temp_parsed.get('status'),
                                    'parsed_response_code': temp_parsed.get('response_code'),
                                    'parsed_success': temp_parsed.get('success'),
                                    'is_pending': temp_parsed.get('status') == 'pending'
                                }
                            )
                            
                            if temp_parsed.get('status') == 'pending':
                                # This is still just an ACK, not final response
                                # Mark that we received an ACK
                                ack_received = True
                                LogService.log_info(
                                    'payment',
                                    'pos_ack_received_waiting_for_final',
                                    details={
                                        'response_length': len(response),
                                        'response_preview': response[:100],
                                        'note': 'Still waiting for transaction completion (card swipe/PIN/cancel). ACK received but no SR/RN/PN tags found.'
                                    }
                                )
                                # Clear response and continue waiting for actual transaction response
                                response = ''
                                # Break from "get more data" loop and continue main loop
                                break
                            else:
                                # This is the final response (success, failed, or cancelled)
                                LogService.log_info(
                                    'payment',
                                    'pos_complete_response_received',
                                    details={
                                        'response_length': len(response),
                                        'response_preview': response[:200],
                                        'status': temp_parsed.get('status'),
                                        'response_code': temp_parsed.get('response_code'),
                                        'success': temp_parsed.get('success'),
                                        'is_cancelled': temp_parsed.get('status') == 'cancelled'
                                    }
                                )
                                break
                    except (OSError, socket.error) as e:
                        LogService.log_error(
                            'payment',
                            'pos_receive_error',
                            details={'error': str(e), 'elapsed': elapsed}
                        )
                        raise GatewayException(f'خطا در دریافت داده از POS: {str(e)}')
                else:
                    # select() timeout - no data available yet, continue waiting
                    # This is NOT polling - select() blocks until data is available or timeout
                    # Connection is still alive, just no data yet
                    elapsed = int(time.time() - start_time)
                    
                    # Log periodically to show we're still waiting
                    log_interval = 5  # Log every 5 seconds
                    if elapsed % log_interval == 0 and elapsed > 0:
                        LogService.log_info(
                            'payment',
                            'pos_waiting_for_response',
                            details={
                                'elapsed': elapsed,
                                'max_wait_time': max_wait_time,
                                'ack_received': ack_received,
                                'note': f'Waiting for response from POS (event-driven with select()). ACK received: {ack_received}. Will wait up to {max_wait_time} seconds for actual response.'
                            }
                        )
                    # Check if connection is still alive
                    try:
                        conn.getpeername()  # This will raise if connection is dead
                    except (OSError, socket.error) as e:
                        LogService.log_error(
                            'payment',
                            'pos_connection_lost',
                            details={'error': str(e), 'elapsed': elapsed}
                        )
                        raise GatewayException('اتصال به دستگاه POS قطع شد')
                    continue
            
            if not response:
                elapsed = int(time.time() - start_time)
                LogService.log_error(
                    'payment',
                    'pos_no_response_received',
                    details={
                        'elapsed_seconds': elapsed,
                        'max_wait_time': max_wait_time,
                        'ack_received': ack_received,
                        'note': 'No response received from POS device after waiting. Device may have timed out or user cancelled.'
                    }
                )
                # Raise exception if no response received
                raise GatewayException(
                    f'پاسخ از دستگاه POS دریافت نشد. '
                    f'لطفاً بررسی کنید که تراکنش روی دستگاه انجام شده باشد. '
                    f'(زمان انتظار: {elapsed} ثانیه از {max_wait_time} ثانیه)'
                )
            else:
                LogService.log_info(
                    'payment',
                    'pos_full_response_received',
                    details={
                        'response_length': len(response),
                        'response_preview': response[:200] if len(response) > 200 else response
                    }
                )
            
            return response
        except GatewayException:
            # Re-raise GatewayException as is
            raise
        except (socket.error, ConnectionError, TimeoutError) as e:
            # Network-related errors
            LogService.log_error(
                'payment',
                'pos_communication_network_error',
                details={'error': str(e), 'error_type': type(e).__name__}
            )
            # Don't disconnect immediately - connection might still be valid
            raise GatewayException(f'Failed to communicate with POS: Network error - {str(e)}')
        except Exception as e:
            # Unexpected errors
            LogService.log_error(
                'payment',
                'pos_communication_error',
                details={'error': str(e), 'error_type': type(e).__name__}
            )
            # Don't disconnect immediately - connection might still be valid
            raise GatewayException(f'Failed to communicate with POS: {str(e)}')

