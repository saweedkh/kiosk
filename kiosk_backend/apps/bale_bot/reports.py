"""
قالب‌بندی گزارش‌های ربات بله — خروجی خوانا، دقیق و هم‌تراز با پنل ادمین.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Sequence, Tuple

from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from apps.admin_panel.utils.report_constants import (
    get_business_day_start,
    format_business_day_start,
    LOW_STOCK_THRESHOLD,
)
from apps.admin_panel.services.report_service import ReportService
from apps.bale_bot.menus import (
    fmt_money,
    fmt_num,
    fulfillment_label,
    order_status_label,
)
from apps.orders.models import Order, OrderItem
from apps.products.models import Product


REPORT_CHAR_LIMIT = 3800
HOURLY_PAGE_SIZE = 12

PAYMENT_STATUS_LABELS = {
    'pending': 'در انتظار',
    'processing': 'در حال پردازش',
    'paid': 'پرداخت‌شده',
    'completed': 'تکمیل‌شده',
    'cancelled': 'لغو‌شده',
    'failed': 'ناموفق',
    'refunded': 'بازگشت‌شده',
}


def _business_day_start_kwargs() -> Dict[str, int]:
    hour, minute = get_business_day_start()
    return {
        'business_day_start_hour': hour,
        'business_day_start_minute': minute,
    }


def get_business_day_bounds(anchor: date | None = None) -> Tuple[date, datetime, datetime]:
    hour, minute = get_business_day_start()
    return ReportSelector._get_business_day_range(
        date=anchor or timezone.localdate(),
        business_day_start_hour=hour,
        business_day_start_minute=minute,
    )


def payment_status_label(code: str) -> str:
    return PAYMENT_STATUS_LABELS.get(code, code or '—')


def split_report_text(text: str, limit: int = REPORT_CHAR_LIMIT) -> List[str]:
    text = (text or '').strip()
    if len(text) <= limit:
        return [text]
    chunks: List[str] = []
    current: List[str] = []
    current_len = 0
    for line in text.splitlines():
        addition = len(line) + 1
        if current and current_len + addition > limit:
            chunks.append('\n'.join(current))
            current = [line]
            current_len = addition
        else:
            current.append(line)
            current_len += addition
    if current:
        chunks.append('\n'.join(current))
    return chunks


def _jalali(d: date | datetime | None = None) -> str:
    try:
        import jdatetime

        if d is None:
            d = timezone.localdate()
        if isinstance(d, datetime):
            d = timezone.localtime(d).date() if timezone.is_aware(d) else d.date()
        return jdatetime.date.fromgregorian(date=d).strftime('%Y/%m/%d')
    except Exception:
        if d is None:
            d = timezone.localdate()
        if isinstance(d, datetime):
            d = d.date()
        return d.isoformat()


def _jalali_time(value: datetime | None) -> str:
    if not value:
        return '—'
    local = timezone.localtime(value)
    try:
        import jdatetime

        jdt = jdatetime.datetime.fromgregorian(datetime=local)
        return jdt.strftime('%Y/%m/%d %H:%M')
    except Exception:
        return local.strftime('%Y-%m-%d %H:%M')


def _divider() -> str:
    return '────────────'


def _coerce_range_points(start, end):
    if timezone.is_naive(start):
        start = timezone.make_aware(start)
    if timezone.is_naive(end):
        end = timezone.make_aware(end)
    return start, end


def _order_scope(start, end, *, paid_only: bool = False, end_inclusive: bool = False):
    start, end = _coerce_range_points(start, end)
    if end_inclusive:
        qs = Order.objects.filter(created_at__gte=start, created_at__lte=end)
    else:
        qs = Order.objects.filter(created_at__gte=start, created_at__lt=end)
    if paid_only:
        qs = qs.filter(payment_status='paid')
    return qs


def _status_breakdown(queryset) -> Dict[str, int]:
    rows = queryset.values('status').annotate(c=Count('id'))
    return {r['status']: r['c'] for r in rows}


def _payment_breakdown(queryset) -> Dict[str, int]:
    rows = queryset.values('payment_status').annotate(c=Count('id'))
    return {r['payment_status']: r['c'] for r in rows}


def _fulfillment_breakdown(queryset) -> Dict[str, int]:
    if not hasattr(Order, 'fulfillment_type'):
        return {}
    rows = queryset.values('fulfillment_type').annotate(c=Count('id'))
    return {r['fulfillment_type'] or 'dine_in': r['c'] for r in rows}


def _service_fee_sum(queryset) -> int:
    if not hasattr(Order, 'service_fee'):
        return 0
    return int(queryset.aggregate(t=Sum('service_fee'))['t'] or 0)


def _packaging_fee_sum(queryset) -> int:
    if not hasattr(Order, 'packaging_fee'):
        return 0
    return int(queryset.aggregate(t=Sum('packaging_fee'))['t'] or 0)


def _discount_sum(queryset) -> int:
    if not hasattr(Order, 'discount_amount'):
        return 0
    return int(queryset.aggregate(t=Sum('discount_amount'))['t'] or 0)


def _coupon_usage_count(queryset) -> int:
    if not hasattr(Order, 'coupon_id'):
        return 0
    return queryset.filter(coupon_id__isnull=False).count()


def _format_status_lines(counts: Dict[str, int], label_fn) -> List[str]:
    if not counts:
        return []
    lines = []
    for code, count in sorted(counts.items(), key=lambda x: -x[1]):
        lines.append(f'  • {label_fn(code)}: {fmt_num(count)}')
    return lines


def _top_products(start, end, limit: int = 8) -> List[Dict[str, Any]]:
    qs = (
        OrderItem.objects.filter(
            order__created_at__gte=start,
            order__created_at__lte=end,
            order__payment_status='paid',
        )
        .values('product_id', 'product_name')
        .annotate(
            qty=Sum('quantity'),
            revenue=Sum(F('quantity') * F('unit_price')),
        )
        .order_by('-qty')[:limit]
    )
    return list(qs)


def _format_top_products(items: Sequence[Dict[str, Any]]) -> List[str]:
    if not items:
        return ['  —']
    lines = []
    for i, item in enumerate(items, 1):
        name = (item.get('product_name') or f"#{item.get('product_id')}")[:28]
        qty = fmt_num(item.get('qty') or 0)
        rev = fmt_money(item.get('revenue') or 0)
        lines.append(f'  {i}. {name} — {qty} عدد · {rev}')
    return lines


def _recent_orders(queryset, limit: int = 8) -> List[str]:
    orders = list(queryset.order_by('-id')[:limit])
    if not orders:
        return ['  —']
    lines = []
    for o in orders:
        when = timezone.localtime(o.created_at).strftime('%H:%M') if o.created_at else '—'
        pay = payment_status_label(o.payment_status)
        lines.append(
            f'  • {o.order_number} · {fmt_money(o.total_amount)} · '
            f'{order_status_label(o.status)} · {pay} · {when}'
        )
    return lines


def _gateway_breakdown(queryset, limit: int = 5) -> List[str]:
    rows = (
        queryset.exclude(Q(gateway_name__isnull=True) | Q(gateway_name=''))
        .values('gateway_name')
        .annotate(count=Count('id'), amount=Sum('total_amount'))
        .order_by('-count')[:limit]
    )
    if not rows:
        return []
    lines = []
    for row in rows:
        name = (row.get('gateway_name') or '—')[:20]
        lines.append(
            f'  • {name}: {fmt_num(row.get("count") or 0)} تراکنش · '
            f'{fmt_money(row.get("amount") or 0)}'
        )
    return lines


def _business_day_header(start: datetime, end: datetime) -> List[str]:
    hour, minute = get_business_day_start()
    start_label = format_business_day_start(hour, minute)
    return [
        f'بازه روز کاری: {_jalali_time(start)} تا {_jalali_time(end)}',
        f'شروع روز کاری: {start_label}',
    ]


def _summary_block(
    qs,
    *,
    total_sales: int,
    paid_count: int,
    transactions: int = 0,
    successful_tx: int = 0,
    failed_tx: int = 0,
    successful_amount: int = 0,
) -> List[str]:
    avg = (total_sales / paid_count) if paid_count else 0
    paid_qs = qs.filter(payment_status='paid')
    fee = _service_fee_sum(paid_qs)
    packaging = _packaging_fee_sum(paid_qs)
    discount = _discount_sum(paid_qs)
    coupons = _coupon_usage_count(paid_qs)

    lines = [
        '📌 خلاصه عملکرد (فقط پرداخت‌شده)',
        f'✅ سفارش پرداخت‌شده: {fmt_num(paid_count)}',
        f'💰 فروش موفق: {fmt_money(total_sales)}',
        f'🧺 میانگین سبد (پرداخت‌شده): {fmt_money(avg)}',
    ]
    if transactions:
        lines.append(f'💳 تراکنش ثبت‌شده: {fmt_num(transactions)}')
    if successful_tx or failed_tx:
        lines.append(
            f'✅ تراکنش موفق: {fmt_num(successful_tx)} · '
            f'❌ ناموفق: {fmt_num(failed_tx)}'
        )
    if successful_amount:
        lines.append(f'💵 مبلغ تراکنش موفق: {fmt_money(successful_amount)}')
    if fee:
        lines.append(f'🛎 جمع سرویس: {fmt_money(fee)}')
    if packaging:
        lines.append(f'📦 جمع بسته‌بندی: {fmt_money(packaging)}')
    if discount:
        lines.append(f'🏷 جمع تخفیف: {fmt_money(discount)}')
    if coupons:
        lines.append(f'🎟 استفاده کوپن: {fmt_num(coupons)}')
    return lines


def build_home_dashboard_text(user=None) -> str:
    _, start, end = get_business_day_bounds()
    qs = _order_scope(start, end)
    paid_qs = qs.filter(payment_status='paid')
    pending_action = qs.filter(
        Q(payment_status='failed') | ~Q(status__in=['completed', 'cancelled'])
    ).distinct()
    low_stock_count = Product.objects.filter(stock_quantity__lte=LOW_STOCK_THRESHOLD).count()

    lines = [
        'سلام. امروز فروشگاه در چه وضعی است؟',
        *_business_day_header(start, end),
        '',
        f'• فروش موفق: {fmt_money(paid_qs.aggregate(t=Sum("total_amount"))["t"] or 0)}',
        f'• {fmt_num(pending_action.count())} سفارش نیازمند اقدام',
        f'• {fmt_num(qs.filter(payment_status="failed").count())} پرداخت ناموفق',
        f'• {fmt_num(low_stock_count)} محصول کم‌موجود',
        '',
        'از دکمه‌های پایین، مستقیم وارد عملیات شوید.',
    ]
    return '\n'.join(lines)


def parse_date_input(text: str) -> date:
    """Parse Jalali or Gregorian date from user text."""
    import jdatetime

    raw = (text or '').strip()
    for persian, latin in zip('۰۱۲۳۴۵۶۷۸۹', '0123456789'):
        raw = raw.replace(persian, latin)
    raw = raw.replace('-', '/').replace('\\', '/').replace('.', '/')
    raw = raw.replace('٬', '').replace(',', '').strip()

    if len(raw) == 10 and raw[4] == '-' and raw.count('-') == 2:
        return date.fromisoformat(raw)

    if '/' in raw:
        parts = [p.strip() for p in raw.split('/') if p.strip()]
        if len(parts) != 3:
            raise ValueError('فرمت تاریخ نامعتبر است')
        y, m, d = (int(parts[0]), int(parts[1]), int(parts[2]))
        if y > 1700:
            return date(y, m, d)
        return jdatetime.date(y, m, d).togregorian()

    if len(raw) == 8 and raw.isdigit():
        y, m, d = int(raw[:4]), int(raw[4:6]), int(raw[6:8])
        if y > 1700:
            return date(y, m, d)
        return jdatetime.date(y, m, d).togregorian()

    raise ValueError('فرمت تاریخ نامعتبر است. مثال: 1404/05/28')


def date_input_hint(title: str = 'تاریخ') -> str:
    hour, minute = get_business_day_start()
    start_label = format_business_day_start(hour, minute)
    return (
        f'{title} را بنویسید:\n'
        'مثال: 1404/05/28\n'
        f'هر «روز» = بازه {start_label} همان تاریخ تا {start_label} روز بعد (روز کاری)'
    )


def build_daily_report_text(user=None, anchor: date | None = None) -> str:
    anchor = anchor or timezone.localdate()
    _, start, end = get_business_day_bounds(anchor)
    report = ReportService.get_daily_report(
        date=anchor,
        user=user,
        **_business_day_start_kwargs(),
    )
    qs = _order_scope(start, end)
    paid_qs = qs.filter(payment_status='paid')
    paid_count = paid_qs.count()
    total_sales = int(report.get('total_sales', 0) or 0)
    total_orders = int(report.get('total_orders', 0) or 0)
    transactions = int(report.get('total_transactions', 0) or 0)

    statuses = _status_breakdown(qs)
    payments = _payment_breakdown(qs)
    fulfillments = _fulfillment_breakdown(qs)
    tops = _top_products(start, end, limit=8)
    gateways = _gateway_breakdown(qs)

    lines = [
        '📅 گزارش روز کاری',
        f'تاریخ: {_jalali(anchor)}',
        *_business_day_header(start, end),
        _divider(),
        *_summary_block(
            qs,
            total_sales=total_sales,
            paid_count=paid_count,
            transactions=transactions,
        ),
    ]

    if statuses:
        lines.extend(['', '📊 وضعیت سفارش'])
        lines.extend(_format_status_lines(statuses, order_status_label))

    if payments:
        lines.extend(['', '💵 وضعیت پرداخت'])
        lines.extend(_format_status_lines(payments, payment_status_label))

    if fulfillments:
        lines.extend(['', '🍽 نوع سفارش'])
        lines.extend(_format_status_lines(fulfillments, fulfillment_label))

    if gateways:
        lines.extend(['', '🔌 درگاه پرداخت'])
        lines.extend(gateways)

    lines.extend(['', '🏆 پرفروش (پرداخت‌شده)'])
    lines.extend(_format_top_products(tops))

    lines.extend(['', '🧾 آخرین سفارش‌ها'])
    lines.extend(_recent_orders(qs, limit=8))

    return '\n'.join(lines)


def build_hourly_report_text(user=None, page: int = 0, anchor: date | None = None) -> str:
    anchor = anchor or timezone.localdate()
    report = ReportService.get_hourly_report(
        date=anchor,
        user=user,
        **_business_day_start_kwargs(),
    )
    hours = report.get('hours') or []
    total_pages = max(1, (len(hours) + HOURLY_PAGE_SIZE - 1) // HOURLY_PAGE_SIZE)
    page = max(0, min(page, total_pages - 1))
    start_idx = page * HOURLY_PAGE_SIZE
    page_hours = hours[start_idx : start_idx + HOURLY_PAGE_SIZE]

    failed_by_hour: Dict[str, int] = {}
    range_start = report.get('range_start')
    if range_start:
        anchor_start = datetime.fromisoformat(range_start.replace('Z', '+00:00'))
        if timezone.is_naive(anchor_start):
            anchor_start = timezone.make_aware(anchor_start)
        for hour_index in range(24):
            bucket_start = anchor_start + timedelta(hours=hour_index)
            bucket_end = bucket_start + timedelta(hours=1)
            failed_by_hour[bucket_start.strftime('%H:00')] = Order.objects.filter(
                created_at__gte=bucket_start,
                created_at__lt=bucket_end,
                payment_status='failed',
            ).count()

    header_lines: List[str] = []
    if report.get('range_start') and report.get('range_end'):
        rs = datetime.fromisoformat(report['range_start'].replace('Z', '+00:00'))
        re = datetime.fromisoformat(report['range_end'].replace('Z', '+00:00'))
        if timezone.is_naive(rs):
            rs = timezone.make_aware(rs)
        if timezone.is_naive(re):
            re = timezone.make_aware(re)
        header_lines = _business_day_header(rs, re)

    lines = [
        '🕐 گزارش ساعتی',
        f'تاریخ: {_jalali(anchor)}',
        *header_lines,
        _divider(),
        f'💰 فروش موفق: {fmt_money(report.get("total_sales", 0) or 0)}',
        f'🛒 سفارش‌ها: {fmt_num(report.get("total_orders", 0) or 0)}',
        f'✅ پرداخت موفق: {fmt_num(report.get("successful_orders", 0) or 0)}',
        f'💳 تراکنش: {fmt_num(report.get("total_transactions", 0) or 0)}',
        '',
        f'📈 ریز ساعتی (صفحه {page + 1} از {total_pages})',
    ]
    for row in page_hours:
        label = row.get('hour_label') or '—'
        failed = failed_by_hour.get(label, 0)
        lines.append(
            f'• {label} | سفارش {fmt_num(row.get("total_orders", 0))} | '
            f'موفق {fmt_num(row.get("successful_orders", 0))} | '
            f'ناموفق {fmt_num(failed)} | '
            f'فروش {fmt_money(row.get("total_sales", 0) or 0)}'
        )
    if not page_hours:
        lines.append('• داده‌ای برای این بازه ثبت نشده.')
    return '\n'.join(lines)


def hourly_report_total_pages(anchor: date | None = None) -> int:
    anchor = anchor or timezone.localdate()
    report = ReportService.get_hourly_report(
        date=anchor,
        **_business_day_start_kwargs(),
    )
    hours = report.get('hours') or []
    return max(1, (len(hours) + HOURLY_PAGE_SIZE - 1) // HOURLY_PAGE_SIZE)


def build_custom_range_report_text(start_anchor: date, end_anchor: date, user=None) -> str:
    if end_anchor < start_anchor:
        raise ValueError('تاریخ پایان باید بعد از تاریخ شروع باشد')
    _, range_start, _ = get_business_day_bounds(start_anchor)
    _, _, range_end = get_business_day_bounds(end_anchor)
    label = f'از {_jalali(start_anchor)} تا {_jalali(end_anchor)}'
    return build_range_report_text(
        range_start,
        range_end,
        label,
        user=user,
        end_inclusive=False,
    )


def build_sales7_report_text(user=None) -> str:
    end = timezone.now()
    start = end - timedelta(days=7)
    return build_range_report_text(start, end, '۷ روز اخیر (کامل)', user=user, include_daily=True)


def build_range_report_text(
    start: datetime,
    end: datetime,
    label: str,
    user=None,
    *,
    include_daily: bool = False,
    end_inclusive: bool = True,
) -> str:
    start, end = _coerce_range_points(start, end)
    report = ReportService.get_sales_report(start_date=start, end_date=end, user=user)
    qs = _order_scope(start, end, end_inclusive=end_inclusive)
    paid_qs = qs.filter(payment_status='paid')
    paid_count = paid_qs.count()
    total_orders = int(report.get('total_orders', 0) or 0)
    total_sales = int(report.get('total_sales', 0) or 0)

    statuses = _status_breakdown(qs)
    payments = _payment_breakdown(qs)
    fulfillments = _fulfillment_breakdown(qs)
    tops = _top_products(start, end, limit=8)
    gateways = _gateway_breakdown(qs)

    lines = [
        f'🗓 گزارش {label}',
        f'از {_jalali(timezone.localtime(start).date())} تا {_jalali(timezone.localtime(end).date())}',
        _divider(),
        *_summary_block(
            qs,
            total_sales=total_sales,
            paid_count=paid_count,
            transactions=int(report.get('total_transactions', 0) or 0),
            successful_tx=int(report.get('successful_transactions', 0) or 0),
            failed_tx=int(report.get('failed_transactions', 0) or 0),
            successful_amount=int(report.get('successful_amount', 0) or 0),
        ),
    ]

    if statuses:
        lines.extend(['', '📊 وضعیت سفارش'])
        lines.extend(_format_status_lines(statuses, order_status_label))

    if payments:
        lines.extend(['', '💵 وضعیت پرداخت'])
        lines.extend(_format_status_lines(payments, payment_status_label))

    if fulfillments:
        lines.extend(['', '🍽 نوع سفارش'])
        lines.extend(_format_status_lines(fulfillments, fulfillment_label))

    if gateways:
        lines.extend(['', '🔌 درگاه پرداخت'])
        lines.extend(gateways)

    if include_daily:
        lines.extend(['', '📆 به‌تفکیک روز کاری'])
        today = timezone.localdate()
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            _, day_start, day_end = get_business_day_bounds(d)
            day_qs = _order_scope(day_start, day_end)
            day_paid = day_qs.filter(payment_status='paid')
            agg = day_paid.aggregate(s=Sum('total_amount'))
            lines.append(
                f'  • {_jalali(d)}: {fmt_num(day_paid.count())} پرداخت‌شده · '
                f'{fmt_money(agg["s"] or 0)}'
            )

    lines.extend(['', '🏆 پرفروش (پرداخت‌شده)'])
    lines.extend(_format_top_products(tops))

    lines.extend(['', '🧾 آخرین سفارش‌ها'])
    lines.extend(_recent_orders(qs, limit=8))

    return '\n'.join(lines)


def build_stock_report_text(user=None) -> str:
    report = ReportService.get_stock_report(user=user)
    details = report.get('stock_details') or []
    out_items = [d for d in details if d.get('is_out_of_stock')]
    low_items = [
        d for d in details
        if d.get('is_low_stock') and not d.get('is_out_of_stock')
    ]
    active = sum(1 for d in details if d.get('is_active'))
    total_skus = len(details)

    top_value = sorted(details, key=lambda d: d.get('stock_value') or 0, reverse=True)[:6]
    value_lines = []
    for i, d in enumerate(top_value, 1):
        if (d.get('stock_value') or 0) <= 0:
            continue
        value_lines.append(
            f'  {i}. {(d.get("name") or "")[:24]} — {fmt_num(d.get("stock_quantity"))} · '
            f'{fmt_money(d.get("stock_value"))}'
        )
    if not value_lines:
        value_lines = ['  —']

    lines = [
        '📦 گزارش انبار',
        f'تاریخ: {_jalali()}',
        _divider(),
        '📌 خلاصه',
        f'🔢 تعداد SKU: {fmt_num(total_skus)} (فعال: {fmt_num(active)})',
        f'📥 مجموع موجودی: {fmt_num(report.get("total_items", 0))}',
        f'💎 ارزش انبار: {fmt_money(report.get("total_stock_value", 0))}',
        f'⚠️ موجودی کم: {fmt_num(len(low_items))}',
        f'🚫 ناموجود: {fmt_num(len(out_items))}',
        '',
        '💎 بیشترین ارزش موجودی',
    ]
    lines.extend(value_lines)

    if out_items:
        lines.extend(['', '🚫 ناموجود'])
        for d in out_items[:8]:
            lines.append(f'  • {(d.get("name") or "")[:26]} — #{d.get("id")}')

    if low_items:
        lines.extend(['', '⚠️ موجودی کم'])
        for d in sorted(low_items, key=lambda x: x.get('stock_quantity') or 0)[:8]:
            lines.append(
                f'  • {(d.get("name") or "")[:26]} — {fmt_num(d.get("stock_quantity"))} عدد'
            )

    return '\n'.join(lines)


def build_low_stock_report_header(products: Sequence[Product]) -> str:
    out = sum(1 for p in products if p.stock_quantity <= 0)
    low = sum(1 for p in products if 0 < p.stock_quantity <= LOW_STOCK_THRESHOLD)
    lines = [
        '⚠️ موجودی کم / ناموجود',
        f'تاریخ: {_jalali()}',
        _divider(),
        f'🚫 ناموجود: {fmt_num(out)}',
        f'⚠️ کم (۱ تا {LOW_STOCK_THRESHOLD}): {fmt_num(low)}',
        '',
        'روی هر محصول برای جزئیات بزنید:',
    ]
    return '\n'.join(lines)


def build_products_report_text(user=None) -> str:
    report = ReportService.get_product_report(user=user)
    products = report.get('products') or []
    sold = sorted(
        [p for p in products if (p.get('total_sold') or 0) > 0],
        key=lambda p: p.get('total_sold') or 0,
        reverse=True,
    )[:10]
    revenue = sorted(
        [p for p in products if (p.get('total_revenue') or 0) > 0],
        key=lambda p: p.get('total_revenue') or 0,
        reverse=True,
    )[:8]
    inactive = sum(1 for p in products if not p.get('is_active'))
    zero_stock = sum(1 for p in products if (p.get('stock_quantity') or 0) <= 0)
    never_sold = sum(1 for p in products if not (p.get('total_sold') or 0))

    lines = [
        '🏷 گزارش محصولات',
        f'تاریخ: {_jalali()}',
        _divider(),
        f'📦 کل محصولات: {fmt_num(report.get("total_products", 0))}',
        f'✅ فعال: {fmt_num(report.get("active_products", 0))}',
        f'⛔️ غیرفعال: {fmt_num(inactive)}',
        f'🚫 بدون موجودی: {fmt_num(zero_stock)}',
        f'📉 بدون فروش: {fmt_num(never_sold)}',
        '',
        '🏆 پرفروش‌ترین‌ها (تعداد)',
    ]
    if sold:
        for i, p in enumerate(sold, 1):
            lines.append(
                f'  {i}. {(p.get("name") or "")[:24]} — '
                f'{fmt_num(p.get("total_sold"))} · {fmt_money(p.get("total_revenue") or 0)}'
            )
    else:
        lines.append('  هنوز فروشی ثبت نشده.')

    lines.extend(['', '💰 بیشترین درآمد'])
    if revenue:
        for i, p in enumerate(revenue, 1):
            lines.append(
                f'  {i}. {(p.get("name") or "")[:24]} — {fmt_money(p.get("total_revenue") or 0)}'
            )
    else:
        lines.append('  —')

    return '\n'.join(lines)


def build_exception_report_text(user=None) -> str:
    now = timezone.now()
    _, start, end = get_business_day_bounds()
    qs = _order_scope(start, end)
    failed = qs.filter(payment_status='failed').order_by('-created_at')
    stuck = qs.filter(
        status__in=['pending', 'processing'],
        created_at__lte=now - timedelta(minutes=15),
    ).order_by('-created_at')
    low_stock = list(Product.objects.filter(stock_quantity__lte=LOW_STOCK_THRESHOLD).order_by('stock_quantity', 'name')[:8])
    inactive_with_stock = Product.objects.filter(is_active=False, stock_quantity__gt=0).count()

    failed_amount = int(failed.aggregate(t=Sum('total_amount'))['t'] or 0)

    lines = [
        '🚨 گزارش استثناها',
        f'تاریخ: {_jalali()}',
        *_business_day_header(start, end),
        _divider(),
        f'❌ پرداخت ناموفق: {fmt_num(failed.count())} ({fmt_money(failed_amount)})',
        f'⏳ سفارش معطل (+۱۵ دقیقه): {fmt_num(stuck.count())}',
        f'⚠️ موجودی بحرانی: {fmt_num(Product.objects.filter(stock_quantity__lte=LOW_STOCK_THRESHOLD).count())}',
        f'⛔️ محصول فعال نیست ولی موجودی دارد: {fmt_num(inactive_with_stock)}',
        '',
        'آخرین موارد مهم',
    ]

    if failed.exists():
        for order in failed[:5]:
            err = (order.error_message or '')[:40]
            suffix = f' · {err}' if err else ''
            lines.append(
                f'• پرداخت ناموفق {order.order_number} — {fmt_money(order.total_amount)}{suffix}'
            )
    if stuck.exists():
        for order in stuck[:5]:
            lines.append(
                f'• سفارش معطل {order.order_number} — {order_status_label(order.status)}'
            )
    if low_stock:
        for product in low_stock:
            lines.append(
                f'• موجودی بحرانی #{product.id} {product.name[:18]} — {fmt_num(product.stock_quantity)}'
            )
    if len(lines) <= 8:
        lines.append('• مورد بحرانی فعالی دیده نشد.')
    return '\n'.join(lines)


def get_low_stock_products(limit: int = 20) -> List[Product]:
    return list(
        Product.objects.filter(stock_quantity__lte=LOW_STOCK_THRESHOLD).order_by('stock_quantity', 'name')[:limit]
    )
