"""
منوها و متن‌های ربات بله — چیدمان تمیز و UX دکمه‌محور.
"""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Sequence

from django.contrib.auth import get_user_model

from apps.accounts.services.permission_service import PermissionService

User = get_user_model()

PAGE_SIZE = 8

ORDER_STATUS_LABELS = {
    'pending': 'در انتظار',
    'processing': 'در حال پردازش',
    'paid': 'پرداخت‌شده',
    'completed': 'تکمیل‌شده',
    'cancelled': 'لغو‌شده',
}

PAYMENT_STATUS_LABELS = {
    'pending': 'در انتظار',
    'processing': 'در حال پردازش',
    'paid': 'پرداخت‌شده',
    'failed': 'ناموفق',
    'cancelled': 'لغو‌شده',
    'success': 'موفق',
}

FULFILLMENT_LABELS = {
    'dine_in': 'داخل سالن',
    'takeaway': 'بیرون‌بر',
}


def inline_keyboard(rows: List[List[Dict[str, str]]]) -> Dict[str, Any]:
    return {'inline_keyboard': rows}


def btn(text: str, data: str) -> Dict[str, str]:
    return {'text': text[:64], 'callback_data': data[:64]}


def nav_back(callback: str, label: str = '⬅️ بازگشت') -> List[Dict[str, str]]:
    return [btn(label, callback)]


def truncate(text: str, limit: int = 24) -> str:
    text = (text or '').strip()
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 1)] + '…'


def fmt_num(value) -> str:
    try:
        return f'{int(value):,}'.replace(',', '٬')
    except (TypeError, ValueError):
        return str(value)


def fmt_money(value) -> str:
    return f'{fmt_num(value)} ریال'


def order_status_label(code: str) -> str:
    return ORDER_STATUS_LABELS.get(code, code or '—')


def payment_status_label(code: str) -> str:
    return PAYMENT_STATUS_LABELS.get(code, code or '—')


def fulfillment_label(code: str) -> str:
    return FULFILLMENT_LABELS.get(code, code or '—')


def progress_bar(step: int, total: int) -> str:
    step = max(1, min(step, total))
    filled = '●' * step
    empty = '○' * (total - step)
    return f'{filled}{empty}  مرحله {step} از {total}'


def cancel_hint() -> str:
    return 'برای لغو: انصراف'


# ─── Main hub ───────────────────────────────────────────────────────────────

def build_main_menu(user: User) -> Dict[str, Any]:
    rows: List[List[Dict[str, str]]] = []
    if PermissionService.user_has_permission(user, 'view_orders'):
        rows.append([btn('🧾 سفارش‌های نیازمند اقدام', 'o:queue:action:0')])
    if PermissionService.user_has_permission(user, 'view_reports'):
        rows.append([btn('📅 گزارش امروز', 'report:daily')])
    if PermissionService.user_has_permission(user, 'change_stock'):
        rows.append([btn('⚠️ موجودی بحرانی', 'report:low_stock')])
    rows.append([btn('📚 منوی کامل', 'menu:full')])
    return inline_keyboard(rows)


def welcome_text(user: User) -> str:
    name = user.get_full_name() or user.username
    groups = '، '.join(user.groups.values_list('name', flat=True)) or 'بدون گروه'
    lines = [
        f'سلام {name} 👋',
        'خلاصه امروز فروشگاه را ببینید و مستقیم اقدام کنید.',
        '',
        f'نقش شما: {groups}',
        '',
        'پایین همین پیام، میانبرهای اصلی روزانه را می‌بینید.',
        'اگر گزینه‌های بیشتری خواستید، «منوی کامل» را بزنید.',
    ]
    return '\n'.join(lines)


def section_title(emoji: str, title: str, subtitle: str = '') -> str:
    lines = [f'{emoji} {title}']
    if subtitle:
        lines.append(subtitle)
    return '\n'.join(lines)


# ─── Reports ────────────────────────────────────────────────────────────────

