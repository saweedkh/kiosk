"""
هندلر ربات بله — UX دکمه‌محور، انتخاب از لیست، تایید، و پیشرفت مراحل.
"""
from __future__ import annotations

import logging
import uuid
from datetime import date, timedelta
from typing import Any, Dict, Optional

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.db.models import Q
from django.utils import timezone

from apps.accounts.services.permission_service import PermissionService
from apps.accounts.services.user_service import UserService
from apps.bale_bot.client import BaleClient
from apps.bale_bot.menus import (
    PAGE_SIZE,
    build_cancel_keyboard,
    build_category_keyboard,
    build_delete_confirm_keyboard,
    build_full_menu,
    build_main_menu,
    build_order_detail_keyboard,
    build_order_status_entry_keyboard,
    build_order_list_keyboard,
    build_order_status_keyboard,
    build_payment_status_keyboard,
    build_orders_menu,
    build_product_detail_keyboard,
    build_product_edit_fields_keyboard,
    build_product_list_keyboard,
    build_products_menu,
    build_quick_settings_menu,
    build_report_ranges_menu,
    build_report_result_keyboard,
    build_reports_menu,
    build_skip_image_keyboard,
    build_stock_after_keyboard,
    build_stock_menu,
    build_stock_pick_keyboard,
    cancel_hint,
    fmt_money,
    fmt_num,
    fulfillment_label,
    help_text,
    inline_keyboard,
    order_status_label,
    payment_status_label,
    progress_bar,
    section_title,
    welcome_text,
)
from apps.bale_bot.models import BotConversation
from apps.bale_bot.reports import (
    build_custom_range_report_text,
    build_exception_report_text,
    build_daily_report_text,
    build_home_dashboard_text,
    build_hourly_report_text,
    build_low_stock_report_header,
    build_products_report_text,
    build_range_report_text,
    build_sales7_report_text,
    build_stock_report_text,
    date_input_hint,
    get_business_day_bounds,
    get_low_stock_products,
    hourly_report_total_pages,
    parse_date_input,
    split_report_text,
)
from apps.orders.models import Order
from apps.orders.services.order_service import OrderService
from apps.products.models import Category, Product
from apps.products.services.product_service import ProductService
from apps.products.services.stock_service import StockService
from apps.core.models.settings import SiteSettings

User = get_user_model()
logger = logging.getLogger(__name__)

SKIP_IMAGE_WORDS = {'رد', 'بدون تصویر', 'بدون', 'skip', '/skip', 'نه'}
ADD_STEPS = 5
ALLOWED_PAYMENT_STATUSES = {'pending', 'processing', 'paid', 'failed', 'cancelled'}


