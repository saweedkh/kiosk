"""
Response parser for POS device responses.
"""

from typing import Dict, Any
from apps.logs.services.log_service import LogService


class POSResponseParser:
    """Parses responses from POS device."""
    
    def parse(self, response: str) -> Dict[str, Any]:
        """
        Parse response from POS device.
        
        Based on Pardakht Novin protocol:
        - Simple format: 0018RS013RS00299PD0011 (with length prefix)
        - Full format: RS{response_code}SR{serial}RN{reference}TI{terminal}PN{pan}...
        
        Args:
            response: Response string from POS
            
        Returns:
            Dict[str, Any]: Parsed response data
        """
        result = {
            'success': False,
            'status': 'failed',
            'response_code': '',
            'response_message': '',
            'transaction_id': '',
            'card_number': '',
            'reference_number': '',
            'terminal_id': '',
            'raw_response': response
        }
        
        if not response:
            return result
        
        # Check if response starts with length prefix (4 digits)
        # Example: 0018RS013RS00299PD0011
        if len(response) >= 4 and response[:4].isdigit():
            length_prefix = response[:4]
            response = response[4:]  # Remove length prefix
            LogService.log_info(
                'payment',
                'pos_response_length_prefix_detected',
                details={
                    'length_prefix': length_prefix,
                    'actual_response': response
                }
            )
        
        # Check if response is a cancellation code (RS00281)
        # This is returned when user cancels transaction on POS device
        if response.strip() == 'RS00281' or response.endswith('RS00281'):
            # User cancelled transaction - this is a valid final response
            result['status'] = 'cancelled'
            result['success'] = False
            result['response_code'] = '81'
            result['response_message'] = 'تراکنش توسط کاربر لغو شد'
            LogService.log_info(
                'payment',
                'pos_cancelled_response_detected',
                details={
                    'response': response,
                    'note': 'User cancelled transaction on POS device'
                }
            )
            return result
        
        # Check if response is too short (likely an ACK, not final response)
        # Example: RS013RS00299PD0011 (only 18 chars, no card info)
        # Final response should have SR (serial), RN (reference), PN (card number)
        if len(response) < 30:
            # This is likely just an ACK that message was received
            # Not the final transaction response
            LogService.log_warning(
                'payment',
                'pos_response_too_short_likely_ack',
                details={
                    'response_length': len(response),
                    'response': response,
                    'note': 'Ignoring - waiting for full transaction response'
                }
            )
            # Return as failed so caller keeps waiting
            result['status'] = 'pending'
            result['response_message'] = 'Waiting for transaction completion'
            return result
        
        # Parse response code (RS tag)
        # IMPORTANT: Response may contain multiple RS codes!
        # Example from official DLL: RS136RS00200...
        # - RS136 = success (code 00) - first RS code is the main status
        # - RS00200 = additional status code (can be ignored)
        # - RS013 = success (code 00) - alternative format
        # - RS00281 = cancelled by user (code 81)
        # - RS00202 = insufficient funds (code 02)
        # Format: RS + 3-5 digit code
        
        response_code = None
        all_rs_codes = []
        
        # Find ALL RS codes in response
        idx = 0
        while idx < len(response):
            rs_idx = response.find('RS', idx)
            if rs_idx == -1:
                break
            
            # Extract code after RS
            code_start = rs_idx + 2
            code_str = ''
            
            # Read next digits (max 5 digits for RS codes)
            for i in range(code_start, min(code_start + 5, len(response))):
                if response[i].isdigit():
                    code_str += response[i]
                else:
                    break
            
            if code_str:
                all_rs_codes.append(code_str)
            
            idx = rs_idx + 1
        
        # IMPORTANT: Check ALL RS codes, not just the first one!
        # Priority: Error codes (RS00XXX) > Specific errors (RS133) > Success codes (RS136, RS013)
        # Example: RS136RS00255 → RS00255 (error code 55) should take priority over RS136
        if all_rs_codes:
            # First, check if there's an error code (RS00XXX format) in ANY position
            # Error codes have higher priority than success codes
            error_code_found = None
            for code in all_rs_codes:
                if code.startswith('00') and len(code) >= 3:
                    error_code_found = code
                    break
            
            # If error code found, use it (even if success code exists)
            # BUT: RS00200 means code 00 (success), not error!
            if error_code_found:
                first_code = error_code_found
                # Extract error code from RS00XYZ
                # RS00255 → extract '255', then get last 2 digits '55'
                # RS00281 → extract '281', then get last 2 digits '81'
                # RS00200 → extract '200', then get last 2 digits '00' (SUCCESS!)
                if len(first_code) >= 4:
                    response_code = first_code[-2:]  # Get last 2 digits
                else:
                    response_code = first_code[-1]  # Get last digit
                
                LogService.log_info('payment', 'pos_error_code_extracted', details={
                    'raw_code': first_code,
                    'extracted_code': response_code,
                    'all_rs_codes': all_rs_codes,
                    'note': 'RS00XXX code found, checking if it\'s success (00) or error'
                })
                
                # IMPORTANT: RS00200 means code 00 (success), not error!
                # Only treat as error if response_code is NOT '00'
                if response_code == '00':
                    # RS00200 = success (code 00)
                    result['success'] = True
                    result['status'] = 'success'
                    result['response_message'] = 'تراکنش موفق'
                elif response_code == '81':
                    # RS00281 = cancelled (code 81)
                    result['status'] = 'cancelled'
                    result['success'] = False
                    result['response_message'] = 'تراکنش توسط کاربر لغو شد'
                else:
                    # Other error codes (55, 02, etc.)
                    result['status'] = 'failed'
                    result['success'] = False
                    result['response_message'] = self.get_error_message(response_code)
            
            # No error code found, check first code for specific errors or success
            else:
                first_code = all_rs_codes[0]
                
                LogService.log_info('payment', 'pos_response_code_extracted', details={
                    'all_rs_codes': all_rs_codes,
                    'first_code': first_code,
                    'note': 'No error code found, using first RS code as main status'
                })
                
                # RS133 → رمز اشتباه (PIN wrong) - code 03
                if first_code == '133':
                    response_code = '03'
                    result['success'] = False
                    result['status'] = 'failed'
                    result['response_message'] = 'تراکنش ناموفق - رمز اشتباه'
                
                # RS136 or RS013 or RS01 → success (code 00)
                # IMPORTANT: Only use codes that are confirmed in documentation/logs
                elif first_code in ['136', '013', '01', '1']:
                    response_code = '00'
                    result['success'] = True
                    result['status'] = 'success'
                    result['response_message'] = 'تراکنش موفق'
                
                # RS00XYZ → error/cancel codes (fallback, should not reach here if error_code_found worked)
                elif first_code.startswith('00') and len(first_code) >= 3:
                    # Extract error code from RS00XYZ
                    # RS00281 → extract '281', then get last 2 digits '81'
                    # RS00202 → extract '202', then get last 2 digits '02'
                    if len(first_code) >= 4:
                        # RS00281 → get last 2 digits
                        response_code = first_code[-2:]
                    else:
                        # RS002 → get last digit
                        response_code = first_code[-1]
                    
                    LogService.log_info('payment', 'pos_error_code_extracted', details={
                        'raw_code': first_code,
                        'extracted_code': response_code
                    })
                    
                    # Check if cancelled by user (code 81)
                    if response_code == '81':
                        result['status'] = 'cancelled'
                        result['success'] = False
                        result['response_message'] = 'تراکنش توسط کاربر لغو شد'
                    else:
                        result['status'] = 'failed'
                        result['success'] = False
                        result['response_message'] = self.get_error_message(response_code)
                
                # Other RS codes (like RS081, RS81, RS00200)
                else:
                    # Try to extract error code from various formats
                    # RS081 → code 81, RS81 → code 81, RS00200 → code 00
                    if len(first_code) >= 2:
                        # Check if it ends with 81 (cancelled)
                        if first_code.endswith('81'):
                            response_code = '81'
                            result['status'] = 'cancelled'
                            result['success'] = False
                            result['response_message'] = 'تراکنش توسط کاربر لغو شد'
                        # Check if it's a 3-digit code starting with 0
                        elif len(first_code) == 3 and first_code.startswith('0'):
                            # RS002 → code 02, RS081 → code 81
                            response_code = first_code[1:]  # Remove leading 0
                            if response_code == '81':
                                result['status'] = 'cancelled'
                                result['success'] = False
                                result['response_message'] = 'تراکنش توسط کاربر لغو شد'
                            else:
                                result['status'] = 'failed'
                                result['success'] = False
                                result['response_message'] = self.get_error_message(response_code)
                        # Check if it's a success code
                        # IMPORTANT: Only use codes that are confirmed in documentation/logs
                        # - RS136 = success (confirmed)
                        # - RS013 = success (confirmed)
                        # - RS01 = success (confirmed)
                        # - RS1 = success (confirmed)
                        # NOTE: RS13 (without leading zero) is NOT confirmed - removed
                        elif first_code in ['136', '013', '01', '1']:
                            response_code = '00'
                            result['success'] = True
                            result['status'] = 'success'
                            result['response_message'] = 'تراکنش موفق'
                        else:
                            response_code = first_code
                            result['status'] = 'failed'
                            result['success'] = False
                            result['response_message'] = self.get_error_message(response_code)
                    else:
                        response_code = first_code
                        result['status'] = 'failed'
                        result['success'] = False
                        result['response_message'] = self.get_error_message(response_code)
            
            result['response_code'] = response_code
        
        # No RS tag found
        if not response_code:
            result['response_code'] = '99'
            result['status'] = 'failed'
            result['response_message'] = 'خطای نامشخص - کد پاسخ یافت نشد'
        
        # Extract reference number (RN tag) - 12 digits
        # Format: RN012748932407357 (length=12, value=748932407357)
        if 'RN' in response:
            idx = response.find('RN')
            if idx != -1:
                # RN is followed by length (2 digits) then value (12 digits)
                end_idx = idx + 2
                # Skip length digits (2 digits)
                while end_idx < len(response) and response[end_idx].isdigit() and end_idx - idx - 2 < 2:
                    end_idx += 1
                # Now read the actual value (12 digits)
                value_start = end_idx
                while end_idx < len(response) and response[end_idx].isdigit() and end_idx - value_start < 12:
                    end_idx += 1
                if end_idx > value_start:
                    result['reference_number'] = response[value_start:end_idx].strip()
        
        # Extract transaction serial (SR tag) - 6 digits
        # Format: SR006005608 (length=6, value=005608)
        if 'SR' in response:
            idx = response.find('SR')
            if idx != -1:
                # SR is followed by length (2 digits) then value (6 digits)
                end_idx = idx + 2
                # Skip length digits (2 digits)
                while end_idx < len(response) and response[end_idx].isdigit() and end_idx - idx - 2 < 2:
                    end_idx += 1
                # Now read the actual value (6 digits)
                value_start = end_idx
                while end_idx < len(response) and response[end_idx].isdigit() and end_idx - value_start < 6:
                    end_idx += 1
                if end_idx > value_start:
                    result['transaction_id'] = response[value_start:end_idx].strip()
        
        # Extract transaction reference (TR tag) - 6 digits
        if 'TR' in response:
            idx = response.find('TR')
            if idx != -1:
                # TR is followed by length (2 digits) then value (6 digits)
                # Format: TR006727358
                end_idx = idx + 2
                # Skip length digits (2 digits)
                while end_idx < len(response) and response[end_idx].isdigit() and end_idx - idx - 2 < 2:
                    end_idx += 1
                # Now read the actual value (6 digits)
                value_start = end_idx
                while end_idx < len(response) and response[end_idx].isdigit() and end_idx - value_start < 6:
                    end_idx += 1
                if end_idx > value_start:
                    result['transaction_reference'] = response[value_start:end_idx].strip()
        
        # Extract terminal ID (TM tag) - 8 digits
        # IMPORTANT: In official DLL response, TM = Terminal ID (not time!)
        if 'TM' in response:
            idx = response.find('TM')
            if idx != -1:
                # TM is followed by length (2 digits) then value (8 digits)
                # Format: TM00898194184
                end_idx = idx + 2
                # Skip length digits (2 digits)
                while end_idx < len(response) and response[end_idx].isdigit() and end_idx - idx - 2 < 2:
                    end_idx += 1
                # Now read the actual value (8 digits)
                value_start = end_idx
                while end_idx < len(response) and response[end_idx].isdigit() and end_idx - value_start < 8:
                    end_idx += 1
                if end_idx > value_start:
                    result['terminal_id'] = response[value_start:end_idx].strip()
        
        # Extract transaction info (TI tag) - date/time
        # Format: TI0191404/10/15-20:20:15
        if 'TI' in response:
            idx = response.find('TI')
            if idx != -1:
                # TI is followed by length (2 digits) then value
                end_idx = idx + 2
                # Skip length digits (2 digits)
                while end_idx < len(response) and response[end_idx].isdigit() and end_idx - idx - 2 < 2:
                    end_idx += 1
                # Now read the actual value (date/time string)
                value_start = end_idx
                # Read until next tag (uppercase letters) or end of string
                while end_idx < len(response):
                    if end_idx < len(response) - 1 and response[end_idx].isupper() and response[end_idx+1].isupper():
                        # Found next tag
                        break
                    end_idx += 1
                if end_idx > value_start:
                    ti_value = response[value_start:end_idx].strip()
                    result['transaction_info'] = ti_value
                    # Try to parse date/time from format: 1404/10/15-20:20:15
                    if '/' in ti_value and '-' in ti_value:
                        parts = ti_value.split('-')
                        if len(parts) == 2:
                            result['transaction_date'] = parts[0]  # 1404/10/15
                            result['transaction_time'] = parts[1]  # 20:20:15
        
        # Extract card number (PN tag - PAN)
        if 'PN' in response:
            idx = response.find('PN')
            if idx != -1:
                # PN is followed by length (2 digits) then value
                # Format: PN012621986**1236
                end_idx = idx + 2
                # Skip length digits (2 digits)
                while end_idx < len(response) and response[end_idx].isdigit() and end_idx - idx - 2 < 2:
                    end_idx += 1
                # Now read the actual value (card number, may contain *)
                value_start = end_idx
                while end_idx < len(response) and (response[end_idx].isdigit() or response[end_idx] == '*'):
                    end_idx += 1
                if end_idx > value_start:
                    result['card_number'] = response[value_start:end_idx].strip()
        
        # Extract date/time (DS tag) - alternative format
        if 'DS' in response:
            idx = response.find('DS')
            if idx != -1:
                result['transaction_date'] = response[idx+2:idx+8].strip()  # YYMMDD
        
        return result
    
    def get_error_message(self, error_code: str) -> str:
        """Get human-readable error message from error code."""
        error_messages = {
            '00': 'تراکنش موفق',
            '01': 'تراکنش ناموفق - کارت نامعتبر',
            '02': 'تراکنش ناموفق - موجودی کافی نیست',
            '03': 'تراکنش ناموفق - رمز اشتباه',
            '04': 'تراکنش ناموفق - کارت منقضی شده',
            '05': 'تراکنش ناموفق - خطا در ارتباط',
            '06': 'تراکنش ناموفق - خطای سیستم',
            '81': 'تراکنش توسط کاربر لغو شد',
            '99': 'تراکنش ناموفق - خطای نامشخص',
        }
        return error_messages.get(error_code, f'خطای نامشخص: {error_code}')

