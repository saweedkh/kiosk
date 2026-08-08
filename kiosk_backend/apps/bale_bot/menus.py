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

    row1: List[Dict[str, str]] = []
    if PermissionService.user_has_permission(user, 'view_reports'):
        row1.append(btn('📊 گزارشات', 'menu:reports'))
    if PermissionService.user_has_permission(user, 'view_orders'):
        row1.append(btn('🧾 سفارش‌ها', 'menu:orders'))
    if row1:
        rows.append(row1)

    row2: List[Dict[str, str]] = []
    if PermissionService.user_has_permission(user, 'view_products'):
        row2.append(btn('📦 محصولات', 'menu:products'))
    if PermissionService.user_has_permission(user, 'change_stock'):
        row2.append(btn('📥 موجودی', 'menu:stock'))
    if row2:
        rows.append(row2)

    rows.append([btn('❓ راهنما', 'menu:help')])
    return inline_keyboard(rows)


def welcome_text(user: User) -> str:
    name = user.get_full_name() or user.username
    groups = '، '.join(user.groups.values_list('name', flat=True)) or 'بدون گروه'
    lines = [
        f'سلام {name} 👋',
        'به پنل مدیریت کیوسک در بله خوش آمدید.',
        '',
        f'نقش شما: {groups}',
        '',
        'از منوی زیر بخش موردنظر را انتخاب کنید.',
        'همه‌چیز با دکمه انجام می‌شود — لازم نیست دستور حفظ کنید.',
    ]
    return '\n'.join(lines)


def section_title(emoji: str, title: str, subtitle: str = '') -> str:
    lines = [f'{emoji} {title}']
    if subtitle:
        lines.append(subtitle)
    return '\n'.join(lines)


# ─── Reports ────────────────────────────────────────────────────────────────

def build_reports_menu() -> Dict[str, Any]:
    return inline_keyboard([
        [btn('📅 گزارش امروز', 'report:daily')],
        [btn('📈 فروش ۷ روز', 'report:sales7')],
        [btn('🏷 پرفروش محصولات', 'report:products')],
        [btn('📦 ارزش انبار', 'report:stock'), btn('⚠️ موجودی کم', 'report:low_stock')],
        nav_back('menu:main'),
    ])


def build_report_result_keyboard(kind: str) -> Dict[str, Any]:
    """After a report: refresh same + jump to related actions."""
    rows: List[List[Dict[str, str]]] = [
        [btn('🔄 به‌روزرسانی', f'report:{kind}')],
    ]
    if kind == 'daily':
        rows.append([btn('🧾 سفارش‌های امروز', 'o:today:0')])
    elif kind == 'low_stock':
        rows.append([btn('📥 موجودی', 'menu:stock')])
    elif kind in ('stock', 'products'):
        rows.append([btn('📦 محصولات', 'menu:products')])
    rows.append([btn('⬅️ گزارشات', 'menu:reports'), btn('🏠 منو', 'menu:main')])
    return inline_keyboard(rows)


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
        nav_back('menu:main'),
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
    rows = [[btn('📋 سفارش‌های امروز', 'o:today:0')]]
    if PermissionService.user_has_permission(user, 'change_orders'):
        rows.append([btn('🔄 تغییر وضعیت', 'o:status')])
    rows.append(nav_back('menu:main'))
    return inline_keyboard(rows)


def build_order_list_keyboard(
    orders: Sequence[Any],
    page: int,
    has_next: bool,
    user: User,
) -> Dict[str, Any]:
    rows: List[List[Dict[str, str]]] = []
    for o in orders:
        label = f'{truncate(o.order_number, 14)} · {order_status_label(o.status)}'
        rows.append([btn(label, f'o:v:{o.id}')])
    nav: List[Dict[str, str]] = []
    if page > 0:
        nav.append(btn('◀️ قبلی', f'o:today:{page - 1}'))
    if has_next:
        nav.append(btn('بعدی ▶️', f'o:today:{page + 1}'))
    if nav:
        rows.append(nav)
    rows.append(nav_back('menu:orders', '⬅️ سفارش‌ها'))
    return inline_keyboard(rows)


def build_order_detail_keyboard(order_id: int, user: User) -> Dict[str, Any]:
    rows: List[List[Dict[str, str]]] = []
    if PermissionService.user_has_permission(user, 'change_orders'):
        rows.append([btn('🔄 تغییر وضعیت', f'o:es:{order_id}')])
    rows.append([btn('📋 لیست امروز', 'o:today:0'), btn('⬅️ سفارش‌ها', 'menu:orders')])
    return inline_keyboard(rows)


def build_order_status_keyboard(order_id: int) -> Dict[str, Any]:
    rows = [
        [btn('در انتظار', f'o:st:{order_id}:pending'), btn('پردازش', f'o:st:{order_id}:processing')],
        [btn('پرداخت‌شده', f'o:st:{order_id}:paid'), btn('تکمیل', f'o:st:{order_id}:completed')],
        [btn('لغو', f'o:st:{order_id}:cancelled')],
        [btn('⬅️ جزئیات', f'o:v:{order_id}')],
    ]
    return inline_keyboard(rows)


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
        lines.append('• 📊 گزارشات — امروز، ۷روز، پرفروش، انبار')
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
