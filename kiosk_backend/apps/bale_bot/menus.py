from typing import Any, Dict, List

from django.contrib.auth import get_user_model

from apps.accounts.services.permission_service import PermissionService

User = get_user_model()


def inline_keyboard(rows: List[List[Dict[str, str]]]) -> Dict[str, Any]:
    return {'inline_keyboard': rows}


def btn(text: str, data: str) -> Dict[str, str]:
    return {'text': text, 'callback_data': data}


def build_main_menu(user: User) -> Dict[str, Any]:
    rows: List[List[Dict[str, str]]] = []

    if PermissionService.user_has_permission(user, 'view_reports'):
        rows.append([btn('📊 گزارشات', 'menu:reports')])

    product_row = []
    if PermissionService.user_has_permission(user, 'view_products'):
        product_row.append(btn('📦 محصولات', 'menu:products'))
    if PermissionService.user_has_permission(user, 'change_stock'):
        product_row.append(btn('📥 موجودی', 'menu:stock'))
    if product_row:
        rows.append(product_row)

    if PermissionService.user_has_any(user, ['add_products', 'change_products']):
        manage_row = []
        if PermissionService.user_has_permission(user, 'add_products'):
            manage_row.append(btn('➕ افزودن محصول', 'product:add'))
        if PermissionService.user_has_permission(user, 'change_products'):
            manage_row.append(btn('✏️ ویرایش محصول', 'product:edit'))
        if manage_row:
            rows.append(manage_row)

    if PermissionService.user_has_permission(user, 'view_orders'):
        rows.append([btn('🧾 سفارش‌ها', 'menu:orders')])

    rows.append([btn('❓ راهنما', 'menu:help')])
    return inline_keyboard(rows)


def build_reports_menu() -> Dict[str, Any]:
    return inline_keyboard([
        [btn('گزارش امروز', 'report:daily')],
        [btn('فروش ۷ روز', 'report:sales7'), btn('موجودی انبار', 'report:stock')],
        [btn('موجودی کم/ناموجود', 'report:low_stock')],
        [btn('⬅️ بازگشت', 'menu:main')],
    ])


def build_products_menu(user: User) -> Dict[str, Any]:
    rows: List[List[Dict[str, str]]] = [
        [btn('لیست محصولات', 'product:list')],
        [btn('جستجوی محصول', 'product:search')],
    ]
    if PermissionService.user_has_permission(user, 'add_products'):
        rows.append([btn('افزودن محصول', 'product:add')])
    if PermissionService.user_has_permission(user, 'change_products'):
        rows.append([btn('ویرایش محصول', 'product:edit')])
    if PermissionService.user_has_permission(user, 'delete_products'):
        rows.append([btn('حذف محصول', 'product:delete')])
    rows.append([btn('⬅️ بازگشت', 'menu:main')])
    return inline_keyboard(rows)


def build_stock_menu() -> Dict[str, Any]:
    return inline_keyboard([
        [btn('تنظیم موجودی', 'stock:set')],
        [btn('افزایش موجودی', 'stock:inc'), btn('کاهش موجودی', 'stock:dec')],
        [btn('⬅️ بازگشت', 'menu:main')],
    ])


def build_orders_menu(user: User) -> Dict[str, Any]:
    rows = [[btn('سفارش‌های امروز', 'order:today')]]
    if PermissionService.user_has_permission(user, 'change_orders'):
        rows.append([btn('تغییر وضعیت سفارش', 'order:status')])
    rows.append([btn('⬅️ بازگشت', 'menu:main')])
    return inline_keyboard(rows)


def welcome_text(user: User) -> str:
    name = user.get_full_name() or user.username
    perms = PermissionService.get_user_permission_codes(user)
    groups = ', '.join(user.groups.values_list('name', flat=True)) or 'بدون گروه'
    return (
        f'سلام {name} 👋\n'
        f'به ربات مدیریت کیوسک خوش آمدید.\n'
        f'گروه: {groups}\n'
        f'تعداد دسترسی‌ها: {len(perms)}\n\n'
        f'از منوی زیر استفاده کنید:'
    )