def build_full_menu(user: User) -> Dict[str, Any]:
    rows: List[List[Dict[str, str]]] = [[btn('🏠 وضعیت امروز', 'menu:main')]]

    if PermissionService.user_has_permission(user, 'view_orders'):
        rows.append([btn('🧾 سفارش‌ها', 'menu:orders')])

    catalog_row: List[Dict[str, str]] = []
    if PermissionService.user_has_permission(user, 'view_products'):
        catalog_row.append(btn('📦 محصولات', 'menu:products'))
    if PermissionService.user_has_permission(user, 'change_stock'):
        catalog_row.append(btn('📥 موجودی', 'menu:stock'))
    if catalog_row:
        rows.append(catalog_row)

    if PermissionService.user_has_permission(user, 'view_reports'):
        rows.append([btn('📊 گزارشات', 'menu:reports')])

    rows.append([btn('⚙️ تنظیمات سریع', 'menu:quick')])
    rows.append([btn('❓ راهنما', 'menu:help')])
    rows.append(nav_back('menu:main', '⬅️ بازگشت به داشبورد'))
    return inline_keyboard(rows)


def build_quick_settings_menu(user: User) -> Dict[str, Any]:
    rows: List[List[Dict[str, str]]] = [[btn('🏠 تازه‌سازی وضعیت امروز', 'menu:main')]]
    if PermissionService.user_has_permission(user, 'view_reports'):
        rows.append([btn('📅 گزارش امروز', 'report:daily'), btn('🕐 گزارش ساعتی', 'report:hourly:0')])
    if PermissionService.user_has_permission(user, 'change_stock'):
        rows.append([btn('⚠️ موجودی بحرانی', 'report:low_stock')])
    rows.append([btn('❓ راهنمای کوتاه', 'menu:help')])
    rows.append(nav_back('menu:full', '⬅️ منوی کامل'))
    return inline_keyboard(rows)

def build_reports_menu() -> Dict[str, Any]:
    return inline_keyboard([
        [btn('📅 گزارش روز (امروز)', 'report:daily')],
        [btn('📅 گزارش روز با تاریخ', 'report:pick_daily')],
        [btn('🕐 گزارش ساعتی (امروز)', 'report:hourly:0')],
        [btn('🕐 گزارش ساعتی با تاریخ', 'report:pick_hourly')],
        [btn('🗓 بازه از–تا (تاریخ)', 'report:pick_range')],
        [btn('🗓 بازه‌های آماده', 'menu:report_ranges')],
        [btn('📈 گزارش کامل ۷ روز', 'report:sales7')],
        [btn('🚨 گزارش استثناها', 'report:exceptions')],
        [btn('📦 ارزش انبار', 'report:stock'), btn('🏷 محصولات', 'report:products')],
        nav_back('menu:full', '⬅️ منوی کامل'),
    ])


def report_refresh_callback(
    kind: str,
    *,
    anchor_iso: str | None = None,
    page: int = 0,
    range_start_iso: str | None = None,
    range_end_iso: str | None = None,
) -> str:
    if kind == 'daily' and anchor_iso:
        return f'report:daily:{anchor_iso}'
    if kind == 'hourly':
        if anchor_iso:
            return f'report:hourly:{anchor_iso}:{page}'
        return f'report:hourly:{page}'
    if kind == 'range_custom' and range_start_iso and range_end_iso:
        return f'report:range:{range_start_iso}:{range_end_iso}'
    return f'report:{kind}'


