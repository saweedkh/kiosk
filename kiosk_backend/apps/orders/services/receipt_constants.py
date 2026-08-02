"""
Constants for receipt generation and printing.
"""
from django.conf import settings


class ReceiptConstants:
    """Constants for receipt image generation."""

    # Font sizes
    FONT_SIZE_TITLE = 46
    FONT_SIZE_TICKET = 52
    FONT_SIZE_BOLD = 30
    FONT_SIZE_NORMAL = 28
    FONT_SIZE_META = 26
    FONT_SIZE_SMALL = 24

    # Layout
    SIDE_MARGIN = 28
    MARGIN = SIDE_MARGIN  # alias for compatibility
    TOP_PADDING = 36
    BOTTOM_PADDING = 40
    SECTION_GAP = 22
    LINE_GAP = 10
    ITEM_ROW_HEIGHT = 52
    HEADER_ROW_HEIGHT = 44
    TOTAL_BAND_HEIGHT = 72
    TICKET_BLOCK_HEIGHT = 70

    # Image
    IMAGE_WIDTH = 576  # 120mm thermal printer

    # Text
    MAX_NAME_LENGTH = 18

    # Fallbacks
    STORE_NAME = getattr(settings, 'STORE_NAME', 'نانوایی ستاره سرخ')
    THANK_YOU_MESSAGE = "ممنون از خرید شما"
    TOTAL_LABEL = "مبلغ قابل پرداخت"