class UpdateHandler:
    def __init__(self, client: Optional[BaleClient] = None):
        self.client = client or BaleClient()

    # ── entry ────────────────────────────────────────────────────────────

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

    def _reply(
        self,
        chat_id,
        text: str,
        reply_markup=None,
        *,
        message_id: Optional[int] = None,
        prefer_edit: bool = False,
    ):
        if prefer_edit and message_id:
            try:
                self.client.edit_message_text(chat_id, message_id, text, reply_markup=reply_markup)
                return
            except Exception:
                logger.debug('editMessageText failed; falling back to send', exc_info=True)
        self._send(chat_id, text, reply_markup)

    def _deny(self, chat_id):
        self._send(
            chat_id,
            'شما به ربات دسترسی ندارید.\n\n'
            f'شناسه چت شما:\n`{chat_id}`\n\n'
            'این عدد را به سوپریوزر بدهید تا در پنل (تب کاربران) ثبت کند.',
        )

    def _require(self, user: User, chat_id, codename: str) -> bool:
        if PermissionService.user_has_permission(user, codename):
            return True
        self._send(chat_id, '⛔️ دسترسی لازم برای این عملیات را ندارید.', build_main_menu(user))
        return False

    # ── media helpers ────────────────────────────────────────────────────

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

    def _product_card(self, product: Product) -> str:
        status = '✅ فعال' if product.is_active else '⛔️ غیرفعال'
        image = '🖼 دارد' if product.image else 'بدون تصویر'
        stock = fmt_num(product.stock_quantity)
        if product.stock_quantity <= 0:
            stock_line = f'موجودی: {stock}  (ناموجود)'
        elif product.stock_quantity <= 5:
            stock_line = f'موجودی: {stock}  ⚠️ کم'
        else:
            stock_line = f'موجودی: {stock}'
        return (
            f'📦 {product.name}\n'
            f'شناسه: #{product.id}\n'
            f'قیمت: {fmt_money(product.price)}\n'
            f'{stock_line}\n'
            f'دسته: {product.category.name if product.category_id else "—"}\n'
            f'تصویر: {image}\n'
            f'وضعیت: {status}'
        )

    def _order_card(self, order: Order) -> str:
        created = timezone.localtime(order.created_at).strftime('%H:%M') if order.created_at else '—'
        fee = int(getattr(order, 'service_fee', 0) or 0)
        packaging = int(getattr(order, 'packaging_fee', 0) or 0)
        lines = [
            f'🧾 سفارش {order.order_number}',
            f'ساعت: {created}',
            f'مبلغ: {fmt_money(order.total_amount)}',
        ]
        fulfillment = getattr(order, 'fulfillment_type', '') or 'dine_in'
        site_settings = SiteSettings.get_settings()
        if fee > 0:
            title = site_settings.get_service_title(fulfillment)
            lines.append(f'{title}: {fmt_money(fee)}')
        if packaging > 0:
            title = site_settings.get_packaging_title(fulfillment)
            lines.append(f'{title}: {fmt_money(packaging)}')
        lines.extend([
            f'وضعیت: {order_status_label(order.status)}',
            f'پرداخت: {payment_status_label(order.payment_status)}',
            f'نوع: {fulfillment_label(getattr(order, "fulfillment_type", "") or "dine_in")}',
        ])
        if getattr(order, 'error_message', ''):
            lines.append(f'خطا: {str(order.error_message)[:120]}')
        return '\n'.join(lines)

    def _dashboard_text(self, user: User) -> str:
        return f'{welcome_text(user)}\n\n{build_home_dashboard_text(user=user)}'

    def _order_scope_queryset(self, scope: str):
        _, start, end = get_business_day_bounds()
        qs = Order.objects.filter(created_at__gte=start, created_at__lt=end).order_by('-id')
        if scope == 'failed':
            return qs.filter(payment_status='failed')
        if scope == 'action':
            return qs.filter(
                Q(payment_status='failed') | ~Q(status__in=['completed', 'cancelled'])
            ).distinct()
        return qs

    def _deliver_report(
        self,
        chat_id,
        text: str,
        keyboard,
        ctx: dict,
        *,
        prefer_edit: bool = True,
    ) -> None:
        chunks = split_report_text(text)
        if len(chunks) == 1:
            self._reply(
                chat_id,
                chunks[0],
                keyboard,
                message_id=ctx.get('message_id'),
                prefer_edit=prefer_edit,
            )
            return

        total = len(chunks)
        first = f'{chunks[0]}\n\n📄 بخش ۱ از {total}'
        self._reply(
            chat_id,
            first,
            None,
            message_id=ctx.get('message_id'),
            prefer_edit=prefer_edit,
        )
        for index, chunk in enumerate(chunks[1:], start=2):
            suffix = f'📄 بخش {index} از {total}'
            is_last = index == total
            self._send(chat_id, f'{suffix}\n\n{chunk}', keyboard if is_last else None)

    def _parse_report_callback(self, data: str):
        parts = data.split(':')
        kind = parts[1] if len(parts) > 1 else ''
        anchor: Optional[date] = None
        page = 0
        range_start: Optional[date] = None
        range_end: Optional[date] = None

        if kind == 'daily' and len(parts) > 2:
            anchor = date.fromisoformat(parts[2])
        elif kind == 'hourly' and len(parts) > 2:
            if '-' in parts[2]:
                anchor = date.fromisoformat(parts[2])
                page = int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else 0
            elif parts[2].isdigit():
                page = int(parts[2])
        elif kind == 'range' and len(parts) >= 4:
            range_start = date.fromisoformat(parts[2])
            range_end = date.fromisoformat(parts[3])
            kind = 'range_custom'

        return kind, anchor, page, range_start, range_end

    def _start_report_date_prompt(self, user, chat_id, conv, state: str, title: str):
        if not self._require(user, chat_id, 'view_reports'):
            return
        conv.set_state(state)
        self._send(
            chat_id,
            f'{date_input_hint(title)}\n{cancel_hint()}',
            build_cancel_keyboard('menu:reports'),
        )

    # ── messages ─────────────────────────────────────────────────────────

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
        if text in ('/start', 'شروع', 'منو', '🏠'):
            conv.clear()
            self._send(chat_id, self._dashboard_text(user), build_main_menu(user))
            return

        if text in ('/help', 'راهنما'):
            self._send(chat_id, help_text(user), build_main_menu(user))
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
                '🖼 برای ذخیره تصویر، از «افزودن محصول» یا جزئیات محصول → ویرایش → تصویر استفاده کنید.',
                menu,
            )
            return

        self._send(
            chat_id,
            'از منوی زیر استفاده کنید — نیازی به تایپ دستور نیست.',
            build_main_menu(user),
        )

    # ── callbacks ────────────────────────────────────────────────────────

    def _handle_callback(self, callback: Dict[str, Any]) -> None:
        data = callback.get('data') or ''
        cq_id = callback.get('id')
        message = callback.get('message') or {}
        chat = message.get('chat') or {}
        chat_id = chat.get('id')
        message_id = message.get('message_id')

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
        ctx = {'message_id': message_id}

        if data == 'flow:cancel':
            conv.clear()
            self._reply(
                chat_id,
                'عملیات لغو شد.',
                build_main_menu(user),
                message_id=message_id,
                prefer_edit=True,
            )
            return

        if data == 'menu:main':
            conv.clear()
            self._reply(chat_id, self._dashboard_text(user), build_main_menu(user), message_id=message_id, prefer_edit=True)
            return
        if data == 'menu:full':
            self._reply(
                chat_id,
                section_title('📚', 'منوی کامل', 'بخش عملیاتی موردنظر را انتخاب کنید:'),
                build_full_menu(user),
                message_id=message_id,
                prefer_edit=True,
            )
            return
        if data == 'menu:quick':
            self._reply(
                chat_id,
                section_title('⚙️', 'تنظیمات سریع', 'میانبرهای کوتاه برای عملیات پرتکرار'),
                build_quick_settings_menu(user),
                message_id=message_id,
                prefer_edit=True,
            )
            return
        if data == 'menu:report_ranges':
            self._reply(
                chat_id,
                section_title('🗓', 'بازه‌های آماده', 'بازه موردنظر را انتخاب کنید:'),
                build_report_ranges_menu(),
                message_id=message_id,
                prefer_edit=True,
            )
            return
        if data == 'menu:reports':
            if self._require(user, chat_id, 'view_reports'):
                self._reply(
                    chat_id,
                    section_title('📊', 'گزارشات', 'نوع گزارش را انتخاب کنید:'),
                    build_reports_menu(),
                    message_id=message_id,
                    prefer_edit=True,
                )
            return
        if data == 'menu:products':
            if self._require(user, chat_id, 'view_products'):
                self._reply(
                    chat_id,
                    section_title('📦', 'محصولات', 'لیست را باز کنید یا محصول جدید بسازید.'),
                    build_products_menu(user),
                    message_id=message_id,
                    prefer_edit=True,
                )
            return
        if data == 'menu:stock':
            if self._require(user, chat_id, 'change_stock'):
                self._reply(
                    chat_id,
                    section_title('📥', 'موجودی', 'نوع تغییر را انتخاب کنید، بعد محصول را از لیست بزنید.'),
                    build_stock_menu(),
                    message_id=message_id,
                    prefer_edit=True,
                )
            return
        if data == 'menu:orders':
            if self._require(user, chat_id, 'view_orders'):
                self._reply(
                    chat_id,
                    section_title('🧾', 'سفارش‌ها', 'اول موارد نیازمند اقدام را ببینید، بعد سراغ جستجو یا لیست روز بروید.'),
                    build_orders_menu(user),
                    message_id=message_id,
                    prefer_edit=True,
                )
            return
        if data == 'menu:help':
            self._reply(chat_id, help_text(user), build_main_menu(user), message_id=message_id, prefer_edit=True)
            return

        if data == 'report:pick_daily':
            self._start_report_date_prompt(user, chat_id, conv, 'report_daily_date', 'تاریخ گزارش روزانه')
            return
        if data == 'report:pick_hourly':
            self._start_report_date_prompt(user, chat_id, conv, 'report_hourly_date', 'تاریخ گزارش ساعتی')
            return
        if data == 'report:pick_range':
            self._start_report_date_prompt(user, chat_id, conv, 'report_range_start', 'تاریخ شروع بازه')
            return

        if data.startswith('report:'):
            kind, anchor, page, range_start, range_end = self._parse_report_callback(data)
            self._handle_report(
                user,
                chat_id,
                kind,
                ctx,
                page=page,
                anchor=anchor,
                range_start=range_start,
                range_end=range_end,
            )
            return

        # Products
        if data.startswith('p:list:'):
            page = int(data.split(':')[2])
            self._show_product_list(user, chat_id, page, ctx)
            return
        if data == 'p:search':
            if not self._require(user, chat_id, 'view_products'):
                return
            conv.set_state('product_search')
            self._send(
                chat_id,
                f'🔍 نام محصول را بنویسید:\n{cancel_hint()}',
                build_cancel_keyboard('menu:products'),
            )
            return
        if data == 'p:add':
            self._start_product_add(user, chat_id, conv)
            return
        if data.startswith('p:v:'):
            self._show_product(user, chat_id, int(data.split(':')[2]), ctx)
            return
        if data.startswith('p:e:'):
            self._show_product_edit_menu(user, chat_id, int(data.split(':')[2]), ctx)
            return
        if data.startswith('p:ef:'):
            # p:ef:{id}:{field}
            parts = data.split(':')
            self._start_product_edit_field(user, chat_id, conv, int(parts[2]), parts[3], ctx)
            return
        if data.startswith('p:d:'):
            self._ask_delete(user, chat_id, int(data.split(':')[2]), ctx)
            return
        if data.startswith('p:dc:'):
            self._confirm_delete(user, chat_id, int(data.split(':')[2]), ctx)
            return

        if data.startswith('cat:'):
            self._finish_product_category(user, chat_id, conv, int(data.split(':')[1]))
            return

        if data == 'img:skip':
            self._skip_image(user, chat_id, conv)
            return

        # Stock
        if data.startswith('s:mode:'):
            mode = data.split(':')[2]
            if not self._require(user, chat_id, 'change_stock'):
                return
            self._show_stock_pick(user, chat_id, 0, mode, ctx)
            return
        if data.startswith('s:pick:'):
            parts = data.split(':')
            page = int(parts[2])
            mode = parts[3] if len(parts) > 3 else 'set'
            if not self._require(user, chat_id, 'change_stock'):
                return
            self._show_stock_pick(user, chat_id, page, mode, ctx)
            return
        if data.startswith('s:p:'):
            # s:p:{id}:{mode}
            parts = data.split(':')
            self._start_stock_qty(user, chat_id, conv, int(parts[2]), parts[3])
            return

        # Orders
        if data.startswith('o:queue:'):
            parts = data.split(':')
            scope = parts[2] if len(parts) > 2 else 'today'
            page = int(parts[3]) if len(parts) > 3 else 0
            self._show_orders_queue(user, chat_id, scope, page, ctx)
            return
        if data == 'o:search':
            if not self._require(user, chat_id, 'view_orders'):
                return
            conv.set_state('order_search')
            self._send(
                chat_id,
                f'شماره سفارش یا بخشی از آن را بنویسید:\n{cancel_hint()}',
                build_cancel_keyboard('menu:orders'),
            )
            return
        if data == 'o:status':
            if not self._require(user, chat_id, 'change_orders'):
                return
            self._reply(
                chat_id,
                section_title('🔄', 'تغییر وضعیت سفارش', 'از یکی از لیست‌های زیر سفارش را انتخاب کنید:'),
                build_order_status_entry_keyboard(),
                message_id=message_id,
                prefer_edit=True,
            )
            return
        if data.startswith('o:v:'):
            self._show_order(user, chat_id, int(data.split(':')[2]), ctx)
            return
        if data.startswith('o:es:'):
            oid = int(data.split(':')[2])
            if not self._require(user, chat_id, 'change_orders'):
                return
            self._reply(
                chat_id,
                'وضعیت سفارش را انتخاب کنید:',
                build_order_status_keyboard(oid),
                message_id=message_id,
                prefer_edit=True,
            )
            return
        if data.startswith('o:ep:'):
            oid = int(data.split(':')[2])
            if not self._require(user, chat_id, 'change_orders'):
                return
            self._reply(
                chat_id,
                'وضعیت پرداخت را انتخاب کنید:',
                build_payment_status_keyboard(oid),
                message_id=message_id,
                prefer_edit=True,
            )
            return
        if data.startswith('o:st:'):
            # o:st:{id}:{status}
            parts = data.split(':')
            self._set_order_status(user, chat_id, int(parts[2]), parts[3], ctx)
            return
        if data.startswith('o:cf:'):
            parts = data.split(':')
            self._confirm_order_status(user, chat_id, int(parts[2]), parts[3], ctx)
            return
        if data.startswith('o:ps:'):
            parts = data.split(':')
            self._set_payment_status(user, chat_id, int(parts[2]), parts[3], ctx)
            return
        if data.startswith('o:pc:'):
            parts = data.split(':')
            self._confirm_payment_status(user, chat_id, int(parts[2]), parts[3], ctx)
            return
        self._reply(chat_id, 'گزینه نامعتبر است.', build_main_menu(user), message_id=message_id, prefer_edit=True)

    # ── product flows ────────────────────────────────────────────────────

    def _show_product_list(self, user, chat_id, page: int, ctx: dict):
        if not self._require(user, chat_id, 'view_products'):
            return
        page = max(0, page)
        qs = Product.objects.select_related('category').order_by('-id')
        start = page * PAGE_SIZE
        chunk = list(qs[start : start + PAGE_SIZE + 1])
        has_next = len(chunk) > PAGE_SIZE
        products = chunk[:PAGE_SIZE]
        if not products and page == 0:
            self._reply(
                chat_id,
                'هنوز محصولی ثبت نشده.\nبا دکمه افزودن شروع کنید.',
                build_products_menu(user),
                message_id=ctx.get('message_id'),
                prefer_edit=True,
            )
            return
        if not products:
            page = max(0, page - 1)
            return self._show_product_list(user, chat_id, page, ctx)
        text = section_title('📋', f'لیست محصولات (صفحه {page + 1})', 'برای جزئیات روی محصول بزنید:')
        self._reply(
            chat_id,
            text,
            build_product_list_keyboard(products, page, has_next, user),
            message_id=ctx.get('message_id'),
            prefer_edit=True,
        )

    def _show_product(self, user, chat_id, product_id: int, ctx: dict):
        if not self._require(user, chat_id, 'view_products'):
            return
        try:
            product = Product.objects.select_related('category').get(pk=product_id)
        except Product.DoesNotExist:
            self._send(chat_id, 'محصول یافت نشد.', build_products_menu(user))
            return
        self._reply(
            chat_id,
            self._product_card(product),
            build_product_detail_keyboard(product.id, user),
            message_id=ctx.get('message_id'),
            prefer_edit=True,
        )

    def _show_product_edit_menu(self, user, chat_id, product_id: int, ctx: dict):
        if not self._require(user, chat_id, 'change_products'):
            return
        try:
            product = Product.objects.select_related('category').get(pk=product_id)
        except Product.DoesNotExist:
            self._send(chat_id, 'محصول یافت نشد.', build_products_menu(user))
            return
        self._reply(
            chat_id,
            f'{self._product_card(product)}\n\nکدام مورد را ویرایش کنیم؟',
            build_product_edit_fields_keyboard(product.id, user),
            message_id=ctx.get('message_id'),
            prefer_edit=True,
        )

    def _start_product_edit_field(self, user, chat_id, conv, product_id: int, field: str, ctx: dict):
        if not self._require(user, chat_id, 'change_products'):
            return
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            self._send(chat_id, 'محصول یافت نشد.', build_products_menu(user))
            return

        if field == 'on':
            product = ProductService.update_product(product, {'is_active': True})
            self._reply(
                chat_id,
                f'✅ محصول فعال شد.\n\n{self._product_card(product)}',
                build_product_detail_keyboard(product.id, user),
                message_id=ctx.get('message_id'),
                prefer_edit=True,
            )
            return
        if field == 'off':
            product = ProductService.update_product(product, {'is_active': False})
            self._reply(
                chat_id,
                f'⛔️ محصول غیرفعال شد.\n\n{self._product_card(product)}',
                build_product_detail_keyboard(product.id, user),
                message_id=ctx.get('message_id'),
                prefer_edit=True,
            )
            return
        if field == 'image':
            conv.set_state('product_edit_image', product_id=product_id)
            self._send(
                chat_id,
                f'🖼 تصویر جدید «{product.name}» را بفرستید.\n{cancel_hint()}',
                build_skip_image_keyboard(),
            )
            return
        if field == 'stock':
            if not PermissionService.user_has_permission(user, 'change_stock'):
                self._send(chat_id, 'دسترسی تغییر موجودی ندارید.')
                return
            conv.set_state('stock_set_qty', product_id=product_id, mode='set')
            self._send(
                chat_id,
                f'📥 موجودی جدید برای «{product.name}» (فعلی {fmt_num(product.stock_quantity)}):\n{cancel_hint()}',
                build_cancel_keyboard(f'p:v:{product_id}'),
            )
            return

        field_map = {'name': 'name', 'price': 'price', 'description': 'description', 'stock': 'stock_quantity'}
        key = field_map.get(field)
        if not key:
            self._send(chat_id, 'فیلد نامعتبر.')
            return
        prompts = {
            'name': 'نام جدید را بنویسید:',
            'price': 'قیمت جدید (ریال، فقط عدد) را بنویسید:',
            'description': 'توضیحات جدید را بنویسید:',
        }
        conv.set_state('product_edit_value', product_id=product_id, field=key)
        self._send(chat_id, f'{prompts[key]}\n{cancel_hint()}', build_cancel_keyboard(f'p:e:{product_id}'))

    def _ask_delete(self, user, chat_id, product_id: int, ctx: dict):
        if not self._require(user, chat_id, 'delete_products'):
            return
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            self._send(chat_id, 'محصول یافت نشد.', build_products_menu(user))
            return
        self._reply(
            chat_id,
            f'⚠️ حذف «{product.name}» برگشت‌ناپذیر است.\nمطمئن هستید؟',
            build_delete_confirm_keyboard(product_id),
            message_id=ctx.get('message_id'),
            prefer_edit=True,
        )

    def _confirm_delete(self, user, chat_id, product_id: int, ctx: dict):
        if not self._require(user, chat_id, 'delete_products'):
            return
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            self._send(chat_id, 'محصول یافت نشد.', build_products_menu(user))
            return
        name = product.name
        product.delete()
        self._reply(
            chat_id,
            f'🗑 محصول «{name}» حذف شد.',
            build_products_menu(user),
            message_id=ctx.get('message_id'),
            prefer_edit=True,
        )

    def _start_product_add(self, user, chat_id, conv):
        if not self._require(user, chat_id, 'add_products'):
            return
        conv.set_state('product_add_name', draft={})
        self._send(
            chat_id,
            f'➕ افزودن محصول\n{progress_bar(1, ADD_STEPS)}\n\nنام محصول را بنویسید:\n{cancel_hint()}',
            build_cancel_keyboard('menu:products'),
        )

    def _finish_product_category(self, user, chat_id, conv, category_id: int):
        if conv.state != 'product_add_category':
            self._send(chat_id, 'این مرحله منقضی شده. از منو دوباره شروع کنید.', build_products_menu(user))
            return
        data = dict(conv.data or {})
        draft = data.get('draft') or {}
        try:
            category = Category.objects.get(pk=category_id, is_active=True)
        except Category.DoesNotExist:
            self._send(chat_id, 'دسته‌بندی نامعتبر است.')
            return
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
            self._send(chat_id, f'خطا در ایجاد محصول: {exc}', build_products_menu(user))
            return
        conv.set_state('product_add_image', product_id=product.id)
        self._send(
            chat_id,
            f'✅ محصول ساخته شد (#{product.id})\n{progress_bar(5, ADD_STEPS)}\n\n'
            f'🖼 تصویر را بفرستید یا «بدون تصویر» را بزنید.',
            build_skip_image_keyboard(),
        )

    def _skip_image(self, user, chat_id, conv):
        state = conv.state
        data = dict(conv.data or {})
        if state == 'product_add_image':
            try:
                product = Product.objects.select_related('category').get(pk=data.get('product_id'))
            except Product.DoesNotExist:
                conv.clear()
                self._send(chat_id, 'محصول یافت نشد.', build_products_menu(user))
                return
            conv.clear()
            self._send(
                chat_id,
                f'محصول بدون تصویر ذخیره شد.\n\n{self._product_card(product)}',
                build_product_detail_keyboard(product.id, user),
            )
            return
        if state == 'product_edit_image':
            conv.clear()
            pid = data.get('product_id')
            self._send(chat_id, 'تغییر تصویر لغو شد.', build_product_detail_keyboard(pid, user) if pid else build_products_menu(user))
            return
        self._send(chat_id, 'مرحله‌ای برای رد کردن نیست.', build_main_menu(user))

    # ── stock ────────────────────────────────────────────────────────────

    def _show_stock_pick(self, user, chat_id, page: int, mode: str, ctx: dict):
        page = max(0, page)
        mode = mode if mode in ('set', 'inc', 'dec') else 'set'
        qs = Product.objects.order_by('stock_quantity', 'name')
        start = page * PAGE_SIZE
        chunk = list(qs[start : start + PAGE_SIZE + 1])
        has_next = len(chunk) > PAGE_SIZE
        products = chunk[:PAGE_SIZE]
        mode_title = {'set': 'تنظیم دقیق', 'inc': 'افزایش', 'dec': 'کاهش'}[mode]
        if not products:
            self._reply(chat_id, 'محصولی نیست.', build_stock_menu(), message_id=ctx.get('message_id'), prefer_edit=True)
            return
        self._reply(
            chat_id,
            section_title('📥', f'انتخاب محصول — {mode_title}', 'روی محصول بزنید:'),
            build_stock_pick_keyboard(products, page, has_next, mode),
            message_id=ctx.get('message_id'),
            prefer_edit=True,
        )

    def _start_stock_qty(self, user, chat_id, conv, product_id: int, mode: str):
        if not self._require(user, chat_id, 'change_stock'):
            return
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            self._send(chat_id, 'محصول یافت نشد.', build_stock_menu())
            return
        mode = mode if mode in ('set', 'inc', 'dec') else 'set'
        conv.set_state('stock_set_qty', product_id=product.id, mode=mode)
        prompts = {
            'set': f'🎯 موجودی جدید «{product.name}» (فعلی {fmt_num(product.stock_quantity)}):',
            'inc': f'➕ چقدر به «{product.name}» اضافه شود؟ (فعلی {fmt_num(product.stock_quantity)})',
            'dec': f'➖ چقدر از «{product.name}» کم شود؟ (فعلی {fmt_num(product.stock_quantity)})',
        }
        self._send(chat_id, f'{prompts[mode]}\n{cancel_hint()}', build_cancel_keyboard('menu:stock'))

    # ── orders ───────────────────────────────────────────────────────────

    def _show_orders_queue(self, user, chat_id, scope: str, page: int, ctx: dict):
        if not self._require(user, chat_id, 'view_orders'):
            return
        page = max(0, page)
        scope = scope if scope in {'today', 'failed', 'action'} else 'today'
        qs = self._order_scope_queryset(scope)
        start = page * PAGE_SIZE
        chunk = list(qs[start : start + PAGE_SIZE + 1])
        has_next = len(chunk) > PAGE_SIZE
        orders = chunk[:PAGE_SIZE]
        if not orders and page == 0:
            empty_text = {
                'today': 'امروز هنوز سفارشی ثبت نشده.',
                'failed': 'امروز پرداخت ناموفقی دیده نشد.',
                'action': 'فعلاً مورد نیازمند اقدامی دیده نمی‌شود.',
            }[scope]
            self._reply(
                chat_id,
                empty_text,
                build_orders_menu(user),
                message_id=ctx.get('message_id'),
                prefer_edit=True,
            )
            return
        if not orders:
            return self._show_orders_queue(user, chat_id, scope, max(0, page - 1), ctx)
        titles = {
            'today': 'سفارش‌های امروز',
            'failed': 'پرداخت‌های ناموفق امروز',
            'action': 'سفارش‌های نیازمند اقدام',
        }
        self._reply(
            chat_id,
            section_title('🧾', f'{titles[scope]} (صفحه {page + 1})', 'برای جزئیات روی سفارش بزنید:'),
            build_order_list_keyboard(orders, page, has_next, user, scope=scope),
            message_id=ctx.get('message_id'),
            prefer_edit=True,
        )

    def _show_order(self, user, chat_id, order_id: int, ctx: dict):
        if not self._require(user, chat_id, 'view_orders'):
            return
        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            self._send(chat_id, 'سفارش یافت نشد.', build_orders_menu(user))
            return
        self._reply(
            chat_id,
            self._order_card(order),
            build_order_detail_keyboard(order, user),
            message_id=ctx.get('message_id'),
            prefer_edit=True,
        )

    def _set_order_status(self, user, chat_id, order_id: int, status_value: str, ctx: dict):
        if not self._require(user, chat_id, 'change_orders'):
            return
        allowed = {c[0] for c in Order.STATUS_CHOICES}
        if status_value not in allowed:
            self._send(chat_id, 'وضعیت نامعتبر است.')
            return
        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            self._send(chat_id, 'سفارش یافت نشد.', build_orders_menu(user))
            return
        if status_value in {'completed', 'cancelled'}:
            self._reply(
                chat_id,
                f'برای تغییر وضعیت سفارش {order.order_number} به «{order_status_label(status_value)}» تایید می‌کنید؟',
                inline_keyboard([
                    [
                        {'text': '✅ تایید', 'callback_data': f'o:cf:{order.id}:{status_value}'[:64]},
                        {'text': '⬅️ بازگشت', 'callback_data': f'o:v:{order.id}'[:64]},
                    ]
                ]),
                message_id=ctx.get('message_id'),
                prefer_edit=True,
            )
            return
        self._apply_order_status(user, chat_id, order, status_value, ctx)

    def _confirm_order_status(self, user, chat_id, order_id: int, status_value: str, ctx: dict):
        if not self._require(user, chat_id, 'change_orders'):
            return
        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            self._send(chat_id, 'سفارش یافت نشد.', build_orders_menu(user))
            return
        self._apply_order_status(user, chat_id, order, status_value, ctx)

    def _apply_order_status(self, user, chat_id, order: Order, status_value: str, ctx: dict):
        try:
            order = OrderService.update_order_status(order.id, status_value)
        except Exception as exc:
            self._send(chat_id, f'خطا در تغییر وضعیت: {exc}', build_orders_menu(user))
            return
        self._reply(
            chat_id,
            f'✅ وضعیت سفارش به «{order_status_label(status_value)}» تغییر کرد.\n\n{self._order_card(order)}',
            build_order_detail_keyboard(order, user),
            message_id=ctx.get('message_id'),
            prefer_edit=True,
        )

    def _set_payment_status(self, user, chat_id, order_id: int, payment_value: str, ctx: dict):
        if not self._require(user, chat_id, 'change_orders'):
            return
        if payment_value not in ALLOWED_PAYMENT_STATUSES:
            self._send(chat_id, 'وضعیت پرداخت نامعتبر است.')
            return
        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            self._send(chat_id, 'سفارش یافت نشد.', build_orders_menu(user))
            return
        if payment_value in {'paid', 'cancelled'}:
            self._reply(
                chat_id,
                f'برای تغییر وضعیت پرداخت سفارش {order.order_number} به «{payment_status_label(payment_value)}» تایید می‌کنید؟',
                inline_keyboard([
                    [
                        {'text': '✅ تایید', 'callback_data': f'o:pc:{order.id}:{payment_value}'[:64]},
                        {'text': '⬅️ بازگشت', 'callback_data': f'o:v:{order.id}'[:64]},
                    ]
                ]),
                message_id=ctx.get('message_id'),
                prefer_edit=True,
            )
            return
        self._apply_payment_status(user, chat_id, order, payment_value, ctx)

    def _confirm_payment_status(self, user, chat_id, order_id: int, payment_value: str, ctx: dict):
        if not self._require(user, chat_id, 'change_orders'):
            return
        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            self._send(chat_id, 'سفارش یافت نشد.', build_orders_menu(user))
            return
        self._apply_payment_status(user, chat_id, order, payment_value, ctx)

    def _apply_payment_status(self, user, chat_id, order: Order, payment_value: str, ctx: dict):
        try:
            order = OrderService.update_payment_status(
                order.id,
                payment_value,
                print_receipt=True,
            )
        except Exception as exc:
            self._send(chat_id, f'خطا در تغییر وضعیت پرداخت: {exc}', build_orders_menu(user))
            return
        self._reply(
            chat_id,
            f'✅ وضعیت پرداخت به «{payment_status_label(payment_value)}» تغییر کرد.\n\n{self._order_card(order)}',
            build_order_detail_keyboard(order, user),
            message_id=ctx.get('message_id'),
            prefer_edit=True,
        )

    # ── reports / commands ───────────────────────────────────────────────

    def _handle_report(
        self,
        user,
        chat_id,
        kind: str,
        ctx: Optional[dict] = None,
        page: int = 0,
        anchor: Optional[date] = None,
        range_start: Optional[date] = None,
        range_end: Optional[date] = None,
    ):
        ctx = ctx or {}
        if not self._require(user, chat_id, 'view_reports'):
            return
        try:
            anchor_iso = anchor.isoformat() if anchor else None
            keyboard_page = page
            if kind == 'daily':
                text = build_daily_report_text(user=user, anchor=anchor)
            elif kind == 'hourly':
                text = build_hourly_report_text(user=user, page=page, anchor=anchor)
                keyboard_page = page
            elif kind == 'range_custom':
                if not range_start or not range_end:
                    self._send(chat_id, 'بازه تاریخ نامعتبر است.', build_reports_menu())
                    return
                text = build_custom_range_report_text(range_start, range_end, user=user)
            elif kind == 'sales7':
                text = build_sales7_report_text(user=user)
            elif kind == 'range_today':
                _, start, end = get_business_day_bounds()
                text = build_range_report_text(
                    start, end, 'امروز (روز کاری)', user=user, end_inclusive=False
                )
            elif kind == 'range_yesterday':
                yesterday = timezone.localdate() - timedelta(days=1)
                _, start, end = get_business_day_bounds(yesterday)
                text = build_range_report_text(
                    start, end, 'دیروز (روز کاری)', user=user, end_inclusive=False
                )
            elif kind == 'range7':
                end = timezone.now()
                start = end - timedelta(days=7)
                text = build_range_report_text(start, end, '۷ روز اخیر', user=user)
            elif kind == 'range30':
                end = timezone.now()
                start = end - timedelta(days=30)
                text = build_range_report_text(start, end, '۳۰ روز اخیر', user=user)
            elif kind == 'exceptions':
                text = build_exception_report_text(user=user)
            elif kind == 'stock':
                text = build_stock_report_text(user=user)
            elif kind == 'products':
                text = build_products_report_text(user=user)
            elif kind == 'low_stock':
                products = get_low_stock_products(limit=20)
                if not products:
                    text = (
                        '✅ موجودی کم / ناموجود\n'
                        'همه محصولات بالای ۵ عدد موجودی دارند.'
                    )
                    self._reply(
                        chat_id,
                        text,
                        build_report_result_keyboard('low_stock'),
                        message_id=ctx.get('message_id'),
                        prefer_edit=True,
                    )
                    return
                self._reply(
                    chat_id,
                    build_low_stock_report_header(products),
                    build_product_list_keyboard(products, 0, False, user),
                    message_id=ctx.get('message_id'),
                    prefer_edit=True,
                )
                return
            else:
                text = 'نوع گزارش نامعتبر است.'
                self._reply(
                    chat_id,
                    text,
                    build_reports_menu(),
                    message_id=ctx.get('message_id'),
                    prefer_edit=True,
                )
                return

            total_pages = hourly_report_total_pages(anchor) if kind == 'hourly' else 1
            keyboard = build_report_result_keyboard(
                kind,
                page=keyboard_page,
                total_pages=total_pages,
                anchor_iso=anchor_iso,
                range_start_iso=range_start.isoformat() if range_start else None,
                range_end_iso=range_end.isoformat() if range_end else None,
            )
            self._deliver_report(chat_id, text, keyboard, ctx)
        except Exception as exc:
            logger.exception('report failed')
            self._send(chat_id, f'خطا در تهیه گزارش: {exc}', build_reports_menu())

    def _handle_command(self, user: User, chat_id, text: str):
        parts = text.split()
        cmd = parts[0]
        if cmd in ('/گزارش', '/report'):
            self._handle_report(user, chat_id, 'daily')
        elif cmd in ('/موجودی', '/stock') and len(parts) >= 3:
            if not self._require(user, chat_id, 'change_stock'):
                return
            try:
                product = StockService.update_stock(
                    int(parts[1]), int(parts[2]), change_type='manual', admin_user=user, notes='via bale bot'
                )
                self._send(
                    chat_id,
                    f'✅ موجودی «{product.name}» → {fmt_num(product.stock_quantity)}',
                    build_stock_after_keyboard(product.id),
                )
            except Exception as exc:
                self._send(chat_id, f'خطا: {exc}')
        elif cmd in ('/محصول', '/product') and len(parts) >= 2:
            self._show_product(user, chat_id, int(parts[1]), {})
        else:
            self._send(chat_id, 'از منوی دکمه‌ای استفاده کنید.', build_main_menu(user))

    # ── conversation text input ──────────────────────────────────────────

    def _handle_conversation_input(
        self,
        user: User,
        chat_id,
        conv: BotConversation,
        text: str,
        message: Optional[Dict[str, Any]] = None,
    ):
        message = message or {}
        if text in ('انصراف', '/cancel', 'cancel', 'لغو'):
            conv.clear()
            self._send(chat_id, 'عملیات لغو شد.', build_main_menu(user))
            return

        state = conv.state
        data = dict(conv.data or {})

        if state in ('product_add_image', 'product_edit_image'):
            file_id = self._extract_image_file_id(message)
            if file_id:
                try:
                    product = Product.objects.select_related('category').get(pk=data.get('product_id'))
                    self._attach_image_to_product(product, file_id)
                    product.refresh_from_db()
                    conv.clear()
                    label = 'تصویر ذخیره شد' if state == 'product_add_image' else 'تصویر به‌روز شد'
                    self._send(
                        chat_id,
                        f'🖼 {label}.\n\n{self._product_card(product)}',
                        build_product_detail_keyboard(product.id, user),
                    )
                except Exception as exc:
                    logger.exception('image attach failed')
                    self._send(chat_id, f'خطا در ذخیره تصویر: {exc}\nدوباره بفرستید یا «بدون تصویر» را بزنید.')
                return
            if text.strip().lower() in SKIP_IMAGE_WORDS or text.strip() in SKIP_IMAGE_WORDS:
                self._skip_image(user, chat_id, conv)
                return
            self._send(chat_id, 'لطفاً تصویر بفرستید یا دکمه «بدون تصویر» را بزنید.', build_skip_image_keyboard())
            return

        if state == 'product_search':
            products = list(Product.objects.filter(name__icontains=text).order_by('name')[:PAGE_SIZE])
            conv.clear()
            if not products:
                self._send(chat_id, f'نتیجه‌ای برای «{text}» پیدا نشد.', build_products_menu(user))
                return
            self._send(
                chat_id,
                section_title('🔍', f'نتایج «{text}»', 'روی محصول بزنید:'),
                build_product_list_keyboard(products, 0, False, user),
            )
            return

        if state == 'product_add_name':
            draft = data.get('draft') or {}
            draft['name'] = text
            conv.set_state('product_add_price', draft=draft)
            self._send(
                chat_id,
                f'➕ افزودن محصول\n{progress_bar(2, ADD_STEPS)}\n\nقیمت (ریال، فقط عدد):\n{cancel_hint()}',
                build_cancel_keyboard('menu:products'),
            )
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
            self._send(
                chat_id,
                f'➕ افزودن محصول\n{progress_bar(3, ADD_STEPS)}\n\nموجودی اولیه (≥ ۰):\n{cancel_hint()}',
                build_cancel_keyboard('menu:products'),
            )
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
            cats = list(Category.objects.filter(is_active=True).order_by('display_order', 'name')[:30])
            if not cats:
                conv.clear()
                self._send(chat_id, 'هیچ دسته‌بندی فعالی نیست. اول از پنل دسته بسازید.', build_main_menu(user))
                return
            conv.set_state('product_add_category', draft=draft)
            self._send(
                chat_id,
                f'➕ افزودن محصول\n{progress_bar(4, ADD_STEPS)}\n\nدسته‌بندی را انتخاب کنید:',
                build_category_keyboard(cats),
            )
            return

        if state == 'product_add_category':
            self._send(chat_id, 'لطفاً از دکمه‌های دسته‌بندی استفاده کنید.', build_category_keyboard(
                Category.objects.filter(is_active=True).order_by('display_order', 'name')[:30]
            ))
            return

        if state == 'product_edit_value':
            product_id = data.get('product_id')
            field = data.get('field')
            try:
                product = Product.objects.select_related('category').get(pk=product_id)
                value: Any = text
                if field == 'price':
                    value = int(text.replace(',', '').replace('٬', '').strip())
                elif field == 'stock_quantity':
                    value = int(text.strip())
                    if not PermissionService.user_has_any(user, ['change_stock', 'change_products']):
                        raise PermissionError('no stock permission')
                ProductService.update_product(product, {field: value})
                product.refresh_from_db()
                conv.clear()
                self._send(
                    chat_id,
                    f'✅ ذخیره شد.\n\n{self._product_card(product)}',
                    build_product_detail_keyboard(product.id, user),
                )
            except Exception as exc:
                self._send(chat_id, f'خطا: {exc}')
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
                    f'✅ موجودی «{product.name}» اکنون {fmt_num(product.stock_quantity)} عدد است.',
                    build_stock_after_keyboard(product.id),
                )
            except Exception as exc:
                self._send(chat_id, f'خطا: {exc}\nعدد معتبر بفرستید یا انصراف.')
            return

        if state == 'report_daily_date':
            try:
                anchor = parse_date_input(text)
            except ValueError as exc:
                self._send(chat_id, f'{exc}\nدوباره بنویسید یا انصراف بزنید.')
                return
            conv.clear()
            self._handle_report(user, chat_id, 'daily', {}, anchor=anchor)
            return

        if state == 'report_hourly_date':
            try:
                anchor = parse_date_input(text)
            except ValueError as exc:
                self._send(chat_id, f'{exc}\nدوباره بنویسید یا انصراف بزنید.')
                return
            conv.clear()
            self._handle_report(user, chat_id, 'hourly', {}, page=0, anchor=anchor)
            return

        if state == 'report_range_start':
            try:
                start = parse_date_input(text)
            except ValueError as exc:
                self._send(chat_id, f'{exc}\nدوباره بنویسید یا انصراف بزنید.')
                return
            conv.set_state('report_range_end', range_start=start.isoformat())
            self._send(
                chat_id,
                f'{date_input_hint("تاریخ پایان بازه")}\n{cancel_hint()}',
                build_cancel_keyboard('menu:reports'),
            )
            return

        if state == 'report_range_end':
            try:
                end = parse_date_input(text)
                start = date.fromisoformat(data.get('range_start', ''))
            except (ValueError, TypeError) as exc:
                self._send(chat_id, f'تاریخ نامعتبر است: {exc}\nدوباره بنویسید.')
                return
            if end < start:
                self._send(chat_id, 'تاریخ پایان باید بعد از تاریخ شروع باشد. دوباره بنویسید:')
                return
            conv.clear()
            self._handle_report(
                user,
                chat_id,
                'range_custom',
                {},
                range_start=start,
                range_end=end,
            )
            return

        if state == 'order_search':
            orders = list(
                Order.objects.filter(order_number__icontains=text.strip())
                .order_by('-created_at')[:PAGE_SIZE]
            )
            conv.clear()
            if not orders:
                self._send(chat_id, f'سفارشی برای «{text}» پیدا نشد.', build_orders_menu(user))
                return
            self._send(
                chat_id,
                section_title('🔍', f'نتایج سفارش «{text}»', 'روی سفارش بزنید:'),
                build_order_list_keyboard(orders, 0, False, user, scope='today'),
            )
            return

        if state == 'order_status_number':
            try:
                order = Order.objects.get(order_number=text.strip())
            except Order.DoesNotExist:
                self._send(chat_id, 'سفارش یافت نشد. شماره معتبر بفرستید:')
                return
            conv.clear()
            self._send(
                chat_id,
                f'{self._order_card(order)}\n\nوضعیت جدید را انتخاب کنید:',
                build_order_status_keyboard(order.id),
            )
            return

        conv.clear()
        self._send(chat_id, 'گفتگو منقضی شد. از منو دوباره شروع کنید.', build_main_menu(user))
