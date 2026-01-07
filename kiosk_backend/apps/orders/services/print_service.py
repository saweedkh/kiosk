"""
Print service for sending receipts to network printers using python-escpos.
"""
from typing import Dict, Any
import os
from PIL import Image, ImageDraw, ImageFont
from escpos.printer import Network
from django.conf import settings
from apps.orders.models import Order
from apps.orders.services.receipt_service import ReceiptService
from apps.orders.services.receipt_constants import ReceiptConstants
from apps.logs.services.log_service import LogService


class PrintService:
    """
    Service for printing receipts to network printers.
    
    Uses python-escpos library for ESC/POS commands.
    """
    
    @staticmethod
    def get_printer_config() -> Dict[str, Any]:
        """
        Get printer configuration from settings.
        
        Returns:
            Dict[str, Any]: Printer configuration
        """
        return {
            'enabled': getattr(settings, 'PRINTER_ENABLED', False),
            'ip': getattr(settings, 'PRINTER_IP', '192.168.1.100'),
            'port': getattr(settings, 'PRINTER_PORT', 9100),
        }
    
    @staticmethod
    def generate_receipt_image(receipt_data: Dict[str, Any], width: int = 576) -> Image.Image:
        """
        Generate complete receipt image with precise layout and borders.
        
        Args:
            receipt_data: Receipt data dictionary
            width: Image width in pixels (576 for 120mm thermal printer)
            
        Returns:
            PIL Image object with complete receipt
        """
        # Load fonts with better sizes
        font_bold_large = None
        font_bold = None
        font_normal = None
        font_date_number = None  # Larger font for date and number
        try:
            base_dir = settings.BASE_DIR
            static_dir = os.path.join(base_dir, 'static')
            vazirmatn_bold_path = os.path.join(static_dir, 'Vazirmatn-Bold.ttf')
            
            if os.path.exists(vazirmatn_bold_path):
                font_bold_large = ImageFont.truetype(vazirmatn_bold_path, ReceiptConstants.FONT_SIZE_LARGE)
                font_bold = ImageFont.truetype(vazirmatn_bold_path, ReceiptConstants.FONT_SIZE_BOLD)
                font_normal = ImageFont.truetype(vazirmatn_bold_path, ReceiptConstants.FONT_SIZE_NORMAL)
                font_date_number = ImageFont.truetype(vazirmatn_bold_path, ReceiptConstants.FONT_SIZE_DATE)
        except (OSError, IOError) as e:
            LogService.log_warning(
                'print',
                'font_load_failed',
                details={'error': str(e), 'font_path': vazirmatn_bold_path}
            )
        
        if font_bold_large is None:
            font_bold_large = ImageFont.load_default()
        if font_bold is None:
            font_bold = font_bold_large
        if font_normal is None:
            font_normal = font_bold_large
        if font_date_number is None:
            font_date_number = font_bold_large
        
        # Use constants for spacing and padding
        side_margin = ReceiptConstants.SIDE_MARGIN
        top_padding = ReceiptConstants.TOP_PADDING
        section_spacing = ReceiptConstants.SECTION_SPACING
        store_name_height = ReceiptConstants.STORE_NAME_HEIGHT
        date_height = ReceiptConstants.DATE_HEIGHT
        date_table_spacing = ReceiptConstants.DATE_TABLE_SPACING
        table_header_height = ReceiptConstants.TABLE_HEADER_HEIGHT
        table_row_height = ReceiptConstants.TABLE_ROW_HEIGHT
        total_height = ReceiptConstants.TOTAL_HEIGHT
        thank_you_height = ReceiptConstants.THANK_YOU_HEIGHT
        bottom_padding = ReceiptConstants.BOTTOM_PADDING
        
        # Prepare table data with better formatting
        # ترتیب ستون‌ها: قیمت، تعداد، نام (از چپ به راست) - پس نام در سمت راست است
        headers = ['قیمت', 'تعداد', 'نام']
        rows = []
        items = receipt_data.get('items', [])
        for item in items:
            name = item.get('name', '')
            quantity = item.get('quantity', 0)
            price = item.get('price', '')
            price_clean = price.replace('تومان', '').replace(',', '').strip()
            try:
                price_num = int(price_clean)
                price_formatted = f"{price_num:,}"
            except (ValueError, TypeError):
                price_formatted = price
            # Truncate name if too long
            if len(name) > ReceiptConstants.MAX_NAME_LENGTH:
                name = name[:ReceiptConstants.MAX_NAME_LENGTH-3] + '...'
            # ترتیب: قیمت، تعداد، نام
            rows.append([price_formatted, str(quantity), name])
        
        # Calculate table height with proper borders
        table_height = table_header_height + (len(rows) * table_row_height) + 4  # +4 for borders
        
        # Calculate total height
        total_image_height = (
            top_padding +
            store_name_height +
            section_spacing +
            date_height +  # Date and number are on same line
            date_table_spacing +  # Extra spacing before table
            table_height +
            section_spacing +
            total_height +
            section_spacing +
            thank_you_height +
            bottom_padding
        )
        
        # Create main image
        img = Image.new('RGB', (width, total_image_height), 'white')
        draw = ImageDraw.Draw(img)
        
        y_pos = top_padding
        
        # Store name (centered, bold, large) with better positioning
        store_name = receipt_data.get('store_name', '')
        bbox = draw.textbbox((0, 0), store_name, font=font_bold_large)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        text_x = (width - text_width) // 2
        text_y = y_pos + (store_name_height - text_height) // 2
        draw.text((text_x, text_y), store_name, fill=(0, 0, 0), font=font_bold_large)
        y_pos += store_name_height + section_spacing
        
        # Receipt number (left) and date with time (right) - شماره سمت چپ، تاریخ و ساعت سمت راست
        # با فونت بزرگ‌تر و فاصله بیشتر تا جدول
        date = receipt_data.get('date', '')
        time = receipt_data.get('time', '')
        receipt_number = receipt_data.get('receipt_number', '')
        number_text = f"شماره : {receipt_number}"
        date_text = f"تاریخ : {date}  ساعت : {time}"
        
        # Receipt number (left aligned) with larger font
        bbox = draw.textbbox((0, 0), number_text, font=font_date_number)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        text_x = side_margin  # Left margin
        text_y = y_pos + (date_height - text_height) // 2
        draw.text((text_x, text_y), number_text, fill=(0, 0, 0), font=font_date_number)
        
        # Date (right aligned) with larger font
        bbox = draw.textbbox((0, 0), date_text, font=font_date_number)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        text_x = width - text_width - side_margin  # Right margin
        text_y = y_pos + (date_height - text_height) // 2
        draw.text((text_x, text_y), date_text, fill=(0, 0, 0), font=font_date_number)
        y_pos += date_height + date_table_spacing  # Extra spacing before table
        
        # Table with precise borders and side margins
        table_y = y_pos
        table_width = width - (side_margin * 2)  # Table width with margins
        table_x = side_margin  # Start position with margin
        
        # Better column widths using constants
        col_widths = [
            int(table_width * ReceiptConstants.COL_WIDTH_PRICE),  # قیمت (چپ)
            int(table_width * ReceiptConstants.COL_WIDTH_QUANTITY),  # تعداد (وسط)
            int(table_width * ReceiptConstants.COL_WIDTH_NAME)   # نام (راست)
        ]
        
        # Draw table borders with clean, precise lines
        border_color = (0, 0, 0)
        border_thick = ReceiptConstants.BORDER_THICK
        border_thin = ReceiptConstants.BORDER_THIN
        
        # Outer borders with margins - clean rectangle
        # Top border
        draw.line([(table_x, table_y), (table_x + table_width, table_y)], fill=border_color, width=border_thick)
        # Bottom border
        draw.line([(table_x, table_y + table_height - 1), (table_x + table_width, table_y + table_height - 1)], fill=border_color, width=border_thick)
        # Left border
        draw.line([(table_x, table_y), (table_x, table_y + table_height)], fill=border_color, width=border_thick)
        # Right border
        draw.line([(table_x + table_width - 1, table_y), (table_x + table_width - 1, table_y + table_height)], fill=border_color, width=border_thick)
        
        # Header row border (thicker)
        header_bottom = table_y + table_header_height
        draw.line([(table_x, header_bottom), (table_x + table_width, header_bottom)], fill=border_color, width=border_thick)
        
        # Vertical column borders (clean thin lines)
        x_pos = table_x + col_widths[0]
        draw.line([(x_pos, table_y), (x_pos, table_y + table_height)], fill=border_color, width=border_thin)
        x_pos += col_widths[1]
        draw.line([(x_pos, table_y), (x_pos, table_y + table_height)], fill=border_color, width=border_thin)
        
        # Draw header with better padding - همه وسط چین
        cell_padding = ReceiptConstants.CELL_PADDING
        x_pos = table_x
        for i, header_text in enumerate(headers):
            col_width = col_widths[i]
            bbox = draw.textbbox((0, 0), header_text, font=font_bold)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            # همه header ها وسط چین
            text_x = x_pos + (col_width - text_width) // 2
            text_y = table_y + (table_header_height - text_height) // 2
            draw.text((text_x, text_y), header_text, fill=(0, 0, 0), font=font_bold)
            x_pos += col_width
        
        # Draw rows with better alignment
        # قیمت و تعداد: وسط چین | نام: راست چین
        row_y = header_bottom + 1
        for row_idx, row in enumerate(rows):
            x_pos = table_x
            for i, cell_text in enumerate(row):
                col_width = col_widths[i]
                bbox = draw.textbbox((0, 0), cell_text, font=font_normal)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
                
                # Align: قیمت و تعداد وسط چین، نام راست چین
                if i == 0:  # قیمت - center aligned
                    text_x = x_pos + (col_width - text_width) // 2
                elif i == 1:  # تعداد - center aligned
                    text_x = x_pos + (col_width - text_width) // 2
                else:  # نام - right aligned
                    text_x = x_pos + col_width - cell_padding - text_width
                
                text_y = row_y + (table_row_height - text_height) // 2
                draw.text((text_x, text_y), cell_text, fill=(0, 0, 0), font=font_normal)
                x_pos += col_width
            
            # Row separator (except for last row)
            if row_idx < len(rows) - 1:
                draw.line(
                    [(table_x, row_y + table_row_height), (table_x + table_width, row_y + table_row_height)],
                    fill=border_color,
                    width=border_thin
                )
            
            row_y += table_row_height
        
        y_pos = table_y + table_height + section_spacing
        
        # Total amount (white background, black text) - no border
        total_amount = receipt_data.get('total_amount', '')
        total_clean = total_amount.replace('تومان', '').replace(',', '').strip()
        try:
            total_num = int(total_clean)
            total_formatted = f"{total_num:,}"
        except (ValueError, TypeError):
            total_formatted = total_amount
        
        total_text = f"{ReceiptConstants.TOTAL_LABEL} {total_formatted} ریال"
        
        # Draw black text centered (no background, no border)
        total_y = y_pos
        bbox = draw.textbbox((0, 0), total_text, font=font_bold)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        text_x = (width - text_width) // 2
        text_y = total_y + (total_height - text_height) // 2
        # Use black text
        draw.text((text_x, text_y), total_text, fill=(0, 0, 0), font=font_bold)
        y_pos += total_height + section_spacing
        
        # Thank you message (centered) with better spacing
        thank_text = ReceiptConstants.THANK_YOU_MESSAGE
        bbox = draw.textbbox((0, 0), thank_text, font=font_normal)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        text_x = (width - text_width) // 2
        text_y = y_pos + (thank_you_height - text_height) // 2
        draw.text((text_x, text_y), thank_text, fill=(0, 0, 0), font=font_normal)
        
        return img
    
    @staticmethod
    def save_receipt_image(receipt_image: Image.Image, order_number: str, request=None) -> str:
        """
        Save receipt image to media folder and return URL.
        
        Args:
            receipt_image: PIL Image object
            order_number: Order number for filename
            request: HTTP request object (optional, for building full URL)
            
        Returns:
            str: Full URL to access the image
        """
        # Create receipts directory in media if it doesn't exist
        receipts_dir = os.path.join(settings.MEDIA_ROOT, 'receipts')
        os.makedirs(receipts_dir, exist_ok=True)
        
        # Generate filename
        filename = f"receipt_{order_number}.png"
        file_path = os.path.join(receipts_dir, filename)
        
        # Save image
        receipt_image.save(file_path, 'PNG')
        
        # Generate full URL
        if request:
            file_url = request.build_absolute_uri(f"{settings.MEDIA_URL}receipts/{filename}")
        else:
            file_url = f"{settings.MEDIA_URL}receipts/{filename}"
        
        return file_url
    
    @staticmethod
    def print_receipt(order: Order) -> bool:
        """
        Print receipt for an order using python-escpos.
        
        Args:
            order: Order instance with items prefetched
            
        Returns:
            bool: True if print was successful, False otherwise
        """
        config = PrintService.get_printer_config()
        
        # Check if printing is enabled
        if not config.get('enabled', False):
            LogService.log_info(
                'print',
                'printing_disabled',
                details={
                    'order_id': order.id,
                    'order_number': order.order_number
                }
            )
            return False
        
        # Only print for paid orders
        if order.payment_status != 'paid':
            LogService.log_warning(
                'print',
                'cannot_print_unpaid_order',
                details={
                    'order_id': order.id,
                    'order_number': order.order_number,
                    'payment_status': order.payment_status
                }
            )
            return False
        
        try:
            # Generate receipt data
            receipt_data = ReceiptService.generate_receipt_data(order)
            
            # Generate complete receipt image first
            receipt_image = PrintService.generate_receipt_image(receipt_data, width=ReceiptConstants.IMAGE_WIDTH)
            
            # Get printer configuration
            printer_ip = config.get('ip')
            printer_port = config.get('port', 9100)
            
            # Create printer instance
            printer = Network(printer_ip, port=printer_port)
            
            # Set printer profile BEFORE using set() to avoid warnings
            printer.profile.media['width']['pixel'] = ReceiptConstants.IMAGE_WIDTH  # 120mm thermal printer width
            
            # Print the complete receipt image
            printer.set(align='center')
            
            # Ensure image is in RGB mode
            if receipt_image.mode != 'RGB':
                receipt_image = receipt_image.convert('RGB')
            
            # Print image
            printer.image(receipt_image, impl='bitImageRaster')
            
            # Feed paper before cutting
            printer.text("\n\n")
            
            # Cut paper
            printer.cut()
            
            # Close connection
            printer.close()
            
            # Log success
            receipt_number = receipt_data.get('receipt_number', '')
            LogService.log_info(
                'print',
                'receipt_printed',
                details={
                    'order_id': order.id,
                    'order_number': order.order_number,
                    'receipt_number': receipt_number,
                    'printer_ip': printer_ip,
                    'printer_port': printer_port
                }
            )
            
            return True
            
        except (ConnectionError, TimeoutError, OSError) as e:
            # Network/printer connection errors
            LogService.log_error(
                'print',
                'print_connection_error',
                details={
                    'order_id': order.id,
                    'order_number': order.order_number,
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'printer_ip': config.get('ip'),
                    'printer_port': config.get('port')
                }
            )
            return False
        except Exception as e:
            # Unexpected errors
            LogService.log_error(
                'print',
                'print_error',
                details={
                    'order_id': order.id,
                    'order_number': order.order_number,
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'printer_ip': config.get('ip'),
                    'printer_port': config.get('port')
                }
            )
            return False
