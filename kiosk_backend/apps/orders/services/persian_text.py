"""
Persian/Arabic text shaping for Pillow and ESC/POS raster output.

Pillow + libraqm (HarfBuzz) already does joining and BiDi. Feeding it
arabic_reshaper + get_display on top of that reverses letters and breaks
connections — that is what the thermal receipt was showing.

When raqm is missing (typical Windows EXE wheel), reshape + bidi is required.
"""
from functools import lru_cache

import arabic_reshaper
from bidi.algorithm import get_display


@lru_cache(maxsize=1)
def uses_raqm() -> bool:
    try:
        from PIL import features

        return bool(features.check('raqm'))
    except Exception:
        return False


def pillow_text_kwargs() -> dict:
    """Extra kwargs for ImageDraw.text / textbbox."""
    if uses_raqm():
        return {'direction': 'rtl', 'language': 'fa'}
    return {}


def reshape_persian(text: str) -> str:
    """
    Prepare Persian/Arabic for drawing.

    With raqm: return logical Unicode (HarfBuzz shapes it).
    Without raqm: presentation forms + visual LTR order for Pillow.
    """
    if not text:
        return text
    text = str(text)
    if uses_raqm():
        return text
    return get_display(arabic_reshaper.reshape(text))
