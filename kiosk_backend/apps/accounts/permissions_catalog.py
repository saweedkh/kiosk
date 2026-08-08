"""
Catalog of application permissions shared by admin panel and Bale bot.
"""
from typing import Dict, List, Set, Tuple

# (codename, Persian label)
APP_PERMISSIONS: List[Tuple[str, str]] = [
    ('view_reports', 'مشاهده گزارشات'),
    ('view_products', 'مشاهده محصولات'),
    ('add_products', 'افزودن محصول'),
    ('change_products', 'ویرایش محصول'),
    ('delete_products', 'حذف محصول'),
    ('change_stock', 'تغییر موجودی'),
    ('view_categories', 'مشاهده دسته‌بندی'),
    ('add_categories', 'افزودن دسته‌بندی'),
    ('change_categories', 'ویرایش دسته‌بندی'),
    ('delete_categories', 'حذف دسته‌بندی'),
    ('view_orders', 'مشاهده سفارشات'),
    ('change_orders', 'تغییر وضعیت سفارش'),
    ('change_settings', 'تغییر تنظیمات'),
    ('manage_users', 'مدیریت کاربران و گروه‌ها'),
]

PERMISSION_LABELS: Dict[str, str] = {code: label for code, label in APP_PERMISSIONS}
ALL_PERMISSION_CODES: Set[str] = {code for code, _ in APP_PERMISSIONS}

# Default groups: name -> list of permission codenames
DEFAULT_GROUPS: Dict[str, List[str]] = {
    'مشاهده‌گر': [
        'view_reports',
        'view_products',
        'view_categories',
        'view_orders',
    ],
    'اپراتور': [
        'view_reports',
        'view_products',
        'add_products',
        'change_products',
        'change_stock',
        'view_categories',
        'view_orders',
        'change_orders',
    ],
    'مدیر': [
        'view_reports',
        'view_products',
        'add_products',
        'change_products',
        'delete_products',
        'change_stock',
        'view_categories',
        'add_categories',
        'change_categories',
        'delete_categories',
        'view_orders',
        'change_orders',
        'change_settings',
    ],
}

# Full permission code as stored by Django: accounts.<codename>
CONTENT_TYPE_APP_LABEL = 'accounts'
PERMISSION_MODEL = 'userprofile'


def full_permission_code(codename: str) -> str:
    return f'{CONTENT_TYPE_APP_LABEL}.{codename}'
