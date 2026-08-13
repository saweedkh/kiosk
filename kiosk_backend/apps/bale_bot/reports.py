"""
قالب‌بندی گزارش‌های ربات بله — خروجی خوانا و غنی برای چت.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Sequence

from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from apps.admin_panel.services.report_service import ReportService
from apps.bale_bot.menus import (
    fmt_money,
    fmt_num,
    fulfillment_label,
    order_status_label,
)
from apps.orders.models import Order, OrderItem
from apps.products.models import Product


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


def _divider() -> str:
    return '────────────'


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


def _top_products(start, end, limit: int = 5) -> List[Dict[str, Any]]:
    qs = (
        OrderItem.objects.filter(order__created_at__gte=start, order__created_at__lte=end)
        .values('product_id', 'product_name')
        .annotate(
            qty=Sum('quantity'),
            revenue=Sum(F('quantity') * F('unit_price')),
        )
        .order_by('-qty')[:limit]
    )
    return list(qs)


def _format_status_lines(counts: Dict[str, int], label_fn) -> List[str]:
    if not counts:
        return []
    lines = []
    for code, count in sorted(counts.items(), key=lambda x: -x[1]):
        lines.append(f'  • {label_fn(code)}: {fmt_num(count)}')
    return lines


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


def _recent_orders(queryset, limit: int = 5) -> List[str]:
    orders = list(queryset.order_by('-id')[:limit])
    if not orders:
        return ['  —']
    lines = []
    for o in orders:
        when = timezone.localtime(o.created_at).strftime('%H:%M') if o.created_at else '—'
        lines.append(
            f'  • {o.order_number} · {fmt_money(o.total_amount)} · '
            f'{order_status_label(o.status)} · {when}'
        )
    return lines


def build_daily_report_text(user=None) -> str:
    today = timezone.localdate()
    start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
    end = timezone.make_aware(datetime.combine(today, datetime.max.time()))
    report = ReportService.get_daily_report(date=today, user=user)
    qs = Order.objects.filter(created_at__range=[start, end])

    total_orders = report.get('total_orders', 0) or 0
    total_sales = report.get('total_sales', 0) or 0
    avg = (total_sales / total_orders) if total_orders else 0
    fee = _service_fee_sum(qs)
    packaging = _packaging_fee_sum(qs)
    statuses = _status_breakdown(qs)
    payments = _payment_breakdown(qs)
    fulfillments = _fulfillment_breakdown(qs)
    tops = _top_products(start, end, limit=5)

    lines = [
        f'📅 گزارش امروز',
        f'تاریخ: {_jalali(today)}',
        _divider(),
        '📌 خلاصه',
        f'🛒 سفارش‌ها: {fmt_num(total_orders)}',
        f'💰 فروش: {fmt_money(total_sales)}',
        f'🧺 میانگین سبد: {fmt_money(avg)}',
        f'💳 تراکنش ثبت‌شده: {fmt_num(report.get("total_transactions", 0) or 0)}',
    ]
    if fee:
        lines.append(f'🛎 جمع سرویس: {fmt_money(fee)}')
    if packaging:
        lines.append(f'📦 جمع بسته‌بندی: {fmt_money(packaging)}')

    if statuses:
        lines.extend(['', '📊 وضعیت سفارش'])
        lines.extend(_format_status_lines(statuses, order_status_label))

    if payments:
        lines.extend(['', '💵 وضعیت پرداخت'])
        lines.extend(_format_status_lines(payments, order_status_label))

    if fulfillments:
        lines.extend(['', '🍽 نوع سفارش'])
        lines.extend(_format_status_lines(fulfillments, fulfillment_label))

    lines.extend(['', '🏆 پرفروش امروز'])
    lines.extend(_format_top_products(tops))

    lines.extend(['', '🧾 آخرین سفارش‌ها'])
    lines.extend(_recent_orders(qs, limit=5))

    return '\n'.join(lines)


def build_sales7_report_text(user=None) -> str:
    end = timezone.now()
    start = end - timedelta(days=7)
    report = ReportService.get_sales_report(start_date=start, end_date=end, user=user)
    qs = Order.objects.filter(created_at__gte=start, created_at__lte=end)

    total_orders = report.get('total_orders', 0) or 0
    total_sales = report.get('total_sales', 0) or 0
    avg = report.get('average_order_value') or ((total_sales / total_orders) if total_orders else 0)
    fee = _service_fee_sum(qs)
    packaging = _packaging_fee_sum(qs)
    statuses = _status_breakdown(qs)
    tops = _top_products(start, end, limit=5)

    # Daily breakdown (last 7 local days)
    daily_lines: List[str] = []
    today = timezone.localdate()
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        day_start = timezone.make_aware(datetime.combine(d, datetime.min.time()))
        day_end = timezone.make_aware(datetime.combine(d, datetime.max.time()))
        day_qs = Order.objects.filter(created_at__range=[day_start, day_end])
        agg = day_qs.aggregate(n=Count('id'), s=Sum('total_amount'))
        n = agg['n'] or 0
        s = agg['s'] or 0
        daily_lines.append(f'  • {_jalali(d)}: {fmt_num(n)} سفارش · {fmt_money(s)}')

    lines = [
        '📈 فروش ۷ روز اخیر',
        f'از {_jalali((timezone.localtime(start).date()))} تا {_jalali(today)}',
        _divider(),
        '📌 خلاصه',
        f'🛒 سفارش‌ها: {fmt_num(total_orders)}',
        f'💰 فروش: {fmt_money(total_sales)}',
        f'🧺 میانگین سبد: {fmt_money(avg)}',
        f'✅ پرداخت موفق: {fmt_num(report.get("successful_transactions", 0))}',
        f'❌ پرداخت ناموفق: {fmt_num(report.get("failed_transactions", 0))}',
        f'💳 مبلغ پرداخت‌شده: {fmt_money(report.get("successful_amount", 0))}',
    ]
    if fee:
        lines.append(f'🛎 جمع سرویس: {fmt_money(fee)}')
    if packaging:
        lines.append(f'📦 جمع بسته‌بندی: {fmt_money(packaging)}')

    if statuses:
        lines.extend(['', '📊 وضعیت سفارش'])
        lines.extend(_format_status_lines(statuses, order_status_label))

    lines.extend(['', '📆 به‌تفکیک روز'])
    lines.extend(daily_lines)

    lines.extend(['', '🏆 پرفروش دوره'])
    lines.extend(_format_top_products(tops))

    return '\n'.join(lines)


def build_stock_report_text(user=None) -> str:
    report = ReportService.get_stock_report(user=user)
    details = report.get('stock_details') or []
    out = sum(1 for d in details if d.get('is_out_of_stock'))
    low = sum(1 for d in details if d.get('is_low_stock') and not d.get('is_out_of_stock'))
    active = sum(1 for d in details if d.get('is_active'))
    total_skus = len(details)

    # Top by stock value
    top_value = sorted(details, key=lambda d: d.get('stock_value') or 0, reverse=True)[:5]
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
        f'⚠️ موجودی کم: {fmt_num(low)}',
        f'🚫 ناموجود: {fmt_num(out)}',
        '',
        '💎 بیشترین ارزش موجودی',
    ]
    lines.extend(value_lines)
    return '\n'.join(lines)


def build_low_stock_report_header(products: Sequence[Product]) -> str:
    out = sum(1 for p in products if p.stock_quantity <= 0)
    low = sum(1 for p in products if 0 < p.stock_quantity <= 5)
    lines = [
        '⚠️ موجودی کم / ناموجود',
        f'تاریخ: {_jalali()}',
        _divider(),
        f'🚫 ناموجود: {fmt_num(out)}',
        f'⚠️ کم (۱ تا ۵): {fmt_num(low)}',
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
    )[:8]
    revenue = sorted(
        [p for p in products if (p.get('total_revenue') or 0) > 0],
        key=lambda p: p.get('total_revenue') or 0,
        reverse=True,
    )[:5]

    lines = [
        '🏷 گزارش محصولات',
        f'تاریخ: {_jalali()}',
        _divider(),
        f'📦 کل محصولات: {fmt_num(report.get("total_products", 0))}',
        f'✅ فعال: {fmt_num(report.get("active_products", 0))}',
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


def get_low_stock_products(limit: int = 20) -> List[Product]:
    return list(
        Product.objects.filter(stock_quantity__lte=5).order_by('stock_quantity', 'name')[:limit]
    )