def build_report_result_keyboard(
    kind: str,
    *,
    page: int = 0,
    total_pages: int = 1,
    anchor_iso: str | None = None,
    range_start_iso: str | None = None,
    range_end_iso: str | None = None,
) -> Dict[str, Any]:
    """After a report: refresh same + jump to related actions."""
    base_kind = kind.split(':')[0] if ':' in kind else kind
    refresh_data = report_refresh_callback(
        base_kind,
        anchor_iso=anchor_iso,
        page=page,
        range_start_iso=range_start_iso,
        range_end_iso=range_end_iso,
    )
    rows: List[List[Dict[str, str]]] = []

    if base_kind == 'hourly':
        nav: List[Dict[str, str]] = []
        if page > 0:
            nav.append(btn(
                '◀️ قبلی',
                report_refresh_callback('hourly', anchor_iso=anchor_iso, page=page - 1),
            ))
        if page < total_pages - 1:
            nav.append(btn(
                'بعدی ▶️',
                report_refresh_callback('hourly', anchor_iso=anchor_iso, page=page + 1),
            ))
        if nav:
            rows.append(nav)

    rows.append([btn('🔄 به‌روزرسانی', refresh_data)])
    if kind == 'daily':
        rows.append([btn('🧾 سفارش‌های امروز', 'o:queue:today:0')])
        rows.append([btn('⚠️ نیازمند اقدام', 'o:queue:action:0')])
    elif base_kind == 'hourly':
        rows.append([btn('📅 گزارش روز', 'report:daily'), btn('🧾 سفارش‌ها', 'menu:orders')])
    elif kind == 'daily' and anchor_iso:
        rows.append([btn(
            '🕐 گزارش ساعتی همان روز',
            report_refresh_callback('hourly', anchor_iso=anchor_iso, page=0),
        )])
    elif kind == 'range_custom':
        rows.append([btn('📈 هفت روز اخیر', 'report:range7')])
    elif kind == 'sales7':
        rows.append([btn('🚨 استثناها', 'report:exceptions'), btn('🏷 محصولات', 'report:products')])
    elif kind == 'range_today':
        rows.append([btn('🧾 سفارش‌های امروز', 'o:queue:today:0')])
    elif kind == 'range_yesterday':
        rows.append([btn('📈 هفت روز اخیر', 'report:range7')])
    elif kind in ('range7', 'sales7'):
        rows.append([btn('📊 استثناها', 'report:exceptions')])
    elif kind == 'range30':
        rows.append([btn('🏷 محصولات', 'report:products')])
    elif kind == 'exceptions':
        rows.append([btn('🧾 پرداخت ناموفق', 'o:queue:failed:0')])
    elif kind == 'low_stock':
        rows.append([btn('📥 موجودی', 'menu:stock')])
    elif kind in ('stock', 'products'):
        rows.append([btn('📦 محصولات', 'menu:products')])
    rows.append([btn('⬅️ گزارشات', 'menu:reports'), btn('🏠 داشبورد', 'menu:main')])
    return inline_keyboard(rows)


def build_report_ranges_menu() -> Dict[str, Any]:
    return inline_keyboard([
        [btn('امروز', 'report:range_today'), btn('دیروز', 'report:range_yesterday')],
        [btn('۷ روز اخیر', 'report:range7'), btn('۳۰ روز اخیر', 'report:range30')],
        nav_back('menu:reports', '⬅️ گزارشات'),
    ])


# ─── Products ───────────────────────────────────────────────────────────────

def build_products_menu(user: User) -> Dict[str, Any]:
    rows: List[List[Dict[str, str]]] = [
        [btn('📋 لیست محصولات', 'p:list:0'), btn('🔍 جستجو', 'p:search')],
    ]
    manage: List[Dict[str, str]] = []
    if PermissionService.user_has_permission(user, 'add_products'):
        manage.append(btn('➕ افزودن', 'p:add'))
    if manage:
        rows.append(manage)
    rows.append(nav_back('menu:main'))
    return inline_keyboard(rows)


