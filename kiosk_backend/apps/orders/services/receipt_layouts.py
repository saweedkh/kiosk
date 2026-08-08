"""
Receipt layout templates for thermal printing.
Each renderer returns a full PIL RGB image.
"""
from typing import Any, Dict, List, Tuple

from PIL import Image, ImageDraw, ImageFont

from apps.orders.services.persian_text import reshape_persian
from apps.orders.services.receipt_constants import ReceiptConstants


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> Tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def draw_centered(
    draw: ImageDraw.ImageDraw,
    y: int,
    text: str,
    font: ImageFont.ImageFont,
    width: int,
    fill=(0, 0, 0),
) -> int:
    display = reshape_persian(text)
    tw, th = text_size(draw, display, font)
    draw.text(((width - tw) // 2, y), display, fill=fill, font=font)
    return th


def draw_right(
    draw: ImageDraw.ImageDraw,
    y: int,
    text: str,
    font: ImageFont.ImageFont,
    width: int,
    margin: int,
    fill=(0, 0, 0),
) -> int:
    display = reshape_persian(text)
    tw, th = text_size(draw, display, font)
    draw.text((width - margin - tw, y), display, fill=fill, font=font)
    return th


def draw_left(
    draw: ImageDraw.ImageDraw,
    y: int,
    text: str,
    font: ImageFont.ImageFont,
    margin: int,
    fill=(0, 0, 0),
) -> int:
    display = reshape_persian(text)
    _, th = text_size(draw, display, font)
    draw.text((margin, y), display, fill=fill, font=font)
    return th


def draw_ornament(draw: ImageDraw.ImageDraw, y: int, width: int, margin: int = 40) -> None:
    """Centered decorative divider for Persian receipts."""
    mid = width // 2
    draw.line([(margin, y), (mid - 18, y)], fill=(0, 0, 0), width=2)
    draw.ellipse([mid - 5, y - 5, mid + 5, y + 5], outline=(0, 0, 0), width=2)
    draw.line([(mid + 18, y), (width - margin, y)], fill=(0, 0, 0), width=2)


def draw_rule(
    draw: ImageDraw.ImageDraw,
    y: int,
    x1: int,
    x2: int,
    style: str = 'solid',
    thickness: int = 2,
) -> None:
    if style == 'double':
        draw.line([(x1, y), (x2, y)], fill=(0, 0, 0), width=thickness)
        draw.line([(x1, y + 5), (x2, y + 5)], fill=(0, 0, 0), width=thickness)
    elif style == 'dashed':
        dash, gap = 10, 8
        x = x1
        while x < x2:
            end = min(x + dash, x2)
            draw.line([(x, y), (end, y)], fill=(0, 0, 0), width=thickness)
            x += dash + gap
    else:
        draw.line([(x1, y), (x2, y)], fill=(0, 0, 0), width=thickness)


def prepare_items(receipt_data: Dict[str, Any]) -> List[Dict[str, str]]:
    prepared = []
    for item in receipt_data.get('items', []) or []:
        name = str(item.get('name', '') or '').strip()
        price_str = str(item.get('price', '') or '')
        price_clean = (
            price_str.replace('تومان', '').replace('ریال', '').replace(',', '').strip()
        )
        try:
            price = f"{int(price_clean):,}"
        except (ValueError, TypeError):
            price = price_clean or price_str
        prepared.append({
            'name': name,
            'quantity': str(item.get('quantity', 0)),
            'price': price,
        })
    return prepared


def _text_pixel_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> int:
    if not text:
        return 0
    return text_size(draw, reshape_persian(text), font)[0]


def _longest_prefix_fit(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    max_width: int,
    suffix: str = '',
) -> int:
    """Largest character count of text that fits in max_width (optionally with suffix)."""
    if not text or max_width <= 0:
        return 0
    lo, hi = 0, len(text)
    best = 0
    while lo <= hi:
        mid = (lo + hi) // 2
        probe = text[:mid] + suffix
        if mid == 0 or _text_pixel_width(draw, probe, font) <= max_width:
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1
    return best


def wrap_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    max_width: int,
    max_lines: int = 2,
) -> List[str]:
    """
    Wrap text to at most max_lines within max_width pixels.
    Stays single-line when it fits; otherwise wraps (prefer word breaks).
    """
    text = (text or '').strip()
    if not text:
        return ['']
    if max_width <= 0 or _text_pixel_width(draw, text, font) <= max_width:
        return [text]

    lines: List[str] = []
    rest = text
    while rest and len(lines) < max_lines:
        last_slot = len(lines) == max_lines - 1
        # If this is the last allowed line and more remains, reserve room for ellipsis.
        need_ellipsis = last_slot and _text_pixel_width(draw, rest, font) > max_width
        suffix = '...' if need_ellipsis else ''
        fit = _longest_prefix_fit(draw, rest, font, max_width, suffix=suffix)
        if fit <= 0:
            fit = 1

        chunk = rest[:fit]
        # Prefer breaking at last space (when not forced into ellipsis-only cut)
        if fit < len(rest):
            space = chunk.rfind(' ')
            if space > 0:
                fit = space
                chunk = rest[:fit]

        chunk = chunk.strip()
        rest = rest[fit:].strip()

        if last_slot and rest:
            base = chunk
            while base and _text_pixel_width(draw, base + '...', font) > max_width:
                base = base[:-1].rstrip()
            lines.append((base + '...') if base else '...')
            break

        if not chunk:
            chunk = rest[:1]
            rest = rest[1:].strip()
        lines.append(chunk)

    return lines or [text]


def draw_right_wrapped(
    draw: ImageDraw.ImageDraw,
    y: int,
    text: str,
    font: ImageFont.ImageFont,
    page_width: int,
    margin: int,
    max_width: int | None = None,
    max_lines: int = 2,
    line_gap: int = 4,
    fill=(0, 0, 0),
) -> int:
    """Draw right-aligned wrapped name (1–2 lines). Returns height used."""
    max_w = page_width - (2 * margin) if max_width is None else max_width
    lines = wrap_text(draw, text, font, max_w, max_lines=max_lines)
    used = 0
    for i, line in enumerate(lines):
        display = reshape_persian(line)
        tw, th = text_size(draw, display, font)
        draw.text((page_width - margin - tw, y + used), display, fill=fill, font=font)
        used += th
        if i < len(lines) - 1:
            used += line_gap
    return used


def measure_draw() -> ImageDraw.ImageDraw:
    return ImageDraw.Draw(Image.new('RGB', (8, 8), 'white'))


def crop_receipt(img: Image.Image, y: int, width: int, bottom_pad: int = 36) -> Image.Image:
    final_h = max(int(y) + bottom_pad, 80)
    if final_h < img.height:
        return img.crop((0, 0, width, final_h))
    if final_h > img.height:
        taller = Image.new('RGB', (width, final_h), 'white')
        taller.paste(img, (0, 0))
        return taller
    return img


def format_total(receipt_data: Dict[str, Any]) -> str:
    total_str = str(receipt_data.get('total_amount', '') or '')
    total_clean = (
        total_str.replace('تومان', '').replace('ریال', '').replace(',', '').strip()
    )
    try:
        return f"{int(total_clean):,}"
    except (ValueError, TypeError):
        return total_clean or total_str


def common_fields(receipt_data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'store_name': (receipt_data.get('store_name') or '').strip(),
        'date': receipt_data.get('date', ''),
        'time': receipt_data.get('time', ''),
        'receipt_number': receipt_data.get('receipt_number', ''),
        'thank_message': (
            receipt_data.get('thank_you_message') or ReceiptConstants.THANK_YOU_MESSAGE
        ).strip(),
        'items': prepare_items(receipt_data),
        'total': format_total(receipt_data),
    }


def render_modern(receipt_data: Dict[str, Any], fonts: Dict, width: int) -> Image.Image:
    """Current modern ticket-style layout."""
    data = common_fields(receipt_data)
    margin = ReceiptConstants.SIDE_MARGIN
    content_width = width - (margin * 2)
    items = data['items']

    height = ReceiptConstants.TOP_PADDING
    if data['store_name']:
        height += ReceiptConstants.FONT_SIZE_TITLE + 18
    height += 16 + ReceiptConstants.SECTION_GAP
    height += ReceiptConstants.TICKET_BLOCK_HEIGHT + 30
    height += ReceiptConstants.FONT_SIZE_META + 8 + ReceiptConstants.SECTION_GAP
    height += 16 + ReceiptConstants.HEADER_ROW_HEIGHT + 12
    height += max(len(items), 1) * (ReceiptConstants.ITEM_ROW_HEIGHT + ReceiptConstants.FONT_SIZE_NORMAL + 12)
    height += ReceiptConstants.SECTION_GAP + ReceiptConstants.TOTAL_BAND_HEIGHT
    height += ReceiptConstants.SECTION_GAP + 18 + ReceiptConstants.FONT_SIZE_NORMAL + 24
    height += ReceiptConstants.BOTTOM_PADDING

    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)
    y = ReceiptConstants.TOP_PADDING

    if data['store_name']:
        th = draw_centered(draw, y, data['store_name'], fonts['title'], width)
        y += th + 18

    draw_rule(draw, y, margin, width - margin, style='double', thickness=2)
    y += 16 + ReceiptConstants.SECTION_GAP

    ticket_label = reshape_persian('شماره فیش')
    tw, th = text_size(draw, ticket_label, fonts['small'])
    draw.text(((width - tw) // 2, y), ticket_label, fill=(0, 0, 0), font=fonts['small'])
    y += th + 8

    ticket_value = reshape_persian(str(data['receipt_number']))
    tw, th = text_size(draw, ticket_value, fonts['ticket'])
    draw.text(((width - tw) // 2, y), ticket_value, fill=(0, 0, 0), font=fonts['ticket'])
    y += th + 18

    th = draw_centered(draw, y, f"{data['date']}   |   {data['time']}", fonts['meta'], width)
    y += th + ReceiptConstants.SECTION_GAP

    draw_rule(draw, y, margin, width - margin, style='dashed', thickness=2)
    y += 18

    for label, align in (('مبلغ', 'left'), ('تعداد', 'center'), ('نام', 'right')):
        display = reshape_persian(label)
        tw, th = text_size(draw, display, fonts['bold'])
        if align == 'left':
            draw.text((margin, y), display, fill=(0, 0, 0), font=fonts['bold'])
        elif align == 'center':
            draw.text((margin + content_width // 2 - tw // 2, y), display, fill=(0, 0, 0), font=fonts['bold'])
        else:
            draw.text((width - margin - tw, y), display, fill=(0, 0, 0), font=fonts['bold'])
    y += ReceiptConstants.HEADER_ROW_HEIGHT - 8
    draw_rule(draw, y, margin, width - margin, style='solid', thickness=2)
    y += 14

    if not items:
        th = draw_centered(draw, y, 'بدون آیتم', fonts['normal'], width)
        y += th + 8
    else:
        name_max = int(content_width * 0.48)
        for idx, row in enumerate(items):
            qty_d = reshape_persian(row['quantity'])
            price_d = reshape_persian(row['price'])
            qw, qh = text_size(draw, qty_d, fonts['normal'])
            pw, ph = text_size(draw, price_d, fonts['normal'])
            name_h = draw_right_wrapped(
                draw, y, row['name'], fonts['normal'], width, margin,
                max_width=name_max, max_lines=2,
            )
            draw.text((margin, y), price_d, fill=(0, 0, 0), font=fonts['normal'])
            draw.text((margin + content_width // 2 - qw // 2, y), qty_d, fill=(0, 0, 0), font=fonts['normal'])
            y += max(name_h, qh, ph) + 18
            if idx < len(items) - 1:
                draw_rule(draw, y - 8, margin + 8, width - margin - 8, style='dashed', thickness=1)

    y += ReceiptConstants.SECTION_GAP // 2
    draw_rule(draw, y, margin, width - margin, style='solid', thickness=3)
    y += ReceiptConstants.SECTION_GAP

    band_h = ReceiptConstants.TOTAL_BAND_HEIGHT
    draw.rounded_rectangle([margin, y, width - margin, y + band_h], radius=14, fill=(0, 0, 0))
    total_line = reshape_persian(f"{ReceiptConstants.TOTAL_LABEL} : {data['total']} ریال")
    tw, th = text_size(draw, total_line, fonts['bold'])
    draw.text(((width - tw) // 2, y + (band_h - th) // 2), total_line, fill=(255, 255, 255), font=fonts['bold'])
    y += band_h + ReceiptConstants.SECTION_GAP

    draw_rule(draw, y, margin + 40, width - margin - 40, style='dashed', thickness=2)
    y += 18
    th = draw_centered(draw, y, data['thank_message'], fonts['normal'], width)
    y += th
    return crop_receipt(img, y, width)


def render_classic(receipt_data: Dict[str, Any], fonts: Dict, width: int) -> Image.Image:
    """
    Classic Persian invoice: title, ticket above datetime,
    filled header table, black total bar.
    """
    data = common_fields(receipt_data)
    margin = 20
    items = data['items'] or [{'name': '—', 'quantity': '—', 'price': '—'}]
    row_h_min = 52
    header_h = 50
    table_w = width - margin * 2
    col_w = [int(table_w * 0.30), int(table_w * 0.22), table_w - int(table_w * 0.30) - int(table_w * 0.22)]
    name_col_inner = max(col_w[2] - 16, 40)

    md = measure_draw()
    row_lines: List[List[str]] = []
    row_heights: List[int] = []
    for row in items:
        lines = wrap_text(md, row['name'], fonts['normal'], name_col_inner, max_lines=2)
        line_hs = [text_size(md, reshape_persian(line), fonts['normal'])[1] for line in lines]
        h = max(row_h_min, sum(line_hs) + 8 + 4 * max(len(lines) - 1, 0))
        row_lines.append(lines)
        row_heights.append(h)

    table_h = header_h + sum(row_heights)

    height = 32
    if data['store_name']:
        height += 70
    height += 20 + 56 + 40 + 24 + table_h + 24 + 68 + 22 + 44 + 36

    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)
    y = 32

    if data['store_name']:
        th = draw_centered(draw, y, data['store_name'], fonts['title'], width)
        y += th + 12
        draw_ornament(draw, y, width, margin=50)
        y += 22

    th = draw_centered(draw, y, 'شماره فیش', fonts['small'], width)
    y += th + 4
    th = draw_centered(draw, y, str(data['receipt_number']), fonts['ticket'], width)
    y += th + 10
    th = draw_centered(
        draw,
        y,
        f"تاریخ {data['date']}   ساعت {data['time']}",
        fonts['meta'],
        width,
    )
    y += th + 20

    table_x = margin
    table_y = y

    draw.rectangle(
        [table_x, table_y, table_x + table_w - 1, table_y + table_h],
        outline=(0, 0, 0),
        width=3,
    )
    draw.rectangle(
        [table_x + 2, table_y + 2, table_x + table_w - 3, table_y + header_h],
        fill=(0, 0, 0),
    )

    headers = ['مبلغ', 'تعداد', 'نام']
    x = table_x
    for i, h in enumerate(headers):
        display = reshape_persian(h)
        tw, th = text_size(draw, display, fonts['bold'])
        draw.text(
            (x + (col_w[i] - tw) // 2, table_y + (header_h - th) // 2),
            display,
            fill=(255, 255, 255),
            font=fonts['bold'],
        )
        x += col_w[i]

    x = table_x + col_w[0]
    draw.line([(x, table_y), (x, table_y + table_h)], fill=(0, 0, 0), width=2)
    x += col_w[1]
    draw.line([(x, table_y), (x, table_y + table_h)], fill=(0, 0, 0), width=2)

    row_y = table_y + header_h
    for idx, row in enumerate(items):
        rh = row_heights[idx]
        # price + qty centered on first line height
        price_d = reshape_persian(row['price'])
        qty_d = reshape_persian(row['quantity'])
        pw, ph = text_size(draw, price_d, fonts['normal'])
        qw, qh = text_size(draw, qty_d, fonts['normal'])
        first_line_h = max(
            ph,
            qh,
            text_size(draw, reshape_persian(row_lines[idx][0]), fonts['normal'])[1],
        )
        draw.text(
            (table_x + (col_w[0] - pw) // 2, row_y + (first_line_h - ph) // 2 + 4),
            price_d,
            fill=(0, 0, 0),
            font=fonts['normal'],
        )
        draw.text(
            (table_x + col_w[0] + (col_w[1] - qw) // 2, row_y + (first_line_h - qh) // 2 + 4),
            qty_d,
            fill=(0, 0, 0),
            font=fonts['normal'],
        )

        name_x_right = table_x + col_w[0] + col_w[1] + col_w[2] - 8
        ny = row_y + 4
        for li, line in enumerate(row_lines[idx]):
            display = reshape_persian(line)
            tw, th = text_size(draw, display, fonts['normal'])
            draw.text((name_x_right - tw, ny), display, fill=(0, 0, 0), font=fonts['normal'])
            ny += th + (4 if li < len(row_lines[idx]) - 1 else 0)

        if idx < len(items) - 1:
            draw.line(
                [(table_x, row_y + rh), (table_x + table_w, row_y + rh)],
                fill=(0, 0, 0),
                width=1,
            )
        row_y += rh

    y = table_y + table_h + 22
    band_h = 64
    draw.rectangle([margin, y, width - margin, y + band_h], fill=(0, 0, 0))
    total_line = reshape_persian(f"{ReceiptConstants.TOTAL_LABEL} : {data['total']} ریال")
    tw, th = text_size(draw, total_line, fonts['bold'])
    draw.text(((width - tw) // 2, y + (band_h - th) // 2), total_line, fill=(255, 255, 255), font=fonts['bold'])
    y += band_h + 20

    draw_ornament(draw, y, width, margin=70)
    y += 16
    th = draw_centered(draw, y, data['thank_message'], fonts['normal'], width)
    y += th
    return crop_receipt(img, y, width)


def render_minimal(receipt_data: Dict[str, Any], fonts: Dict, width: int) -> Image.Image:
    """
    Minimal Persian receipt: airy spacing, RTL rows,
    each item with name + qty/price labels.
    """
    data = common_fields(receipt_data)
    margin = 32
    items = data['items']

    height = 44
    if data['store_name']:
        height += 64
    height += 18 + 70 + 36 + 28
    height += max(len(items), 1) * (78 + ReceiptConstants.FONT_SIZE_BOLD)
    height += 24 + 56 + 28 + 40 + 44

    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)
    y = 44

    if data['store_name']:
        th = draw_centered(draw, y, data['store_name'], fonts['title'], width)
        y += th + 14
        draw_rule(draw, y, margin + 80, width - margin - 80, style='solid', thickness=1)
        y += 20

    th = draw_centered(draw, y, 'شماره فیش', fonts['small'], width)
    y += th + 6
    th = draw_centered(draw, y, str(data['receipt_number']), fonts['ticket'], width)
    y += th + 12
    th = draw_centered(
        draw,
        y,
        f"تاریخ : {data['date']}     ساعت : {data['time']}",
        fonts['meta'],
        width,
    )
    y += th + 22

    draw_rule(draw, y, margin, width - margin, style='dashed', thickness=2)
    y += 20

    if not items:
        th = draw_centered(draw, y, 'آیتمی ثبت نشده است', fonts['normal'], width)
        y += th + 16
    else:
        for idx, row in enumerate(items):
            th = draw_right_wrapped(
                draw, y, row['name'], fonts['bold'], width, margin, max_lines=2,
            )
            y += th + 8
            qty_label = reshape_persian(f"تعداد : {row['quantity']}")
            price_label = reshape_persian(f"مبلغ : {row['price']}")
            qw, qh = text_size(draw, qty_label, fonts['meta'])
            pw, ph = text_size(draw, price_label, fonts['meta'])
            draw.text((width - margin - qw, y), qty_label, fill=(0, 0, 0), font=fonts['meta'])
            draw.text((margin, y), price_label, fill=(0, 0, 0), font=fonts['meta'])
            y += max(qh, ph) + 14
            if idx < len(items) - 1:
                draw_rule(draw, y, margin + 20, width - margin - 20, style='dashed', thickness=1)
                y += 14

    draw_rule(draw, y, margin, width - margin, style='solid', thickness=2)
    y += 18

    total_line = reshape_persian(f"{ReceiptConstants.TOTAL_LABEL} : {data['total']} ریال")
    tw, th = text_size(draw, total_line, fonts['bold'])
    pad_x, pad_y = 18, 14
    box = [
        (width - tw) // 2 - pad_x,
        y - pad_y // 2,
        (width + tw) // 2 + pad_x,
        y + th + pad_y // 2,
    ]
    draw.rounded_rectangle(box, radius=8, outline=(0, 0, 0), width=2)
    draw.text(((width - tw) // 2, y), total_line, fill=(0, 0, 0), font=fonts['bold'])
    y += th + pad_y + 22

    th = draw_centered(draw, y, data['thank_message'], fonts['normal'], width)
    y += th
    return crop_receipt(img, y, width)


def render_elegant(receipt_data: Dict[str, Any], fonts: Dict, width: int) -> Image.Image:
    """
    Elegant Persian letterhead style: black header bar,
    RTL item cards, outlined total.
    """
    data = common_fields(receipt_data)
    margin = 24
    items = data['items']
    header_h = 78 if data['store_name'] else 28

    height = header_h + 28
    height += 64 + 40 + 22
    height += max(len(items), 1) * (72 + ReceiptConstants.FONT_SIZE_BOLD)
    height += 24 + 66 + 22 + 44 + 40

    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    # Letterhead
    draw.rectangle([0, 0, width, header_h], fill=(0, 0, 0))
    y = 22
    if data['store_name']:
        title = reshape_persian(data['store_name'])
        tw, th = text_size(draw, title, fonts['title'])
        draw.text(((width - tw) // 2, (header_h - th) // 2), title, fill=(255, 255, 255), font=fonts['title'])
    y = header_h + 24

    th = draw_centered(draw, y, 'شماره فیش', fonts['small'], width)
    y += th + 4
    th = draw_centered(draw, y, str(data['receipt_number']), fonts['ticket'], width)
    y += th + 10
    th = draw_centered(
        draw,
        y,
        f"تاریخ : {data['date']}     ساعت : {data['time']}",
        fonts['meta'],
        width,
    )
    y += th + 16

    draw_ornament(draw, y, width, margin=45)
    y += 22

    if not items:
        th = draw_centered(draw, y, 'آیتمی ثبت نشده است', fonts['normal'], width)
        y += th + 12
    else:
        for idx, row in enumerate(items):
            name_h = draw_right_wrapped(
                draw, y, row['name'], fonts['bold'], width, margin, max_lines=2,
            )
            y += name_h + 8

            qty_d = reshape_persian(f"تعداد {row['quantity']}")
            price_d = reshape_persian(f"{row['price']} ریال")
            qw, qh = text_size(draw, qty_d, fonts['meta'])
            pw, ph = text_size(draw, price_d, fonts['meta'])
            draw.text((width - margin - qw, y), qty_d, fill=(0, 0, 0), font=fonts['meta'])
            draw.text((margin, y), price_d, fill=(0, 0, 0), font=fonts['meta'])
            y += max(qh, ph) + 12

            if idx < len(items) - 1:
                draw_rule(draw, y, margin, width - margin, style='dashed', thickness=1)
                y += 14

    y += 8
    band_h = 62
    draw.rounded_rectangle(
        [margin, y, width - margin, y + band_h],
        radius=12,
        outline=(0, 0, 0),
        width=3,
    )
    draw.rounded_rectangle(
        [margin + 5, y + 5, width - margin - 5, y + band_h - 5],
        radius=8,
        outline=(0, 0, 0),
        width=1,
    )
    total_line = reshape_persian(f"{ReceiptConstants.TOTAL_LABEL} : {data['total']} ریال")
    tw, th = text_size(draw, total_line, fonts['bold'])
    draw.text(((width - tw) // 2, y + (band_h - th) // 2), total_line, fill=(0, 0, 0), font=fonts['bold'])
    y += band_h + 20

    draw_ornament(draw, y, width, margin=80)
    y += 16
    th = draw_centered(draw, y, data['thank_message'], fonts['normal'], width)
    y += th
    return crop_receipt(img, y, width)


def render_bold(receipt_data: Dict[str, Any], fonts: Dict, width: int = 576) -> Image.Image:
    """پررنگ — شماره خیلی بزرگ، خطوط ضخیم، مبلغ تمام‌عرض مشکی."""
    data = common_fields(receipt_data)
    items = data['items']
    margin = ReceiptConstants.SIDE_MARGIN
    height = 120
    if data['store_name']:
        height += 70
    height += 40 + 90 + 40 + max(len(items), 1) * (100 + ReceiptConstants.FONT_SIZE_BOLD) + 90 + 50 + 40

    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    y = 18

    draw.rectangle([0, 0, width, 14], fill=(0, 0, 0))
    y = 28

    if data['store_name']:
        th = draw_centered(draw, y, data['store_name'], fonts['title'], width)
        y += th + 12

    draw_rule(draw, y, 0, width, style='solid', thickness=6)
    y += 18

    th = draw_centered(draw, y, 'شماره فیش', fonts['normal'], width)
    y += th + 6

    num = reshape_persian(str(data['receipt_number']))
    nw, nh = text_size(draw, num, fonts['ticket'])
    draw.text(((width - nw) // 2 + 1, y + 1), num, fill=(0, 0, 0), font=fonts['ticket'])
    draw.text(((width - nw) // 2, y), num, fill=(0, 0, 0), font=fonts['ticket'])
    y += nh + 12

    th = draw_centered(draw, y, f"{data['date']}   |   {data['time']}", fonts['meta'], width)
    y += th + 16
    draw_rule(draw, y, 0, width, style='solid', thickness=6)
    y += 18

    if not items:
        th = draw_centered(draw, y, 'بدون آیتم', fonts['normal'], width)
        y += th + 12
    else:
        for idx, row in enumerate(items):
            name_h = draw_right_wrapped(
                draw, y, row['name'], fonts['bold'], width, margin, max_lines=2,
            )
            y += name_h + 8
            line = reshape_persian(f"{row['quantity']} × {row['price']} ریال")
            lw, lh = text_size(draw, line, fonts['normal'])
            draw.text((width - margin - lw, y), line, fill=(0, 0, 0), font=fonts['normal'])
            y += lh + 10
            if idx < len(items) - 1:
                draw_rule(draw, y, margin, width - margin, style='solid', thickness=3)
                y += 14

    y += 8
    band_h = 72
    draw.rectangle([0, y, width, y + band_h], fill=(0, 0, 0))
    total_line = reshape_persian(f"{ReceiptConstants.TOTAL_LABEL} : {data['total']} ریال")
    tw, th = text_size(draw, total_line, fonts['bold'])
    draw.text(((width - tw) // 2, y + (band_h - th) // 2), total_line, fill=(255, 255, 255), font=fonts['bold'])
    y += band_h + 18

    th = draw_centered(draw, y, data['thank_message'], fonts['normal'], width)
    y += th
    return crop_receipt(img, y, width)


def _draw_perforation(draw: ImageDraw.ImageDraw, y: int, width: int, hole: int = 8, gap: int = 10):
    x = 4
    while x < width - 4:
        draw.ellipse([x, y, x + hole, y + hole], fill=(0, 0, 0))
        x += hole + gap


def render_ticket(receipt_data: Dict[str, Any], fonts: Dict, width: int = 576) -> Image.Image:
    """بلیطی — لبه سوراخ‌دار، شماره بزرگ، شبیه بلیط نوبت."""
    data = common_fields(receipt_data)
    items = data['items']
    margin = ReceiptConstants.SIDE_MARGIN + 8
    height = 140
    if data['store_name']:
        height += 50
    height += 40 + 120 + 40 + max(len(items), 1) * (90 + ReceiptConstants.FONT_SIZE_BOLD) + 80 + 50 + 40

    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    y = 10

    _draw_perforation(draw, y, width)
    y += 22

    if data['store_name']:
        th = draw_centered(draw, y, data['store_name'], fonts['bold'], width)
        y += th + 10

    draw_rule(draw, y, margin, width - margin, style='dashed', thickness=2)
    y += 16

    stub = reshape_persian('شماره نوبت / فیش')
    sw, sh = text_size(draw, stub, fonts['meta'])
    draw.text(((width - sw) // 2, y), stub, fill=(0, 0, 0), font=fonts['meta'])
    y += sh + 8

    num = reshape_persian(str(data['receipt_number']))
    nw, nh = text_size(draw, num, fonts['ticket'])
    draw.text(((width - nw) // 2, y), num, fill=(0, 0, 0), font=fonts['ticket'])
    y += nh + 14

    th = draw_centered(draw, y, f"{data['date']}   |   {data['time']}", fonts['meta'], width)
    y += th + 16

    _draw_perforation(draw, y, width, hole=6, gap=8)
    y += 20

    if not items:
        th = draw_centered(draw, y, 'بدون آیتم', fonts['normal'], width)
        y += th + 12
    else:
        for row in items:
            name_h = draw_right_wrapped(
                draw, y, row['name'], fonts['bold'], width, margin, max_lines=2,
            )
            y += name_h + 6
            detail = reshape_persian(f"{row['quantity']} عدد  |  {row['price']} ریال")
            dw, dh = text_size(draw, detail, fonts['meta'])
            draw.text((width - margin - dw, y), detail, fill=(0, 0, 0), font=fonts['meta'])
            y += dh + 14

    y += 4
    draw_rule(draw, y, margin, width - margin, style='solid', thickness=3)
    y += 14
    total_line = reshape_persian(f"{ReceiptConstants.TOTAL_LABEL} : {data['total']} ریال")
    tw, th = text_size(draw, total_line, fonts['bold'])
    draw.text(((width - tw) // 2, y), total_line, fill=(0, 0, 0), font=fonts['bold'])
    y += th + 16

    _draw_perforation(draw, y, width)
    y += 20
    th = draw_centered(draw, y, data['thank_message'], fonts['normal'], width)
    y += th
    return crop_receipt(img, y, width)


def render_market(receipt_data: Dict[str, Any], fonts: Dict, width: int = 576) -> Image.Image:
    """بازاری — فاکتور فشرده فروشگاهی، متا دوستونه، لیست فشرده."""
    data = common_fields(receipt_data)
    items = data['items']
    margin = ReceiptConstants.SIDE_MARGIN
    height = 80
    if data['store_name']:
        height += 60
    height += 40 + 40 + 30 + max(len(items), 1) * (48 + ReceiptConstants.FONT_SIZE_NORMAL) + 60 + 40

    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    y = 16

    if data['store_name']:
        th = draw_centered(draw, y, data['store_name'], fonts['title'], width)
        y += th + 10

    draw_rule(draw, y, margin, width - margin, style='solid', thickness=2)
    y += 12

    date_d = reshape_persian(f"{data['date']} {data['time']}")
    rn_d = reshape_persian(f"شماره فیش {data['receipt_number']}")
    dw, dh = text_size(draw, date_d, fonts['meta'])
    rw, rh = text_size(draw, rn_d, fonts['meta'])
    draw.text((margin, y), date_d, fill=(0, 0, 0), font=fonts['meta'])
    draw.text((width - margin - rw, y), rn_d, fill=(0, 0, 0), font=fonts['meta'])
    y += max(dh, rh) + 12

    draw_rule(draw, y, margin, width - margin, style='dashed', thickness=1)
    y += 12

    h_name = reshape_persian('کالا')
    h_qty = reshape_persian('تعداد')
    h_price = reshape_persian('مبلغ')
    hw, hh = text_size(draw, h_name, fonts['meta'])
    qw, qh = text_size(draw, h_qty, fonts['meta'])
    pw, ph = text_size(draw, h_price, fonts['meta'])
    draw.text((width - margin - hw, y), h_name, fill=(0, 0, 0), font=fonts['meta'])
    draw.text(((width - qw) // 2, y), h_qty, fill=(0, 0, 0), font=fonts['meta'])
    draw.text((margin, y), h_price, fill=(0, 0, 0), font=fonts['meta'])
    y += max(hh, qh, ph) + 6
    draw_rule(draw, y, margin, width - margin, style='solid', thickness=1)
    y += 10

    content_w = width - 2 * margin
    name_max = int(content_w * 0.48)
    if not items:
        th = draw_centered(draw, y, 'بدون آیتم', fonts['normal'], width)
        y += th + 12
    else:
        for row in items:
            qty_d = reshape_persian(str(row['quantity']))
            price_d = reshape_persian(row['price'])
            qw, qh = text_size(draw, qty_d, fonts['normal'])
            pw, ph = text_size(draw, price_d, fonts['normal'])
            name_h = draw_right_wrapped(
                draw, y, row['name'], fonts['normal'], width, margin,
                max_width=name_max, max_lines=2,
            )
            draw.text(((width - qw) // 2, y), qty_d, fill=(0, 0, 0), font=fonts['normal'])
            draw.text((margin, y), price_d, fill=(0, 0, 0), font=fonts['normal'])
            y += max(name_h, qh, ph) + 12

    draw_rule(draw, y, margin, width - margin, style='solid', thickness=2)
    y += 12
    total_line = reshape_persian(f"{ReceiptConstants.TOTAL_LABEL} : {data['total']} ریال")
    tw, th = text_size(draw, total_line, fonts['bold'])
    draw.text((width - margin - tw, y), total_line, fill=(0, 0, 0), font=fonts['bold'])
    y += th + 16
    th = draw_centered(draw, y, data['thank_message'], fonts['meta'], width)
    y += th
    return crop_receipt(img, y, width)


def render_banner(receipt_data: Dict[str, Any], fonts: Dict, width: int = 576) -> Image.Image:
    """بنری — سر و ته نوار مشکی پهن، آیتم‌ها با پس‌زمینه راه‌راه."""
    data = common_fields(receipt_data)
    items = data['items']
    margin = ReceiptConstants.SIDE_MARGIN
    banner_h = 96
    height = banner_h + 40 + 70 + 40 + max(len(items), 1) * (90 + ReceiptConstants.FONT_SIZE_BOLD) + 80 + 50 + 40

    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, width, banner_h], fill=(0, 0, 0))
    title = (data['store_name'] or '').strip()
    title_d = reshape_persian(title) if title else ''
    if title_d:
        tw, th = text_size(draw, title_d, fonts['title'])
        draw.text(((width - tw) // 2, (banner_h - th) // 2), title_d, fill=(255, 255, 255), font=fonts['title'])
    y = banner_h + 16
    strip_h = 56
    draw.rectangle([margin, y, width - margin, y + strip_h], fill=(0, 0, 0))
    rn = reshape_persian(f"شماره فیش {data['receipt_number']}")
    rw, rh = text_size(draw, rn, fonts['bold'])
    draw.text(((width - rw) // 2, y + (strip_h - rh) // 2), rn, fill=(255, 255, 255), font=fonts['bold'])
    y += strip_h + 12

    th = draw_centered(draw, y, f"{data['date']}   |   {data['time']}", fonts['meta'], width)
    y += th + 16

    if not items:
        th = draw_centered(draw, y, 'بدون آیتم', fonts['normal'], width)
        y += th + 12
    else:
        for idx, row in enumerate(items):
            row_top = y - 6
            lines = wrap_text(draw, row['name'], fonts['bold'], width - 2 * margin, max_lines=2)
            detail = reshape_persian(f"{row['quantity']} × {row['price']} ریال")
            dw, dh = text_size(draw, detail, fonts['normal'])
            name_block_h = 0
            for li, line in enumerate(lines):
                name_block_h += text_size(draw, reshape_persian(line), fonts['bold'])[1]
                if li < len(lines) - 1:
                    name_block_h += 4
            row_h = name_block_h + dh + 16
            if idx % 2 == 1:
                for hy in range(row_top, row_top + row_h, 3):
                    draw.line([(margin, hy), (width - margin, hy)], fill=(0, 0, 0), width=1)
            name_h = draw_right_wrapped(
                draw, y, row['name'], fonts['bold'], width, margin, max_lines=2,
            )
            y += name_h + 6
            draw.text((width - margin - dw, y), detail, fill=(0, 0, 0), font=fonts['normal'])
            y += dh + 14

    y += 6
    band_h = 64
    draw.rectangle([0, y, width, y + band_h], fill=(0, 0, 0))
    total_line = reshape_persian(f"{ReceiptConstants.TOTAL_LABEL} : {data['total']} ریال")
    tw, th = text_size(draw, total_line, fonts['bold'])
    draw.text(((width - tw) // 2, y + (band_h - th) // 2), total_line, fill=(255, 255, 255), font=fonts['bold'])
    y += band_h + 16

    th = draw_centered(draw, y, data['thank_message'], fonts['normal'], width)
    y += th
    return crop_receipt(img, y, width)


LAYOUT_RENDERERS = {
    'modern': render_modern,
    'classic': render_classic,
    'minimal': render_minimal,
    'elegant': render_elegant,
    'bold': render_bold,
    'ticket': render_ticket,
    'market': render_market,
    'banner': render_banner,
}


def prepend_copy_and_fulfillment(
    img: Image.Image,
    receipt_data: Dict[str, Any],
    fonts: Dict,
) -> Image.Image:
    """
    Prepend a clear banner for copy type (customer/seller)
    and fulfillment type (dine-in/takeaway) above any template.
    """
    copy_label = (receipt_data.get('copy_label') or '').strip()
    fulfillment = (receipt_data.get('fulfillment_label') or '').strip()
    if not copy_label and not fulfillment:
        return img

    width = img.width
    pad_top = 14
    banner_h = 58 if copy_label else 0
    gap = 10 if copy_label and fulfillment else 0
    fulfill_h = 44 if fulfillment else 0
    pad_bottom = 14
    extra = pad_top + banner_h + gap + fulfill_h + pad_bottom

    out = Image.new('RGB', (width, img.height + extra), 'white')
    draw = ImageDraw.Draw(out)
    y = pad_top

    if copy_label:
        draw.rectangle([0, y, width, y + banner_h], fill=(0, 0, 0))
        label = reshape_persian(copy_label)
        tw, th = text_size(draw, label, fonts['bold'])
        draw.text(
            ((width - tw) // 2, y + (banner_h - th) // 2),
            label,
            fill=(255, 255, 255),
            font=fonts['bold'],
        )
        y += banner_h + gap

    if fulfillment:
        # Emphasize takeaway more
        is_takeaway = (receipt_data.get('fulfillment_type') or '') == 'takeaway'
        box_fill = (0, 0, 0) if is_takeaway else (240, 240, 240)
        text_fill = (255, 255, 255) if is_takeaway else (0, 0, 0)
        margin = ReceiptConstants.SIDE_MARGIN
        draw.rounded_rectangle(
            [margin, y, width - margin, y + fulfill_h],
            radius=10,
            fill=box_fill,
            outline=(0, 0, 0),
            width=2,
        )
        label = reshape_persian(f'نوع سفارش: {fulfillment}')
        tw, th = text_size(draw, label, fonts['bold'])
        draw.text(
            ((width - tw) // 2, y + (fulfill_h - th) // 2),
            label,
            fill=text_fill,
            font=fonts['bold'],
        )
        y += fulfill_h

    out.paste(img, (0, extra))
    return out


def render_receipt(
    receipt_data: Dict[str, Any],
    fonts: Dict,
    width: int = 576,
    template: str = 'modern',
) -> Image.Image:
    renderer = LAYOUT_RENDERERS.get(template) or render_modern
    img = renderer(receipt_data, fonts, width)
    return prepend_copy_and_fulfillment(img, receipt_data, fonts)
