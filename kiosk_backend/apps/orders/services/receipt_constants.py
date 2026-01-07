"""
Constants for receipt generation and printing.
"""
from django.conf import settings


class ReceiptConstants:
    """Constants for receipt image generation."""
    
    # Font sizes
    FONT_SIZE_LARGE = 32
    FONT_SIZE_BOLD = 22
    FONT_SIZE_NORMAL = 20
    FONT_SIZE_DATE = 24
    
    # Layout dimensions
    SIDE_MARGIN = 8
    TOP_PADDING = 20
    SECTION_SPACING = 12
    STORE_NAME_HEIGHT = 45
    DATE_HEIGHT = 40
    DATE_TABLE_SPACING = 20
    TABLE_HEADER_HEIGHT = 40
    TABLE_ROW_HEIGHT = 35
    TOTAL_HEIGHT = 40
    THANK_YOU_HEIGHT = 35
    BOTTOM_PADDING = 20
    
    # Image dimensions
    IMAGE_WIDTH = 576  # 120mm thermal printer width
    BORDER_THICK = 2
    BORDER_THIN = 1
    CELL_PADDING = 8
    
    # Table column widths (as percentages)
    COL_WIDTH_PRICE = 0.25
    COL_WIDTH_QUANTITY = 0.25
    COL_WIDTH_NAME = 0.50
    
    # Text limits
    MAX_NAME_LENGTH = 20
    
    # Store name (from settings or default)
    STORE_NAME = getattr(settings, 'STORE_NAME', 'نانوایی ستاره سرخ')
    
    # Thank you message
    THANK_YOU_MESSAGE = "ممنون از خرید شما"
    
    # Total label
    TOTAL_LABEL = "مبلغ کل فاکتور :"