def build_product_list_keyboard(
    products: Sequence[Any],
    page: int,
    has_next: bool,
    user: User,
) -> Dict[str, Any]:
    rows: List[List[Dict[str, str]]] = []
    for p in products:
        stock = fmt_num(p.stock_quantity)
        label = f'#{p.id} {truncate(p.name, 18)} · {stock}'
        rows.append([btn(label, f'p:v:{p.id}')])

    nav: List[Dict[str, str]] = []
    if page > 0:
        nav.append(btn('◀️ قبلی', f'p:list:{page - 1}'))
    if has_next:
        nav.append(btn('بعدی ▶️', f'p:list:{page + 1}'))
    if nav:
        rows.append(nav)

    rows.append([btn('🔍 جستجو', 'p:search')])
    if PermissionService.user_has_permission(user, 'add_products'):
        rows.append([btn('➕ افزودن محصول', 'p:add')])
    rows.append(nav_back('menu:products', '⬅️ محصولات'))
    return inline_keyboard(rows)


def build_product_detail_keyboard(product_id: int, user: User) -> Dict[str, Any]:
    rows: List[List[Dict[str, str]]] = []
    actions: List[Dict[str, str]] = []
    if PermissionService.user_has_permission(user, 'change_products'):
        actions.append(btn('✏️ ویرایش', f'p:e:{product_id}'))
    if PermissionService.user_has_permission(user, 'change_stock'):
        actions.append(btn('📥 موجودی', f's:p:{product_id}:set'))
    if actions:
        rows.append(actions)
    if PermissionService.user_has_permission(user, 'delete_products'):
        rows.append([btn('🗑 حذف', f'p:d:{product_id}')])
    rows.append([btn('📋 لیست', 'p:list:0'), btn('⬅️ محصولات', 'menu:products')])
    return inline_keyboard(rows)


def build_product_edit_fields_keyboard(product_id: int, user: User) -> Dict[str, Any]:
    rows = [
        [btn('نام', f'p:ef:{product_id}:name'), btn('قیمت', f'p:ef:{product_id}:price')],
        [btn('توضیحات', f'p:ef:{product_id}:description'), btn('تصویر', f'p:ef:{product_id}:image')],
    ]
    if PermissionService.user_has_permission(user, 'change_stock'):
        rows.append([btn('موجودی', f'p:ef:{product_id}:stock')])
    rows.append([
        btn('✅ فعال', f'p:ef:{product_id}:on'),
        btn('⛔️ غیرفعال', f'p:ef:{product_id}:off'),
    ])
    rows.append([btn('⬅️ جزئیات', f'p:v:{product_id}')])
    return inline_keyboard(rows)


def build_delete_confirm_keyboard(product_id: int) -> Dict[str, Any]:
    return inline_keyboard([
        [btn('✅ بله، حذف شود', f'p:dc:{product_id}'), btn('❌ انصراف', f'p:v:{product_id}')],
    ])


def build_category_keyboard(categories: Iterable[Any], back: str = 'menu:products') -> Dict[str, Any]:
    rows: List[List[Dict[str, str]]] = []
    row: List[Dict[str, str]] = []
    for c in categories:
        row.append(btn(truncate(c.name, 18), f'cat:{c.id}'))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([btn('❌ انصراف', 'flow:cancel')])
    return inline_keyboard(rows)


def build_skip_image_keyboard() -> Dict[str, Any]:
    return inline_keyboard([
        [btn('⏭ بدون تصویر', 'img:skip'), btn('❌ انصراف', 'flow:cancel')],
    ])


def build_cancel_keyboard(back: str = 'menu:main') -> Dict[str, Any]:
    return inline_keyboard([[btn('❌ انصراف', 'flow:cancel'), btn('🏠 منو', back)]])


# ─── Stock ──────────────────────────────────────────────────────────────────

def build_stock_menu() -> Dict[str, Any]:
    return inline_keyboard([
        [btn('🎯 تنظیم دقیق', 's:mode:set')],
        [btn('➕ افزایش', 's:mode:inc'), btn('➖ کاهش', 's:mode:dec')],
        [btn('📋 انتخاب از لیست', 's:pick:0:set')],
        nav_back('menu:full', '⬅️ منوی کامل'),
    ])


