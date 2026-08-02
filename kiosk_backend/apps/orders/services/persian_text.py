"""
Persian/Arabic text shaping for Pillow and ESC/POS raster output.

Pillow draws LTR without BiDi or letter joining, so Persian must be
reshaped and reordered before measuring or drawing.
"""
import arabic_reshaper
from bidi.algorithm import get_display


def reshape_persian(text: str) -> str:
    """
    Reshape and reorder Persian/Arabic text for correct visual display.

    Args:
        text: Logical Unicode string (reading order)

    Returns:
        Visual-order string with joined letter forms for LTR renderers
    """
    if not text:
        return text
    reshaped = arabic_reshaper.reshape(str(text))
    return get_display(reshaped)
