"""
Message builder for POS payment requests.
"""

import time
from typing import Dict, Any
from apps.logs.services.log_service import LogService


class POSMessageBuilder:
    """Builds payment request messages in various formats."""
    
    def __init__(self, config: Dict[str, Any], terminal_id: str = '', merchant_id: str = ''):
        """
        Initialize message builder.
        
        Args:
            config: Gateway configuration
            terminal_id: Terminal ID
            merchant_id: Merchant ID
        """
        self.config = config
        self.terminal_id = terminal_id
        self.merchant_id = merchant_id
    
    def build_payment_request_simple(self, amount: int, order_number: str,
                                     additional_data: Dict[str, Any] = None) -> bytes:
        """
        Build payment request using EXACT format from real DLL traffic capture.
        
        Based on ACTUAL DLL traffic:
        0067RQ062PR006000000AM00510000CU003364TL00898194184R0009260227494PD0011
        
        Format: {length_prefix}RQ{msg_len}PR00{counter}AM{code}{amount}CU{customer}TL{terminal}R{merchant}PD{payment}
        
        Args:
            amount: Payment amount in Rial (e.g., 10000)
            order_number: Order number
            additional_data: Additional data
            
        Returns:
            bytes: Formatted request bytes (WITHOUT length prefix - will be added later)
        """
        parts = []
        
        # PR00 - Payment Request Type
        parts.append("PR00")
        
        # Counter/Transaction number (7 digits, based on order number or timestamp)
        # Extract last 7 digits from order number or use timestamp
        if order_number and len(order_number) >= 7:
            # Try to extract number from order number
            order_digits = ''.join(c for c in order_number if c.isdigit())
            if order_digits:
                counter = int(order_digits[-7:]) % 10000000  # Last 7 digits
                counter_str = str(counter).zfill(7)
            else:
                counter_str = str(int(time.time()) % 10000000).zfill(7)
        else:
            counter_str = str(int(time.time()) % 10000000).zfill(7)
        parts.append(counter_str)
        
        # AM code - فرمت صحیح: AM{length}{amount}
        # طول مبلغ به صورت 3 رقم zero-padded بعد از AM می‌آید
        # مثال: 100000 -> AM006100000 (6 رقم)
        # مثال: 123123000 -> AM009123123000 (9 رقم)
        # نمونه از کاربر: RQ039PR006000000AM009123123000CU003364PD0011
        amount_str = str(amount)
        amount_length = len(amount_str)
        # طول را به صورت 3 رقم zero-padded اضافه می‌کنیم
        amount_length_str = str(amount_length).zfill(3)
        parts.append(f"AM{amount_length_str}{amount_str}")
        
        # CU - Customer (based on order or session)
        # IMPORTANT: DLL official format uses CU003364 (6 digits after CU00)
        if additional_data and 'customer_id' in additional_data:
            customer_id = str(additional_data['customer_id'])[:6].zfill(6)
            parts.append(f"CU00{customer_id}")
        elif order_number:
            # Use order number as customer ID (6 digits)
            order_digits = ''.join(c for c in order_number if c.isdigit())
            if order_digits and len(order_digits) >= 6:
                customer_id = order_digits[-6:].zfill(6)  # Last 6 digits
                parts.append(f"CU00{customer_id}")
            else:
                parts.append("CU003364")  # Fallback to DLL default
        else:
            # Fallback to DLL default
            parts.append("CU003364")
        
        # PD - Payment Data (default from DLL capture)
        if additional_data and 'payment_data' in additional_data:
            payment_data = str(additional_data['payment_data'])[:4].zfill(4)
            parts.append(f"PD00{payment_data}")
        else:
            # Default payment data from DLL
            parts.append("PD0011")
        
        message = "".join(parts)
        
        LogService.log_info(
            'payment',
            'pos_message_built_simple',
            details={
                'message_length': len(message),
                'message': message,
                'amount': amount,
                'counter': counter_str,  # Dynamic counter based on order
                'order_number': order_number
            }
        )
        
        return message.encode('ascii')
    
    def build_payment_request(self, amount: int, order_number: str, 
                             additional_data: Dict[str, Any] = None) -> bytes:
        """
        Build payment request using tag-based format (same as DLL).
        
        Format: PR{type}AM{amount}TE{terminal}ME{merchant}SO{order}CU{customer}PD{payment_id}BI{bill_id}
        No separators between tags, just concatenated.
        
        Args:
            amount: Payment amount in Rial
            order_number: Order number
            additional_data: Additional data (customer_name, payment_id, bill_id)
            
        Returns:
            bytes: Formatted request bytes (ready to send)
        """
        # Check if we should use simple format (based on real PNA software)
        use_simple_format = self.config.get('pos_use_simple_format', False)
        if use_simple_format:
            # Build simple message but DON'T return yet - need to apply format (RQ prefix)
            message_bytes = self.build_payment_request_simple(amount, order_number, additional_data)
            # Decode to string for format processing
            message = message_bytes.decode('ascii')
        else:
            # Build full format message
            parts = []
            
            # PR - Payment Request Type (00 = normal payment)
            parts.append("PR00")
            
            # AM - Amount (فرمت صحیح: AM{length}{amount})
            # طول مبلغ به صورت 3 رقم zero-padded بعد از AM می‌آید
            # مثال: 100000 -> AM006100000 (6 رقم)
            # مثال: 123123000 -> AM009123123000 (9 رقم)
            amount_str = str(amount)
            amount_length = len(amount_str)
            amount_length_str = str(amount_length).zfill(3)
            parts.append(f"AM{amount_length_str}{amount_str}")
            
            # TE - Terminal ID (8 digits, zero-padded)
            if self.terminal_id:
                terminal_id_str = str(self.terminal_id).zfill(8)
                parts.append(f"TE{terminal_id_str}")
            
            # ME - Merchant ID (15 digits, zero-padded)
            if self.merchant_id:
                merchant_id_str = str(self.merchant_id).zfill(15)
                parts.append(f"ME{merchant_id_str}")
            
            # SO - Sale Order / Order Number (up to 20 chars, left-padded with spaces)
            if order_number:
                order_num = order_number[:20] if len(order_number) > 20 else order_number
                parts.append(f"SO{order_num.ljust(20)}")
            
            # CU - Customer Name (up to 50 chars, left-padded with spaces)
            if additional_data and 'customer_name' in additional_data:
                customer_name = additional_data['customer_name'][:50] if len(additional_data['customer_name']) > 50 else additional_data['customer_name']
                parts.append(f"CU{customer_name.ljust(50)}")
            
            # PD - Payment ID (11 digits, zero-padded)
            if additional_data and 'payment_id' in additional_data:
                payment_id = str(additional_data['payment_id'])[:11].zfill(11)
                parts.append(f"PD{payment_id}")
            
            # BI - Bill ID (20 digits/chars, zero-padded)
            if additional_data and 'bill_id' in additional_data:
                bill_id = str(additional_data['bill_id']).strip()
                # Remove 'BI' prefix if user accidentally included it
                if bill_id.startswith('BI'):
                    bill_id = bill_id[2:].strip()
                # Limit to 20 chars and zero-pad to 20
                bill_id = bill_id[:20].zfill(20)
                parts.append(f"BI{bill_id}")
            
            # Join all parts (NO separator - this is key!)
            message = "".join(parts)
            
            # Log the message we're building
            LogService.log_info(
                'payment',
                'pos_message_built',
                details={
                    'message_length': len(message),
                    'tag_count': len(parts),
                    'message_preview': message[:100] if len(message) > 100 else message
                }
            )
            
            # Convert to ASCII bytes (POS devices use ASCII, not UTF-8)
            message_bytes = message.encode('ascii')
        
        # IMPORTANT: DLL sends message WITHOUT any terminator
        # The message is sent as-is, no CRLF, no NULL, no length prefix
        # This is the exact format DLL uses
        # Default to 'dll_exact' to match DLL behavior
        format_type = self.config.get('pos_message_format', 'dll_exact')
        
        if format_type == 'dll_exact':
            # Exact DLL format - no terminator, no framing, just raw message
            # This is what DLL sends
            pass  # Don't modify message_bytes
        elif format_type == 'pardakht_novin_official':
            # ACTUAL DLL format from traffic capture:
            # Format: {4digit_length}RQ{3digit_length}{message}
            # Example: 0067RQ062PR006000000AM00510000...
            
            # First add RQ prefix
            msg_length = len(message_bytes)
            msg_length_str = str(msg_length).zfill(3)  # 3 digits (e.g., 062)
            rq_part = f"RQ{msg_length_str}".encode('ascii')
            message_with_rq = rq_part + message_bytes
            
            # Then add 4-digit length prefix for total message
            total_length = len(message_with_rq)
            total_length_str = str(total_length).zfill(4)  # 4 digits (e.g., 0067)
            message_bytes = total_length_str.encode('ascii') + message_with_rq
            
            LogService.log_info(
                'payment',
                'pos_message_format_pardakht_novin_official',
                details={
                    'message_length': msg_length,
                    'with_rq_length': total_length,
                    'total_with_prefix': len(message_bytes),
                    'format': f'{total_length_str}RQ{msg_length_str}...'
                }
            )
        elif format_type == 'with_rq_and_banner':
            # Full format with banner + RQ prefix (from Technical-Guide-Vr-5.0.pdf)
            # Format: R2023tejaratEParsian\nRQ{length}{message}
            banner = self.config.get('pos_banner', 'R2023tejaratEParsian')
            length = len(message_bytes)
            length_str = str(length).zfill(3)
            # Build: banner + newline + RQ + length + message
            full_message = f"{banner}\n".encode('ascii') + f"RQ{length_str}".encode('ascii') + message_bytes
            message_bytes = full_message
            LogService.log_info(
                'payment',
                'pos_message_format_with_banner',
                details={
                    'banner': banner,
                    'message_length': length,
                    'total_length': len(message_bytes)
                }
            )
        elif format_type == 'with_length':
            # Add length prefix (4 digits, zero-padded) - some devices might need this
            length = len(message_bytes)
            length_prefix = f"{length:04d}".encode('ascii')
            message_bytes = length_prefix + message_bytes
            LogService.log_info(
                'payment',
                'pos_message_format_length_prefix',
                details={'length': length}
            )
        elif format_type == 'with_stx_etx':
            # Add STX (0x02) at start and ETX (0x03) at end
            message_bytes = b'\x02' + message_bytes + b'\x03'
            LogService.log_info('payment', 'pos_message_format_stx_etx')
        elif format_type == 'with_terminator':
            # Add CRLF terminator
            message_bytes = message_bytes + b'\r\n'
            LogService.log_info('payment', 'pos_message_format_terminator')
        elif format_type == 'with_null':
            # Add NULL terminator
            message_bytes = message_bytes + b'\x00'
            LogService.log_info('payment', 'pos_message_format_null')
        
        LogService.log_info(
            'payment',
            'pos_message_final',
            details={
                'message_length': len(message_bytes),
                'message_preview': message_bytes[:100].hex() if len(message_bytes) > 100 else message_bytes.hex(),
                'format_type': format_type
            }
        )
        
        return message_bytes