def build_stock_pick_keyboard(products: Sequence[Any], page: int, has_next: bool, mode: str) -> Dict[str, Any]:
    rows: List[List[Dict[str, str]]] = []
    for p in products:
        label = f'#{p.id} {truncate(p.name, 16)} · {fmt_num(p.stock_quantity)}'
        rows.append([btn(label, f's:p:{p.id}:{mode}')])
    nav: List[Dict[str, str]] = []
    if page > 0:
        nav.append(btn('◀️', f's:pick:{page - 1}:{mode}'))
    if has_next:
        nav.append(btn('▶️', f's:pick:{page + 1}:{mode}'))
    if nav:
        rows.append(nav)
    rows.append(nav_back('menu:stock', '⬅️ موجودی'))
    return inline_keyboard(rows)


def build_stock_after_keyboard(product_id: int) -> Dict[str, Any]:
    return inline_keyboard([
        [
            btn('🎯 تنظیم', f's:p:{product_id}:set'),
            btn('➕', f's:p:{product_id}:inc'),
            btn('➖', f's:p:{product_id}:dec'),
        ],
        [btn('📦 جزئیات محصول', f'p:v:{product_id}'), btn('⬅️ موجودی', 'menu:stock')],
    ])


# ─── Orders ─────────────────────────────────────────────────────────────────

def build_orders_menu(user: User) -> Dict[str, Any]:
    rows = [
        [btn('⚠️ نیازمند اقدام', 'o:queue:action:0')],
        [btn('❌ پرداخت ناموفق', 'o:queue:failed:0')],
        [btn('📋 سفارش‌های امروز', 'o:queue:today:0')],
        [btn('🔍 جستجوی سفارش', 'o:search')],
    ]
    if PermissionService.user_has_permission(user, 'change_orders'):
        rows.append([btn('🔄 تغییر وضعیت با لیست', 'o:status')])
    rows.append(nav_back('menu:full', '⬅️ منوی کامل'))
    return inline_keyboard(rows)


def build_order_list_keyboard(
    orders: Sequence[Any],
    page: int,
    has_next: bool,
    user: User,
    scope: str = 'today',
) -> Dict[str, Any]:
    rows: List[List[Dict[str, str]]] = []
    for o in orders:
        payment = '❌' if getattr(o, 'payment_status', '') == 'failed' else '💳'
        label = f'{truncate(o.order_number, 12)} · {order_status_label(o.status)} {payment}'
        rows.append([btn(label, f'o:v:{o.id}')])
    nav: List[Dict[str, str]] = []
    if page > 0:
        nav.append(btn('◀️ قبلی', f'o:queue:{scope}:{page - 1}'))
    if has_next:
        nav.append(btn('بعدی ▶️', f'o:queue:{scope}:{page + 1}'))
    if nav:
        rows.append(nav)
    if scope != 'action':
        rows.append([btn('⚠️ نیازمند اقدام', 'o:queue:action:0')])
    rows.append(nav_back('menu:orders', '⬅️ سفارش‌ها'))
    return inline_keyboard(rows)


def build_order_detail_keyboard(
    order: Any,
    user: User,
    back_callback: str = 'menu:orders',
) -> Dict[str, Any]:
    order_id = order.id
    rows: List[List[Dict[str, str]]] = []
    if PermissionService.user_has_permission(user, 'change_orders'):
        quick: List[Dict[str, str]] = []
        if getattr(order, 'status', '') == 'pending':
            quick.append(btn('➡️ پردازش', f'o:st:{order_id}:processing'))
        if getattr(order, 'payment_status', '') == 'paid' and getattr(order, 'status', '') != 'completed':
            quick.append(btn('✅ تکمیل', f'o:st:{order_id}:completed'))
        if getattr(order, 'payment_status', '') == 'failed':
            quick.append(btn('💳 علامت پرداخت‌شده', f'o:ps:{order_id}:paid'))
        if quick:
            rows.append(quick)
        rows.append([
            btn('🔄 وضعیت سفارش', f'o:es:{order_id}'),
            btn('💳 وضعیت پرداخت', f'o:ep:{order_id}'),
        ])
    rows.append([btn('⚠️ نیازمند اقدام', 'o:queue:action:0'), btn('❌ پرداخت ناموفق', 'o:queue:failed:0')])
    rows.append([btn('📋 سفارش‌های امروز', 'o:queue:today:0'), btn('⬅️ بازگشت', back_callback)])
    return inline_keyboard(rows)


