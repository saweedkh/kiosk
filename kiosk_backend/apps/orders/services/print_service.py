"""
Print service for sending receipts to network printers using python-escpos.
"""
from typing import Dict, Any, List, Optional
import os
import sys
import threading
from concurrent.futures import Future, ThreadPoolExecutor
from pathlib import Path
from PIL import Image, ImageFont
from django.conf import settings
from django.db import connection
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

_FONT_CACHE: Optional[Dict[str, ImageFont.ImageFont]] = None
_FONT_CACHE_LOCK = threading.Lock()
_RENDER_POOL = ThreadPoolExecutor(max_workers=1, thread_name_prefix='receipt-render')


class PrintService:
    """
    Service for printing receipts to network printers.

    Uses python-escpos library for ESC/POS commands.
    """

    @staticmethod
    def get_printer_config() -> Dict[str, Any]:
        from apps.core.hardware_config import get_printer_config

        return get_printer_config()

    @staticmethod
    def schedule_print(order_id: int) -> None:
        """Print receipt in a background thread so payment API can return immediately."""

        def _run() -> None:
            try:
                order = Order.objects.select_related('user').prefetch_related(
                    'items__product'
                ).get(pk=order_id)
                PrintService.print_receipt(order)
            except Order.DoesNotExist:
                LogService.log_warning(
                    'print',
                    'async_print_order_missing',
                    details={'order_id': order_id},
                )
            except Exception as exc:
                LogService.log_error(
                    'print',
                    'async_print_failed',
                    details={
                        'order_id': order_id,
                        'error': str(exc),
                        'error_type': type(exc).__name__,
                    },
                )
            finally:
                connection.close()

        thread = threading.Thread(
            target=_run,
            name=f'print-order-{order_id}',
            daemon=True,
        )
        thread.start()

    @staticmethod
    def _resolve_receipt_font_path() -> str:
        """Locate Persian receipt TTF in dev, PyInstaller bundle, or beside the EXE."""
        names = ('Vazirmatn-Bold.ttf', 'Vazir-Bold.ttf')
        roots: List[Path] = [Path(settings.BASE_DIR)]
        if getattr(sys, 'frozen', False):
            meipass = getattr(sys, '_MEIPASS', None)
            if meipass:
                roots.insert(0, Path(meipass))
            try:
                from apps.core.desktop_paths import get_package_root

                roots.append(get_package_root())
            except Exception:
                pass
        seen: set[str] = set()
        for root in roots:
            for name in names:
                candidate = (root / 'static' / name).resolve()
                key = str(candidate)
                if key in seen:
                    continue
                seen.add(key)
                if candidate.is_file():
                    return key
        return ''

    @staticmethod
    def _load_fonts() -> Dict[str, ImageFont.ImageFont]:
        global _FONT_CACHE
        with _FONT_CACHE_LOCK:
            if _FONT_CACHE is not None:
                return _FONT_CACHE

        fonts = {
            'title': None,
            'ticket': None,
            'bold': None,
            'normal': None,
            'meta': None,
            'small': None,
        }
        font_path = PrintService._resolve_receipt_font_path()
        try:
            if font_path:
                fonts['title'] = ImageFont.truetype(font_path, ReceiptConstants.FONT_SIZE_TITLE)
                fonts['ticket'] = ImageFont.truetype(font_path, ReceiptConstants.FONT_SIZE_TICKET)
                fonts['bold'] = ImageFont.truetype(font_path, ReceiptConstants.FONT_SIZE_BOLD)
                fonts['normal'] = ImageFont.truetype(font_path, ReceiptConstants.FONT_SIZE_NORMAL)
                fonts['meta'] = ImageFont.truetype(font_path, ReceiptConstants.FONT_SIZE_META)
                fonts['small'] = ImageFont.truetype(font_path, ReceiptConstants.FONT_SIZE_SMALL)
        except (OSError, IOError) as e:
            LogService.log_warning(
                'print',
                'font_load_failed',
                details={'error': str(e), 'font_path': font_path},
            )

        fallback = ImageFont.load_default()
        for key in fonts:
            if fonts[key] is None:
                fonts[key] = fallback

        with _FONT_CACHE_LOCK:
            _FONT_CACHE = fonts
        return fonts

    @staticmethod
    def generate_receipt_image(
        receipt_data: Dict[str, Any],
        width: int = 576,
        fonts: Optional[Dict[str, ImageFont.ImageFont]] = None,
    ) -> Image.Image:
        """
        Generate receipt image using the selected template from settings.
        """
        if fonts is None:
            fonts = PrintService._load_fonts()
        template = (receipt_data.get('receipt_template') or 'modern').strip() or 'modern'
        return render_receipt(receipt_data, fonts, width=width, template=template)

    @staticmethod
    def _render_copy_async(
        base_receipt_data: Dict[str, Any],
        copy_label: str,
        width: int,
        fonts: Dict[str, ImageFont.ImageFont],
    ) -> Future:
        data = {
            **base_receipt_data,
            'copy_label': (copy_label or '').strip(),
        }
        return _RENDER_POOL.submit(
            PrintService.generate_receipt_image, data, width, fonts
        )

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
    def _print_image(printer: Any, receipt_image: Image.Image, *, cut: bool = True) -> None:
        printer.set(align='center')
        if receipt_image.mode != 'RGB':
            receipt_image = receipt_image.convert('RGB')
        # bitImageRaster is the most compatible mode on ESC/POS network printers.
        try:
            printer.image(receipt_image, impl='bitImageRaster')
        except Exception:
            printer.image(
                receipt_image,
                impl='graphics',
                fragment_height=512,
                high_density_vertical=True,
                high_density_horizontal=True,
            )
        printer.text("\n\n")
        if cut:
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

        printer_ip = config.get('ip')
        printer_port = config.get('port', 9100)
        copy_labels = PrintService._receipt_copy_labels()

        try:
            # Lazy import: python-escpos loads capabilities.json at import time.
            # Keep it out of module import so PyInstaller/Django URL load (and /health/)
            # does not fail when that data file is missing or unused.
            from escpos.printer import Network

            printer = Network(printer_ip, port=printer_port, timeout=5)
            printer.profile.media['width']['pixel'] = ReceiptConstants.IMAGE_WIDTH

            # Build receipt payload once; only copy_label differs between dual copies
            base_receipt_data = ReceiptService.generate_receipt_data(order)
            fonts = PrintService._load_fonts()
            width = ReceiptConstants.IMAGE_WIDTH

            printed_copies = []
            if len(copy_labels) == 1:
                receipt_data = {
                    **base_receipt_data,
                    'copy_label': (copy_labels[0] or '').strip(),
                }
                receipt_image = PrintService.generate_receipt_image(
                    receipt_data, width=width, fonts=fonts
                )
                PrintService._print_image(printer, receipt_image, cut=True)
                printed_copies.append(copy_labels[0] or 'single')
            else:
                # Dual: render next copy while the printer sends the current one
                pending = None
                for idx, copy_label in enumerate(copy_labels):
                    if pending is not None:
                        receipt_image = pending.result()
                    else:
                        receipt_data = {
                            **base_receipt_data,
                            'copy_label': (copy_label or '').strip(),
                        }
                        receipt_image = PrintService.generate_receipt_image(
                            receipt_data, width=width, fonts=fonts
                        )

                    next_pending = None
                    if idx + 1 < len(copy_labels):
                        next_label = copy_labels[idx + 1]
                        next_pending = PrintService._render_copy_async(
                            base_receipt_data, next_label, width, fonts
                        )

                    PrintService._print_image(printer, receipt_image, cut=True)
                    printed_copies.append(copy_label or 'single')
                    pending = next_pending

                if pending is not None:
                    pending.result()

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
