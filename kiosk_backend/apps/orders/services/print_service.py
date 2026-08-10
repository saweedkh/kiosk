"""
Print service for sending receipts to network printers using python-escpos.
"""
from typing import Dict, Any, List
import os
from PIL import Image, ImageFont
from escpos.printer import Network
from django.conf import settings
from apps.orders.models import Order
from apps.orders.services.receipt_service import ReceiptService
from apps.orders.services.receipt_constants import ReceiptConstants
from apps.orders.services.receipt_layouts import render_receipt
from apps.logs.services.log_service import LogService


# Labels used when dual-copy mode is enabled
RECEIPT_COPIES_DUAL: List[str] = [
    'فاکتور مشتری',
    'فاکتور فروشنده',
]


class PrintService:
    """
    Service for printing receipts to network printers.

    Uses python-escpos library for ESC/POS commands.
    """

    @staticmethod
    def get_printer_config() -> Dict[str, Any]:
        from apps.core.services.hardware_config import HardwareConfig

        return HardwareConfig.printer_config()

    @staticmethod
    def _load_fonts() -> Dict[str, ImageFont.ImageFont]:
        fonts = {
            'title': None,
            'ticket': None,
            'bold': None,
            'normal': None,
            'meta': None,
            'small': None,
        }
        vazirmatn_bold_path = ''
        try:
            vazirmatn_bold_path = os.path.join(settings.BASE_DIR, 'static', 'Vazirmatn-Bold.ttf')
            if os.path.exists(vazirmatn_bold_path):
                fonts['title'] = ImageFont.truetype(vazirmatn_bold_path, ReceiptConstants.FONT_SIZE_TITLE)
                fonts['ticket'] = ImageFont.truetype(vazirmatn_bold_path, ReceiptConstants.FONT_SIZE_TICKET)
                fonts['bold'] = ImageFont.truetype(vazirmatn_bold_path, ReceiptConstants.FONT_SIZE_BOLD)
                fonts['normal'] = ImageFont.truetype(vazirmatn_bold_path, ReceiptConstants.FONT_SIZE_NORMAL)
                fonts['meta'] = ImageFont.truetype(vazirmatn_bold_path, ReceiptConstants.FONT_SIZE_META)
                fonts['small'] = ImageFont.truetype(vazirmatn_bold_path, ReceiptConstants.FONT_SIZE_SMALL)
        except (OSError, IOError) as e:
            LogService.log_warning(
                'print',
                'font_load_failed',
                details={'error': str(e), 'font_path': vazirmatn_bold_path},
            )

        fallback = ImageFont.load_default()
        for key in fonts:
            if fonts[key] is None:
                fonts[key] = fallback
        return fonts

    @staticmethod
    def generate_receipt_image(receipt_data: Dict[str, Any], width: int = 576) -> Image.Image:
        """
        Generate receipt image using the selected template from settings.
        """
        fonts = PrintService._load_fonts()
        template = (receipt_data.get('receipt_template') or 'modern').strip() or 'modern'
        return render_receipt(receipt_data, fonts, width=width, template=template)

    @staticmethod
    def save_receipt_image(receipt_image: Image.Image, order_number: str, request=None, suffix: str = '') -> str:
        """
        Save receipt image to media folder and return URL.
        """
        receipts_dir = os.path.join(settings.MEDIA_ROOT, 'receipts')
        os.makedirs(receipts_dir, exist_ok=True)

        tag = f"_{suffix}" if suffix else ''
        filename = f"receipt_{order_number}{tag}.png"
        file_path = os.path.join(receipts_dir, filename)
        receipt_image.save(file_path, 'PNG')

        if request:
            return request.build_absolute_uri(f"{settings.MEDIA_URL}receipts/{filename}")
        return f"{settings.MEDIA_URL}receipts/{filename}"

    @staticmethod
    def _print_image(printer: Network, receipt_image: Image.Image) -> None:
        printer.set(align='center')
        if receipt_image.mode != 'RGB':
            receipt_image = receipt_image.convert('RGB')
        printer.image(receipt_image, impl='bitImageRaster')
        printer.text("\n\n")
        printer.cut()

    @staticmethod
    def _receipt_copy_labels() -> List[str]:
        """
        Resolve which physical copies to print from site settings.
        single → one unlabeled copy; dual → customer then seller.
        """
        from apps.core.models.settings import SiteSettings

        mode = SiteSettings.get_settings().receipt_copy_mode
        if mode == SiteSettings.RECEIPT_COPY_MODE_SINGLE:
            return ['']
        return list(RECEIPT_COPIES_DUAL)

    @staticmethod
    def print_receipt(order: Order) -> bool:
        """
        Print receipt(s) for an order according to receipt_copy_mode setting.
        """
        config = PrintService.get_printer_config()

        if not config.get('enabled', False):
            LogService.log_info(
                'print',
                'printing_disabled',
                details={'order_id': order.id, 'order_number': order.order_number},
            )
            return False

        printer_ip = (config.get('ip') or '').strip()
        if not printer_ip:
            LogService.log_error(
                'print',
                'printer_host_missing',
                details={'order_id': order.id, 'order_number': order.order_number},
            )
            return False

        if order.payment_status != 'paid':
            LogService.log_warning(
                'print',
                'cannot_print_unpaid_order',
                details={
                    'order_id': order.id,
                    'order_number': order.order_number,
                    'payment_status': order.payment_status,
                },
            )
            return False

        printer_port = config.get('port', 9100)
        copy_labels = PrintService._receipt_copy_labels()

        try:
            printer = Network(printer_ip, port=printer_port)
            printer.profile.media['width']['pixel'] = ReceiptConstants.IMAGE_WIDTH

            printed_copies = []
            for copy_label in copy_labels:
                receipt_data = ReceiptService.generate_receipt_data_for_copy(order, copy_label)
                receipt_image = PrintService.generate_receipt_image(
                    receipt_data, width=ReceiptConstants.IMAGE_WIDTH
                )
                PrintService._print_image(printer, receipt_image)
                printed_copies.append(copy_label or 'single')

            printer.close()

            LogService.log_info(
                'print',
                'receipt_printed',
                details={
                    'order_id': order.id,
                    'order_number': order.order_number,
                    'receipt_number': order.receipt_number,
                    'copies': printed_copies,
                    'copy_count': len(printed_copies),
                    'fulfillment_type': getattr(order, 'fulfillment_type', None),
                    'printer_ip': printer_ip,
                    'printer_port': printer_port,
                },
            )
            return True

        except (ConnectionError, TimeoutError, OSError) as e:
            LogService.log_error(
                'print',
                'print_connection_error',
                details={
                    'order_id': order.id,
                    'order_number': order.order_number,
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'printer_ip': config.get('ip'),
                    'printer_port': config.get('port'),
                },
            )
            return False
        except Exception as e:
            LogService.log_error(
                'print',
                'print_error',
                details={
                    'order_id': order.id,
                    'order_number': order.order_number,
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'printer_ip': config.get('ip'),
                    'printer_port': config.get('port'),
                },
            )
            return False