def build_order_status_keyboard(order_id: int) -> Dict[str, Any]:
    rows = [
        [btn('در انتظار', f'o:st:{order_id}:pending'), btn('پردازش', f'o:st:{order_id}:processing')],
        [btn('پرداخت‌شده', f'o:st:{order_id}:paid'), btn('تکمیل', f'o:st:{order_id}:completed')],
        [btn('لغو', f'o:st:{order_id}:cancelled')],
        [btn('⬅️ جزئیات', f'o:v:{order_id}')],
    ]
    return inline_keyboard(rows)


def build_payment_status_keyboard(order_id: int) -> Dict[str, Any]:
    rows = [
        [btn('در انتظار', f'o:ps:{order_id}:pending'), btn('پردازش', f'o:ps:{order_id}:processing')],
        [btn('پرداخت‌شده', f'o:ps:{order_id}:paid'), btn('ناموفق', f'o:ps:{order_id}:failed')],
        [btn('لغو پرداخت', f'o:ps:{order_id}:cancelled')],
        [btn('⬅️ جزئیات', f'o:v:{order_id}')],
    ]
    return inline_keyboard(rows)


def build_order_status_entry_keyboard() -> Dict[str, Any]:
    return inline_keyboard([
        [btn('⚠️ از لیست نیازمند اقدام', 'o:queue:action:0')],
        [btn('❌ از لیست پرداخت ناموفق', 'o:queue:failed:0')],
        [btn('📋 از لیست سفارش‌های امروز', 'o:queue:today:0')],
        [btn('🔍 جستجوی سفارش', 'o:search')],
        [btn('⬅️ سفارش‌ها', 'menu:orders')],
    ])


# ─── Help ───────────────────────────────────────────────────────────────────

def help_text(user: User) -> str:
    lines = [
        '❓ راهنمای سریع',
        '',
        'از دکمه‌های زیر هر پیام استفاده کنید.',
        'در میانهٔ کار با «انصراف» یا دکمه ❌ خارج شوید.',
        '',
        'بخش‌های در دسترس شما:',
    ]
    if PermissionService.user_has_permission(user, 'view_reports'):
        lines.append('• 📊 گزارشات — روز/ساعتی با تاریخ، بازه، استثنا')
    if PermissionService.user_has_permission(user, 'view_products'):
        lines.append('• 📦 محصولات — لیست، جستجو، جزئیات')
    if PermissionService.user_has_permission(user, 'add_products'):
        lines.append('• ➕ افزودن محصول (چندمرحله‌ای + تصویر)')
    if PermissionService.user_has_permission(user, 'change_products'):
        lines.append('• ✏️ ویرایش محصول با دکمه')
    if PermissionService.user_has_permission(user, 'change_stock'):
        lines.append('• 📥 تنظیم / افزایش / کاهش موجودی')
    if PermissionService.user_has_permission(user, 'view_orders'):
        lines.append('• 🧾 سفارش‌های امروز و جزئیات')
    if PermissionService.user_has_permission(user, 'change_orders'):
        lines.append('• 🔄 تغییر وضعیت سفارش با دکمه')
    if not PermissionService.user_has_permission(user, 'delete_products'):
        lines.append('')
        lines.append('حذف محصول برای نقش شما غیرفعال است.')
    lines.extend(['', 'دستور میانبر: /start'])
    return '\n'.join(lines)
