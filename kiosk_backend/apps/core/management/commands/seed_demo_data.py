"""
Seed a small Persian cafe catalog for local/demo use.

Safe by default: skips when products already exist (use --force to replace).
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any, Dict, List, Tuple

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.services.permission_service import PermissionService
from apps.core.models.settings import SiteSettings
from apps.orders.models import Coupon, Order, OrderItem
from apps.products.models import Category, Product, ProductOption, ProductOptionGroup

User = get_user_model()

DEFAULT_ADMIN_USERNAME = 'admin'
DEFAULT_ADMIN_PASSWORD = 'Admin123!'


CATEGORIES: List[Tuple[str, int]] = [
    ('نوشیدنی گرم', 1),
    ('نوشیدنی سرد', 2),
    ('غذای اصلی', 3),
    ('دسر', 4),
    ('میان‌وعده', 5),
]

# name, category, price (IRR), stock, service_fee_applicable, description
PRODUCTS: List[Tuple[str, str, int, int, bool, str]] = [
    ('اسپرسو', 'نوشیدنی گرم', 950_000, 80, True, 'شات دوبل اسپرسو تازه'),
    ('لاته', 'نوشیدنی گرم', 1_450_000, 70, True, 'اسپرسو با شیر بخار‌داده‌شده'),
    ('کاپوچینو', 'نوشیدنی گرم', 1_350_000, 70, True, 'اسپرسو، شیر و فوم'),
    ('چای سیاه', 'نوشیدنی گرم', 650_000, 100, False, 'چای سیاه ایرانی'),
    ('آیس لاته', 'نوشیدنی سرد', 1_550_000, 60, True, 'لاته سرد با یخ'),
    ('موهیتو', 'نوشیدنی سرد', 1_250_000, 50, False, 'نعناع، لیمو و سودا'),
    ('لیموناد', 'نوشیدنی سرد', 980_000, 55, False, 'لیموناد طبیعی'),
    ('برگر کلاسیک', 'غذای اصلی', 3_850_000, 40, True, 'گوشت، پنیر، کاهو و سس ویژه'),
    ('پاستا آلفردو', 'غذای اصلی', 4_250_000, 35, True, 'پاستا با سس خامه‌ای'),
    ('سالاد سزار', 'غذای اصلی', 2_450_000, 45, True, 'کاهو، مرغ گریل، پارمزان'),
    ('چیزکیک', 'دسر', 1_850_000, 30, False, 'چیزکیک نیویورکی'),
    ('براونی', 'دسر', 1_250_000, 40, False, 'براونی شکلاتی گرم'),
    ('سیب‌زمینی سرخ‌کرده', 'میان‌وعده', 1_150_000, 60, False, 'سیب‌زمینی ترد با سس'),
    ('ناگت مرغ', 'میان‌وعده', 1_650_000, 50, False, '۶ تکه ناگت با سس'),
]


class Command(BaseCommand):
    help = 'Seed demo site settings, admin user, categories, products, options, coupons, and sample orders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Delete existing catalog/coupons/demo orders and re-seed',
        )
        parser.add_argument(
            '--skip-orders',
            action='store_true',
            help='Do not create sample paid orders for the dashboard',
        )
        parser.add_argument(
            '--admin-username',
            default=DEFAULT_ADMIN_USERNAME,
            help=f'Demo admin username (default: {DEFAULT_ADMIN_USERNAME})',
        )
        parser.add_argument(
            '--admin-password',
            default=DEFAULT_ADMIN_PASSWORD,
            help=f'Demo admin password (default: {DEFAULT_ADMIN_PASSWORD})',
        )

    def handle(self, *args, **options):
        force = options['force']
        skip_orders = options['skip_orders']
        admin_username = options['admin_username']
        admin_password = options['admin_password']

        PermissionService.ensure_default_groups()

        if Product.objects.exists() and not force:
            self.stdout.write(self.style.WARNING(
                'Catalog already has products — skipped. Use --force to replace demo data.'
            ))
            self._ensure_admin(admin_username, admin_password)
            return

        with transaction.atomic():
            if force:
                self._wipe_demo_catalog()

            settings = self._seed_settings()
            admin = self._ensure_admin(admin_username, admin_password)
            categories = self._seed_categories()
            products = self._seed_products(categories)
            self._seed_options(products)
            self._seed_coupons()
            if not skip_orders:
                self._seed_sample_orders(products)

            SiteSettings.bump_catalog_revision()

        self.stdout.write(self.style.SUCCESS(
            f'Demo data ready — {Category.objects.count()} categories, '
            f'{Product.objects.count()} products, {Coupon.objects.count()} coupons.'
        ))
        self.stdout.write(
            f'Admin login: {admin.username} / {admin_password}'
        )
        self.stdout.write(f'Site: {settings.site_name}')

    def _wipe_demo_catalog(self) -> None:
        OrderItem.objects.all().delete()
        Order.objects.filter(order_number__startswith='DEMO-').delete()
        Coupon.objects.filter(code__in=('WELCOME10', 'CAFE50', 'FIXED100K')).delete()
        ProductOption.objects.all().delete()
        ProductOptionGroup.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()

    def _seed_settings(self) -> SiteSettings:
        settings = SiteSettings.get_settings()
        settings.site_name = 'کافه نمونه'
        settings.copyright_text = '© کافه نمونه — تمامی حقوق محفوظ است'
        settings.description = 'منوی نمونه برای تست کیوسک و پنل مدیریت'
        settings.contact_phone = '021-91000000'
        settings.contact_email = 'hello@cafe-demo.local'
        settings.contact_address = 'تهران، خیابان نمونه'
        settings.landing_theme = SiteSettings.LANDING_THEME_FRESH
        settings.landing_cta_text = 'برای سفارش، صفحه را لمس کنید'
        settings.landing_accent_color = '#E17100'
        settings.landing_bg_color = '#FFF3E8'
        settings.landing_text_color = '#111111'
        settings.landing_muted_color = '#5C5046'
        settings.receipt_header = 'کافه نمونه'
        settings.receipt_footer = 'نوش جان — دوباره ببینمتون'
        settings.service_enabled = True
        settings.service_fee = 150_000
        settings.service_fee_dine_in = True
        settings.service_fee_takeaway = False
        settings.coupons_enabled = True
        settings.cart_layout = SiteSettings.CART_LAYOUT_SIDE
        settings.save()
        return settings

    def _ensure_admin(self, username: str, password: str):
        user = User.objects.filter(username=username).first()
        created = False
        if user is None:
            user = User.objects.create_superuser(
                username=username,
                email='admin@cafe-demo.local',
                password=password,
            )
            created = True
        else:
            # Keep existing password unless this is a brand-new empty auth DB
            if not user.is_superuser:
                user.is_superuser = True
                user.is_staff = True
                user.save(update_fields=['is_superuser', 'is_staff'])

        manager = Group.objects.filter(name='مدیر').first()
        if manager:
            user.groups.add(manager)

        if created:
            self.stdout.write(self.style.SUCCESS(f'Created admin user «{username}»'))
        else:
            self.stdout.write(f'Admin user «{username}» already exists')
        return user

    def _seed_categories(self) -> Dict[str, Category]:
        by_name: Dict[str, Category] = {}
        for name, order in CATEGORIES:
            cat, _ = Category.objects.get_or_create(
                name=name,
                defaults={'display_order': order, 'is_active': True},
            )
            if cat.display_order != order or not cat.is_active:
                cat.display_order = order
                cat.is_active = True
                cat.save(update_fields=['display_order', 'is_active', 'updated_at'])
            by_name[name] = cat
        return by_name

    def _seed_products(self, categories: Dict[str, Category]) -> Dict[str, Product]:
        by_name: Dict[str, Product] = {}
        for name, cat_name, price, stock, service_fee, description in PRODUCTS:
            product, created = Product.objects.get_or_create(
                name=name,
                defaults={
                    'category': categories[cat_name],
                    'price': price,
                    'stock_quantity': stock,
                    'is_active': True,
                    'service_fee_applicable': service_fee,
                    'description': description,
                },
            )
            if not created:
                product.category = categories[cat_name]
                product.price = price
                product.stock_quantity = stock
                product.is_active = True
                product.service_fee_applicable = service_fee
                product.description = description
                product.save()
            by_name[name] = product
        return by_name

    def _seed_options(self, products: Dict[str, Product]) -> None:
        latte = products.get('لاته')
        if latte:
            size, _ = ProductOptionGroup.objects.get_or_create(
                product=latte,
                name='اندازه',
                defaults={
                    'min_select': 1,
                    'max_select': 1,
                    'is_required': True,
                    'display_order': 1,
                    'is_active': True,
                },
            )
            for idx, (opt_name, delta) in enumerate(
                [('معمولی', 0), ('بزرگ', 250_000), ('خیلی بزرگ', 450_000)],
                start=1,
            ):
                ProductOption.objects.get_or_create(
                    group=size,
                    name=opt_name,
                    defaults={
                        'price_delta': delta,
                        'display_order': idx,
                        'is_active': True,
                    },
                )

            extras, _ = ProductOptionGroup.objects.get_or_create(
                product=latte,
                name='افزودنی',
                defaults={
                    'min_select': 0,
                    'max_select': 3,
                    'is_required': False,
                    'display_order': 2,
                    'is_active': True,
                },
            )
            for idx, (opt_name, delta) in enumerate(
                [('شات اضافه', 300_000), ('شیر بادام', 200_000), ('سیروپ وانیل', 150_000)],
                start=1,
            ):
                ProductOption.objects.get_or_create(
                    group=extras,
                    name=opt_name,
                    defaults={
                        'price_delta': delta,
                        'display_order': idx,
                        'is_active': True,
                    },
                )

        burger = products.get('برگر کلاسیک')
        if burger:
            cook, _ = ProductOptionGroup.objects.get_or_create(
                product=burger,
                name='درجه پخت',
                defaults={
                    'min_select': 1,
                    'max_select': 1,
                    'is_required': True,
                    'display_order': 1,
                    'is_active': True,
                },
            )
            for idx, opt_name in enumerate(['متوسط', 'کاملاً پخته'], start=1):
                ProductOption.objects.get_or_create(
                    group=cook,
                    name=opt_name,
                    defaults={'price_delta': 0, 'display_order': idx, 'is_active': True},
                )

    def _seed_coupons(self) -> None:
        Coupon.objects.update_or_create(
            code='WELCOME10',
            defaults={
                'discount_type': Coupon.TYPE_PERCENT,
                'value': 10,
                'min_order_amount': 1_000_000,
                'max_discount_amount': 500_000,
                'max_uses': None,
                'is_active': True,
            },
        )
        Coupon.objects.update_or_create(
            code='CAFE50',
            defaults={
                'discount_type': Coupon.TYPE_PERCENT,
                'value': 15,
                'min_order_amount': 2_000_000,
                'max_discount_amount': 800_000,
                'max_uses': 50,
                'is_active': True,
            },
        )
        Coupon.objects.update_or_create(
            code='FIXED100K',
            defaults={
                'discount_type': Coupon.TYPE_FIXED,
                'value': 100_000,
                'min_order_amount': 500_000,
                'max_discount_amount': None,
                'max_uses': None,
                'is_active': True,
            },
        )

    def _seed_sample_orders(self, products: Dict[str, Product]) -> None:
        now = timezone.now()
        specs: List[Dict[str, Any]] = [
            {
                'suffix': '001',
                'when': now - timedelta(hours=5),
                'fulfillment': Order.FULFILLMENT_DINE_IN,
                'theme': 'fresh',
                'items': [('لاته', 2), ('براونی', 1)],
                'service_fee': 150_000,
            },
            {
                'suffix': '002',
                'when': now - timedelta(hours=2),
                'fulfillment': Order.FULFILLMENT_TAKEAWAY,
                'theme': 'cinema',
                'items': [('برگر کلاسیک', 1), ('سیب‌زمینی سرخ‌کرده', 1), ('لیموناد', 1)],
                'service_fee': 0,
            },
            {
                'suffix': '003',
                'when': now - timedelta(days=1, hours=3),
                'fulfillment': Order.FULFILLMENT_DINE_IN,
                'theme': 'neon',
                'items': [('اسپرسو', 1), ('چیزکیک', 1)],
                'service_fee': 150_000,
            },
            {
                'suffix': '004',
                'when': now - timedelta(days=1, hours=7),
                'fulfillment': Order.FULFILLMENT_TAKEAWAY,
                'theme': 'fresh',
                'items': [('پاستا آلفردو', 1), ('موهیتو', 2)],
                'service_fee': 0,
            },
        ]

        for spec in specs:
            order_number = f"DEMO-{spec['suffix']}"
            if Order.objects.filter(order_number=order_number).exists():
                continue

            line_total = 0
            built_items = []
            for product_name, qty in spec['items']:
                product = products[product_name]
                unit = product.price
                line_total += unit * qty
                built_items.append((product, qty, unit))

            total = line_total + int(spec['service_fee'])
            order = Order.objects.create(
                order_number=order_number,
                session_key=f'demo-session-{spec["suffix"]}',
                status='completed',
                total_amount=total,
                service_fee=spec['service_fee'],
                payment_status='paid',
                transaction_id=f'DEMO-TXN-{spec["suffix"]}',
                receipt_number=int(spec['suffix']),
                fulfillment_type=spec['fulfillment'],
                payment_method='card',
                gateway_name='demo',
                landing_theme=spec['theme'],
            )
            for product, qty, unit in built_items:
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    quantity=qty,
                    unit_price=unit,
                    selected_options=[],
                )
            Order.objects.filter(pk=order.pk).update(
                created_at=spec['when'],
                updated_at=spec['when'],
            )
            OrderItem.objects.filter(order=order).update(
                created_at=spec['when'],
                updated_at=spec['when'],
            )
