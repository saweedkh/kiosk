from __future__ import annotations

import logging
import uuid
from datetime import timedelta
from typing import Any, Dict, Optional

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.utils import timezone

from apps.accounts.services.permission_service import PermissionService
from apps.accounts.services.user_service import UserService
from apps.bale_bot.client import BaleClient
from apps.bale_bot.menus import (
    build_main_menu,
    build_orders_menu,
    build_products_menu,
    build_reports_menu,
    build_stock_menu,
    welcome_text,
)
from apps.bale_bot.models import BotConversation
from apps.admin_panel.services.report_service import ReportService
from apps.products.models import Category, Product
from apps.products.services.product_service import ProductService
from apps.products.services.stock_service import StockService
from apps.orders.models import Order

User = get_user_model()
logger = logging.getLogger(__name__)

SKIP_IMAGE_WORDS = {'رد', 'بدون تصویر', 'بدون', 'skip', '/skip', 'نه'}


def _fmt_num(value) -> str:
    try:
        return f'{int(value):,}'.replace(',', '٬')
    except (TypeError, ValueError):
        return str(value)


def _fmt_money(value) -> str:
    return f'{_fmt_num(value)} ریال'


class UpdateHandler:
    def __init__(self, client: Optional[BaleClient] = None):
        self.client = client or BaleClient()

    def handle(self, update: Dict[str, Any]) -> None:
        try:
            if 'callback_query' in update:
                self._handle_callback(update['callback_query'])
            elif 'message' in update:
                self._handle_message(update['message'])
        except Exception:
            logger.exception('Failed to handle Bale update: %s', update.get('update_id'))

    def _get_user(self, chat_id) -> Optional[User]:
        return UserService.get_user_by_bale_chat_id(str(chat_id))

    def _conversation(self, chat_id) -> BotConversation:
        conv, _ = BotConversation.objects.get_or_create(chat_id=str(chat_id))
        return conv

    def _send(self, chat_id, text: str, reply_markup=None):
        self.client.send_message(chat_id, text, reply_markup=reply_markup)

    def _deny(self, chat_id):
        self._send(
            chat_id,
            'شما به ربات دسترسی ندارید.\n'
            f'شناسه چت شما: `{chat_id}`\n'
            'این مقدار را به سوپریوزر بدهید تا در پنل مدیریت (تب کاربران) ثبت کند.',
        )

    def _require(self, user: User, chat_id, codename: str) -> bool:
        if PermissionService.user_has_permission(user, codename):
            return True
        self._send(chat_id, 'دسترسی لازم برای این عملیات را ندارید.')
        return False

    def _extract_image_file_id(self, message: Dict[str, Any]) -> Optional[str]:
        photos = message.get('photo') or []
        if photos:
            return photos[-1].get('file_id')
        document = message.get('document') or {}
        mime = (document.get('mime_type') or '').lower()
        if document.get('file_id') and mime.startswith('image/'):
            return document.get('file_id')
        return None

    def _attach_image_to_product(self, product: Product, file_id: str) -> Product:
        content, filename = self.client.download_file(file_id)
        if not content:
            raise RuntimeError('محتوای تصویر خالی است')
        if len(content) > 15 * 1024 * 1024:
            raise RuntimeError('حجم تصویر بیش از ۱۵ مگابایت است')

        ext = 'jpg'
        lower = (filename or '').lower()
        for candidate in ('png', 'webp', 'jpeg', 'jpg', 'gif'):
            if lower.endswith(f'.{candidate}'):
                ext = 'jpg' if candidate == 'jpeg' else candidate
                break
        safe_name = f'bale_{product.id}_{uuid.uuid4().hex[:10]}.{ext}'
        product.image.save(safe_name, ContentFile(content), save=True)
        return product

    def _handle_message(self, message: Dict[str, Any]) -> None:
        chat = message.get('chat') or {}
        chat_id = chat.get('id')
        if chat_id is None:
            return
        text = (message.get('text') or '').strip()
        user = self._get_user(chat_id)
        if not user:
            self._deny(chat_id)
            return

        conv = self._conversation(chat_id)
        if text in ('/start', 'شروع', 'منو'):
            conv.clear()
            self._send(chat_id, welcome_text(user), build_main_menu(user))
            return

        if text in ('/help', 'راهنما'):
            self._send_help(chat_id, user)
            return

        if conv.state:
            self._handle_conversation_input(user, chat_id, conv, text, message=message)
            return

        if text.startswith('/'):
            self._handle_command(user, chat_id, text)
            return

        if self._extract_image_file_id(message):
            menu = (
                build_products_menu(user)
                if PermissionService.user_has_permission(user, 'view_products')
                else build_main_menu(user)
            )
            self._send(
                chat_id,
                'برای تنظیم تصویر محصول، از منو «افزودن محصول» یا ویرایش → تصویر استفاده کنید.',
                menu,
            )
            return

        self._send(chat_id, 'دستور شناخته نشد. از منو استفاده کنید:', build_main_menu(user))

    def _handle_callback(self, callback: Dict[str, Any]) -> None:
        data = callback.get('data') or ''
        cq_id = callback.get('id')
        message = callback.get('message') or {}
        chat = message.get('chat') or {}
        chat_id = chat.get('id')
        if cq_id:
            try:
                self.client.answer_callback_query(cq_id)
            except Exception:
                logger.exception('answerCallbackQuery failed')

        if chat_id is None:
            return
        user = self._get_user(chat_id)
        if not user:
            self._deny(chat_id)
            return

        conv = self._conversation(chat_id)

        if data == 'menu:main':
            conv.clear()
            self._send(chat_id, welcome_text(user), build_main_menu(user))
        elif data == 'menu:reports':
            if self._require(user, chat_id, 'view_reports'):
                self._send(chat_id, 'نوع گزارش را انتخاب کنید:', build_reports_menu())
        elif data == 'menu:products':
            if self._require(user, chat_id, 'view_products'):
                self._send(chat_id, 'مدیریت محصولات:', build_products_menu(user))
        elif data == 'menu:stock':
            if self._require(user, chat_id, 'change_stock'):
                self._send(chat_id, 'عملیات موجودی:', build_stock_menu())
        elif data == 'menu:orders':
            if self._require(user, chat_id, 'view_orders'):
                self._send(chat_id, 'سفارش‌ها:', build_orders_menu(user))
        elif data == 'menu:help':
            self._send_help(chat_id, user)
        elif data.startswith('report:'):
            self._handle_report(user, chat_id, data.split(':', 1)[1])
        elif data.startswith('product:'):
            self._handle_product_action(user, chat_id, conv, data.split(':', 1)[1])
        elif data.startswith('stock:'):
            self._handle_stock_action(user, chat_id, conv, data.split(':', 1)[1])
        elif data.startswith('order:'):
            self._handle_order_action(user, chat_id, conv, data.split(':', 1)[1])
        else:
            self._send(chat_id, 'گزینه نامعتبر است.', build_main_menu(user))

    def _send_help(self, chat_id, user: User):
        lines = [
            'راهنمای ربات کیوسک',
            '',
            '/start — منوی اصلی',
            '/help — همین راهنما',
        ]
        if PermissionService.user_has_permission(user, 'view_reports'):
            lines.append('/گزارش — گزارش امروز')
        if PermissionService.user_has_permission(user, 'change_stock'):
            lines.append('/موجودی <شناسه> <عدد> — تنظیم موجودی')
        if PermissionService.user_has_permission(user, 'view_products'):
            lines.append('/محصول <شناسه> — جزئیات محصول')
            lines.append('ارسال عکس در افزودن/ویرایش محصول → ذخیره تصویر در پنل')
        if not PermissionService.user_has_permission(user, 'delete_products'):
            lines.append('')
            lines.append('حذف محصول برای نقش شما غیرفعال است.')
        self._send(chat_id, '\n'.join(lines), build_main_menu(user))

    def _handle_command(self, user: User, chat_id, text: str):
        parts = text.split()
        cmd = parts[0]
        if cmd in ('/گزارش', '/report'):
            self._handle_report(user, chat_id, 'daily')
        elif cmd in ('/موجودی', '/stock') and len(parts) >= 3:
            if not self._require(user, chat_id, 'change_stock'):
                return
            try:
                product_id = int(parts[1])
                qty = int(parts[2])
                product = StockService.update_stock(
                    product_id, qty, change_type='manual', admin_user=user, notes='via bale bot'
                )
                self._send(
                    chat_id,
                    f'موجودی «{product.name}» به {_fmt_num(product.stock_quantity)} عدد تنظیم شد.',
                    build_main_menu(user),
                )
            except Exception as exc:
                self._send(chat_id, f'خطا: {exc}')
        elif cmd in ('/محصول', '/product') and len(parts) >= 2:
            if not self._require(user, chat_id, 'view_products'):
                return
            try:
                product = Product.objects.select_related('category').get(pk=int(parts[1]))
                self._send(chat_id, self._product_text(product), build_products_menu(user))
            except Product.DoesNotExist:
                self._send(chat_id, 'محصول یافت نشد.')
        else:
            self._send(chat_id, 'دستور نامعتبر است.', build_main_menu(user))

    def _handle_report(self, user: User, chat_id, kind: str):
        if not self._require(user, chat_id, 'view_reports'):
            return
        try:
            if kind == 'daily':
                report = ReportService.get_daily_report(date=timezone.localdate(), user=user)
                total_orders = report.get('total_orders', 0) or 0
                total_sales = report.get('total_sales', 0) or 0
                avg = (total_sales / total_orders) if total_orders else 0
                text = (
                    f'📅 گزارش امروز ({timezone.localdate()})\n'
                    f'سفارش‌ها: {_fmt_num(total_orders)}\n'
                    f'فروش: {_fmt_money(total_sales)}\n'
                    f'میانگین سبد: {_fmt_money(avg)}'
                )
            elif kind == 'sales7':
                end = timezone.now()
                start = end - timedelta(days=7)
                report = ReportService.get_sales_report(start_date=start, end_date=end, user=user)
                text = (
                    '📈 فروش ۷ روز اخیر\n'
                    f'سفارش‌ها: {_fmt_num(report.get("total_orders", 0))}\n'
                    f'فروش: {_fmt_money(report.get("total_sales", 0))}\n'
                    f'تراکنش موفق: {_fmt_num(report.get("successful_transactions", 0))}'
                )
            elif kind == 'stock':
                report = ReportService.get_stock_report(user=user)
                text = (
                    '📦 موجودی انبار\n'
                    f'اقلام: {_fmt_num(report.get("total_items", 0))}\n'
                    f'ارزش موجودی: {_fmt_money(report.get("total_stock_value", 0))}'
                )
            elif kind == 'low_stock':
                products = Product.objects.filter(stock_quantity__lte=5).order_by('stock_quantity')[:20]
                if not products:
                    text = 'محصولی با موجودی کم یافت نشد.'
                else:
                    lines = ['⚠️ موجودی کم / ناموجود:']
                    for p in products:
                        lines.append(f'#{p.id} {p.name}: {_fmt_num(p.stock_quantity)}')
                    text = '\n'.join(lines)
            else:
                text = 'نوع گزارش نامعتبر است.'
            self._send(chat_id, text, build_reports_menu())
        except Exception as exc:
            logger.exception('report failed')
            self._send(chat_id, f'خطا در تهیه گزارش: {exc}')

    def _product_text(self, product: Product) -> str:
        has_image = bool(product.image)
        return (
            f'#{product.id} — {product.name}\n'
            f'قیمت: {_fmt_money(product.price)}\n'
            f'موجودی: {_fmt_num(product.stock_quantity)}\n'
            f'دسته: {product.category.name if product.category_id else "-"}\n'
            f'تصویر: {"دارد" if has_image else "ندارد"}\n'
            f'وضعیت: {"فعال" if product.is_active else "غیرفعال"}'
        )

    def _handle_product_action(self, user: User, chat_id, conv: BotConversation, action: str):
        if action == 'list':
            if not self._require(user, chat_id, 'view_products'):
                return
            products = Product.objects.select_related('category').order_by('-id')[:15]
            if not products:
                self._send(chat_id, 'محصولی ثبت نشده است.', build_products_menu(user))
                return
            lines = ['آخرین محصولات:']
            for p in products:
                lines.append(
                    f'#{p.id} {p.name} | {_fmt_money(p.price)} | موجودی {_fmt_num(p.stock_quantity)}'
                )
            self._send(chat_id, '\n'.join(lines), build_products_menu(user))
        elif action == 'search':
            if not self._require(user, chat_id, 'view_products'):
                return
            conv.set_state('product_search')
            self._send(chat_id, 'نام محصول را برای جستجو بفرستید:')
        elif action == 'add':
            if not self._require(user, chat_id, 'add_products'):
                return
            conv.set_state('product_add_name', draft={})
            self._send(chat_id, 'نام محصول جدید را بفرستید:\n(برای انصراف: انصراف)')
        elif action == 'edit':
            if not self._require(user, chat_id, 'change_products'):
                return
            conv.set_state('product_edit_id')
            self._send(chat_id, 'شناسه محصول برای ویرایش را بفرستید:')
        elif action == 'delete':
            if not self._require(user, chat_id, 'delete_products'):
                return
            conv.set_state('product_delete_id')
            self._send(chat_id, 'شناسه محصول برای حذف را بفرستید:\n(این عمل برگشت‌ناپذیر است)')
        else:
            self._send(chat_id, 'عملیات نامعتبر.', build_products_menu(user))

    def _handle_stock_action(self, user: User, chat_id, conv: BotConversation, action: str):
        if not self._require(user, chat_id, 'change_stock'):
            return
        if action == 'set':
            conv.set_state('stock_set_id', mode='set')
            self._send(chat_id, 'شناسه محصول را بفرستید:')
        elif action == 'inc':
            conv.set_state('stock_set_id', mode='inc')
            self._send(chat_id, 'شناسه محصول را بفرستید:')
        elif action == 'dec':
            conv.set_state('stock_set_id', mode='dec')
            self._send(chat_id, 'شناسه محصول را بفرستید:')
        else:
            self._send(chat_id, 'عملیات نامعتبر.', build_stock_menu())

    def _handle_order_action(self, user: User, chat_id, conv: BotConversation, action: str):
        if action == 'today':
            if not self._require(user, chat_id, 'view_orders'):
                return
            start = timezone.localdate()
            orders = Order.objects.filter(created_at__date=start).order_by('-id')[:15]
            if not orders:
                self._send(chat_id, 'سفارشی برای امروز نیست.', build_orders_menu(user))
                return
            lines = ['سفارش‌های امروز:']
            for o in orders:
                lines.append(
                    f'{o.order_number} | {_fmt_money(o.total_amount)} | {o.status}'
                )
            self._send(chat_id, '\n'.join(lines), build_orders_menu(user))
        elif action == 'status':
            if not self._require(user, chat_id, 'change_orders'):
                return
            conv.set_state('order_status_number')
            self._send(chat_id, 'شماره سفارش را بفرستید:')
        else:
            self._send(chat_id, 'عملیات نامعتبر.', build_orders_menu(user))

    def _handle_conversation_input(
        self,
        user: User,
        chat_id,
        conv: BotConversation,
        text: str,
        message: Optional[Dict[str, Any]] = None,
    ):
        message = message or {}
        if text in ('انصراف', '/cancel', 'cancel'):
            conv.clear()
            self._send(chat_id, 'عملیات لغو شد.', build_main_menu(user))
            return

        state = conv.state
        data = dict(conv.data or {})

        # Image steps first (photo may have empty text)
        if state in ('product_add_image', 'product_edit_image'):
            file_id = self._extract_image_file_id(message)
            if file_id:
                try:
                    if state == 'product_add_image':
                        product = Product.objects.get(pk=data.get('product_id'))
                        self._attach_image_to_product(product, file_id)
                        product.refresh_from_db()
                        conv.clear()
                        self._send(
                            chat_id,
                            f'تصویر ذخیره شد و در پنل نمایش داده می‌شود.\n{self._product_text(product)}',
                            build_products_menu(user),
                        )
                        return
                    product = Product.objects.get(pk=data.get('product_id'))
                    self._attach_image_to_product(product, file_id)
                    product.refresh_from_db()
                    conv.clear()
                    self._send(
                        chat_id,
                        f'تصویر محصول به‌روز شد.\n{self._product_text(product)}',
                        build_products_menu(user),
                    )
                    return
                except Exception as exc:
                    logger.exception('image attach failed')
                    self._send(chat_id, f'خطا در ذخیره تصویر: {exc}\nدوباره عکس بفرستید یا «رد» بزنید.')
                    return

            if text.strip().lower() in SKIP_IMAGE_WORDS or text.strip() in SKIP_IMAGE_WORDS:
                if state == 'product_add_image':
                    try:
                        product = Product.objects.get(pk=data.get('product_id'))
                    except Product.DoesNotExist:
                        conv.clear()
                        self._send(chat_id, 'محصول یافت نشد.', build_products_menu(user))
                        return
                    conv.clear()
                    self._send(
                        chat_id,
                        f'محصول بدون تصویر ذخیره شد.\n{self._product_text(product)}',
                        build_products_menu(user),
                    )
                    return
                conv.clear()
                self._send(chat_id, 'تغییر تصویر لغو شد.', build_products_menu(user))
                return

            self._send(chat_id, 'لطفاً یک تصویر بفرستید، یا برای رد کردن بنویسید: رد')
            return

        if state == 'product_search':
            products = Product.objects.filter(name__icontains=text).order_by('name')[:10]
            conv.clear()
            if not products:
                self._send(chat_id, 'نتیجه‌ای یافت نشد.', build_products_menu(user))
                return
            lines = [f'نتایج جستجو برای «{text}»:']
            for p in products:
                lines.append(f'#{p.id} {p.name} | {_fmt_money(p.price)}')
            self._send(chat_id, '\n'.join(lines), build_products_menu(user))
            return

        if state == 'product_add_name':
            draft = data.get('draft') or {}
            draft['name'] = text
            conv.set_state('product_add_price', draft=draft)
            self._send(chat_id, 'قیمت محصول (ریال، فقط عدد) را بفرستید:')
            return

        if state == 'product_add_price':
            try:
                price = int(text.replace(',', '').replace('٬', '').strip())
                if price <= 0:
                    raise ValueError
            except ValueError:
                self._send(chat_id, 'قیمت نامعتبر است. فقط عدد مثبت بفرستید:')
                return
            draft = data.get('draft') or {}
            draft['price'] = price
            conv.set_state('product_add_stock', draft=draft)
            self._send(chat_id, 'موجودی اولیه را بفرستید:')
            return

        if state == 'product_add_stock':
            try:
                stock = int(text.strip())
                if stock < 0:
                    raise ValueError
            except ValueError:
                self._send(chat_id, 'موجودی نامعتبر است. عدد صحیح ≥ ۰ بفرستید:')
                return
            draft = data.get('draft') or {}
            draft['stock_quantity'] = stock
            cats = list(Category.objects.filter(is_active=True).order_by('display_order', 'name')[:20])
            if not cats:
                conv.clear()
                self._send(chat_id, 'هیچ دسته‌بندی فعالی نیست. اول از پنل دسته بسازید.')
                return
            lines = ['شناسه دسته‌بندی را بفرستید:']
            for c in cats:
                lines.append(f'#{c.id} {c.name}')
            conv.set_state('product_add_category', draft=draft)
            self._send(chat_id, '\n'.join(lines))
            return

        if state == 'product_add_category':
            try:
                category = Category.objects.get(pk=int(text.strip()), is_active=True)
            except (ValueError, Category.DoesNotExist):
                self._send(chat_id, 'دسته‌بندی نامعتبر است. شناسه معتبر بفرستید:')
                return
            draft = data.get('draft') or {}
            try:
                product = ProductService.create_product({
                    'name': draft['name'],
                    'price': draft['price'],
                    'stock_quantity': draft.get('stock_quantity', 0),
                    'category': category,
                    'description': '',
                    'is_active': True,
                })
            except Exception as exc:
                conv.clear()
                self._send(chat_id, f'خطا در ایجاد محصول: {exc}')
                return
            conv.set_state('product_add_image', product_id=product.id)
            self._send(
                chat_id,
                f'محصول ایجاد شد (#{product.id}).\n'
                'حالا تصویر محصول را بفرستید.\n'
                'اگر تصویر ندارید بنویسید: رد',
            )
            return

        if state == 'product_edit_id':
            try:
                product = Product.objects.get(pk=int(text.strip()))
            except (ValueError, Product.DoesNotExist):
                self._send(chat_id, 'محصول یافت نشد. شناسه معتبر بفرستید:')
                return
            conv.set_state('product_edit_field', product_id=product.id)
            self._send(
                chat_id,
                f'{self._product_text(product)}\n\n'
                'فیلد را بفرستید: نام | قیمت | موجودی | توضیحات | تصویر | فعال | غیرفعال',
            )
            return

        if state == 'product_edit_field':
            field_map = {
                'نام': 'name',
                'قیمت': 'price',
                'موجودی': 'stock_quantity',
                'توضیحات': 'description',
                'تصویر': 'image',
                'فعال': 'activate',
                'غیرفعال': 'deactivate',
            }
            key = field_map.get(text.strip())
            if not key:
                self._send(chat_id, 'فیلد نامعتبر. یکی از: نام | قیمت | موجودی | توضیحات | تصویر | فعال | غیرفعال')
                return
            product_id = data.get('product_id')
            if key == 'activate':
                product = ProductService.update_product(Product.objects.get(pk=product_id), {'is_active': True})
                conv.clear()
                self._send(chat_id, f'محصول فعال شد.\n{self._product_text(product)}', build_products_menu(user))
                return
            if key == 'deactivate':
                product = ProductService.update_product(Product.objects.get(pk=product_id), {'is_active': False})
                conv.clear()
                self._send(chat_id, f'محصول غیرفعال شد.\n{self._product_text(product)}', build_products_menu(user))
                return
            if key == 'image':
                conv.set_state('product_edit_image', product_id=product_id)
                self._send(chat_id, 'تصویر جدید محصول را بفرستید (یا برای انصراف: رد)')
                return
            conv.set_state('product_edit_value', product_id=product_id, field=key)
            self._send(chat_id, 'مقدار جدید را بفرستید:')
            return

        if state == 'product_edit_value':
            product_id = data.get('product_id')
            field = data.get('field')
            try:
                product = Product.objects.get(pk=product_id)
                value: Any = text
                if field == 'price':
                    value = int(text.replace(',', '').replace('٬', '').strip())
                elif field == 'stock_quantity':
                    value = int(text.strip())
                    if not PermissionService.user_has_permission(user, 'change_stock') and value != product.stock_quantity:
                        # allow if they have change_products - stock via edit is ok if change_stock OR change_products
                        if not PermissionService.user_has_permission(user, 'change_products'):
                            raise PermissionError('no stock permission')
                ProductService.update_product(product, {field: value})
                product.refresh_from_db()
                conv.clear()
                self._send(chat_id, f'به‌روزرسانی شد.\n{self._product_text(product)}', build_products_menu(user))
            except Exception as exc:
                self._send(chat_id, f'خطا: {exc}')
            return

        if state == 'product_delete_id':
            if not self._require(user, chat_id, 'delete_products'):
                conv.clear()
                return
            try:
                product = Product.objects.get(pk=int(text.strip()))
            except (ValueError, Product.DoesNotExist):
                self._send(chat_id, 'محصول یافت نشد.')
                return
            name = product.name
            product.delete()
            conv.clear()
            self._send(chat_id, f'محصول «{name}» حذف شد.', build_products_menu(user))
            return

        if state == 'stock_set_id':
            try:
                product = Product.objects.get(pk=int(text.strip()))
            except (ValueError, Product.DoesNotExist):
                self._send(chat_id, 'محصول یافت نشد. شناسه معتبر بفرستید:')
                return
            mode = data.get('mode', 'set')
            conv.set_state('stock_set_qty', product_id=product.id, mode=mode)
            prompt = {
                'set': f'موجودی جدید برای «{product.name}» (فعلی {_fmt_num(product.stock_quantity)}):',
                'inc': f'مقدار افزایش برای «{product.name}»:',
                'dec': f'مقدار کاهش برای «{product.name}»:',
            }.get(mode, 'مقدار را بفرستید:')
            self._send(chat_id, prompt)
            return

        if state == 'stock_set_qty':
            try:
                qty = int(text.strip())
                if qty < 0:
                    raise ValueError
                product = Product.objects.get(pk=data.get('product_id'))
                mode = data.get('mode', 'set')
                if mode == 'set':
                    new_qty = qty
                elif mode == 'inc':
                    new_qty = product.stock_quantity + qty
                else:
                    new_qty = max(0, product.stock_quantity - qty)
                product = StockService.update_stock(
                    product.id, new_qty, change_type='manual', admin_user=user, notes='via bale bot'
                )
                conv.clear()
                self._send(
                    chat_id,
                    f'موجودی «{product.name}» اکنون {_fmt_num(product.stock_quantity)} عدد است.',
                    build_stock_menu(),
                )
            except Exception as exc:
                self._send(chat_id, f'خطا: {exc}')
            return

        if state == 'order_status_number':
            try:
                order = Order.objects.get(order_number=text.strip())
            except Order.DoesNotExist:
                self._send(chat_id, 'سفارش یافت نشد. شماره معتبر بفرستید:')
                return
            conv.set_state('order_status_value', order_id=order.id)
            self._send(
                chat_id,
                f'سفارش {order.order_number} — وضعیت فعلی: {order.status}\n'
                'وضعیت جدید را بفرستید: pending | processing | paid | completed | cancelled',
            )
            return

        if state == 'order_status_value':
            if not self._require(user, chat_id, 'change_orders'):
                conv.clear()
                return
            status_value = text.strip().lower()
            allowed = {'pending', 'processing', 'paid', 'completed', 'cancelled'}
            if status_value not in allowed:
                self._send(chat_id, 'وضعیت نامعتبر است.')
                return
            try:
                order = Order.objects.get(pk=data.get('order_id'))
                order.status = status_value
                order.save(update_fields=['status', 'updated_at'] if hasattr(order, 'updated_at') else ['status'])
                conv.clear()
                self._send(
                    chat_id,
                    f'وضعیت سفارش {order.order_number} به {status_value} تغییر کرد.',
                    build_orders_menu(user),
                )
            except Exception as exc:
                self._send(chat_id, f'خطا: {exc}')
            return

        conv.clear()
        self._send(chat_id, 'گفتگو نامعتبر بود. از منو دوباره شروع کنید.', build_main_menu(user))
