from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from datetime import timedelta, datetime, date
from typing import Any, Dict, List, Optional, Tuple

from apps.orders.models import Order, OrderItem
from apps.products.models import Product
from apps.admin_panel.utils.report_constants import (
    get_business_day_start,
    format_business_day_start,
    LOW_STOCK_THRESHOLD,
    STUCK_ORDER_MINUTES,
    SALES_COUNTED_ORDER_STATUSES,
    SALES_FAILED_ORDER_STATUSES,
)
from apps.admin_panel.utils.report_datetime import (
    enrich_order_row,
    enrich_range_meta,
    format_jalali_date,
    format_jalali_datetime,
    format_jalali_time,
    resolve_sales_datetime_range,
)


class ReportSelector:
    @staticmethod
    def _resolve_business_start(
        hour: int | None = None,
        minute: int | None = None,
    ) -> tuple[int, int]:
        if hour is None and minute is None:
            return get_business_day_start()
        default_hour, default_minute = get_business_day_start()
        resolved_hour = default_hour if hour is None else max(0, min(23, int(hour)))
        resolved_minute = default_minute if minute is None else max(0, min(59, int(minute)))
        return resolved_hour, resolved_minute

    @staticmethod
    def _get_business_day_range(
        date=None,
        business_day_start_hour=None,
        business_day_start_minute=None,
    ):
        if not date:
            date = timezone.localdate()

        hour, minute = ReportSelector._resolve_business_start(
            business_day_start_hour,
            business_day_start_minute,
        )
        naive_start = datetime.combine(date, datetime.min.time()).replace(
            hour=hour,
            minute=minute,
            second=0,
            microsecond=0,
        )
        start = timezone.make_aware(naive_start, timezone.get_current_timezone())
        end = start + timedelta(days=1)
        return date, start, end

    @staticmethod
    def _orders_in_range(start, end, *, end_inclusive: bool = False):
        if end_inclusive:
            return Order.objects.filter(created_at__gte=start, created_at__lte=end)
        return Order.objects.filter(created_at__gte=start, created_at__lt=end)

    @staticmethod
    def get_sales_report(
        start_date=None,
        end_date=None,
        *,
        start_time=None,
        end_time=None,
        start_dt: datetime | None = None,
        end_dt: datetime | None = None,
    ):
        if start_dt is None and start_date is not None:
            if isinstance(start_date, datetime):
                start_dt = start_date if timezone.is_aware(start_date) else timezone.make_aware(start_date)
                start_date = None
            else:
                start_dt, _ = resolve_sales_datetime_range(
                    start_date=start_date,
                    start_time=start_time,
                )
        if end_dt is None and end_date is not None:
            if isinstance(end_date, datetime):
                end_dt = end_date if timezone.is_aware(end_date) else timezone.make_aware(end_date)
                end_date = None
            else:
                _, end_dt = resolve_sales_datetime_range(
                    end_date=end_date,
                    end_time=end_time,
                )

        queryset = Order.objects.all()
        if start_dt:
            queryset = queryset.filter(created_at__gte=start_dt)
        if end_dt:
            queryset = queryset.filter(created_at__lt=end_dt)

        # Sales KPIs follow order.status only (not payment_status).
        successful_orders = queryset.filter(status__in=SALES_COUNTED_ORDER_STATUSES)

        order_totals = queryset.aggregate(total_orders=Count('id'))
        sales_totals = successful_orders.aggregate(total_amount=Sum('total_amount'))

        total_amount = sales_totals['total_amount'] or 0
        total_orders = order_totals['total_orders'] or 0
        successful_order_count = successful_orders.count()
        average_order_value = (
            total_amount / successful_order_count
        ) if successful_order_count > 0 else 0

        transactions_queryset = queryset.exclude(
            Q(transaction_id__isnull=True) | Q(transaction_id='')
        )
        successful_transactions = transactions_queryset.filter(
            status__in=SALES_COUNTED_ORDER_STATUSES
        )
        failed_transactions = transactions_queryset.filter(
            status__in=SALES_FAILED_ORDER_STATUSES
        )

        total_transactions = transactions_queryset.count()
        successful_count = successful_transactions.count()
        failed_count = failed_transactions.count()
        successful_amount = successful_transactions.aggregate(total=Sum('total_amount'))['total'] or 0

        orders_list = [
            enrich_order_row(dict(row))
            for row in queryset.values(
                'id', 'order_number', 'total_amount', 'status',
                'payment_status', 'transaction_id', 'gateway_name',
                'payment_method', 'created_at', 'updated_at',
            )
        ]

        range_meta = enrich_range_meta(
            start_dt,
            (end_dt - timedelta(minutes=1)) if (end_dt and end_time is not None) else end_dt,
            start_date=start_date if isinstance(start_date, date) else None,
            end_date=end_date if isinstance(end_date, date) else None,
        )

        return {
            'total_sales': total_amount,
            'paid_orders': successful_order_count,
            'total_orders': total_orders,
            'average_order_value': round(average_order_value, 2),
            'total_transactions': total_transactions,
            'successful_transactions': successful_count,
            'failed_transactions': failed_count,
            'successful_amount': successful_amount,
            'orders': orders_list,
            'start_date': start_dt.isoformat() if start_dt else None,
            'end_date': end_dt.isoformat() if end_dt else None,
            **range_meta,
            **_breakdowns(queryset),
        }

    @staticmethod
    def get_product_report(
        start_date=None,
        end_date=None,
        *,
        start_time=None,
        end_time=None,
        start_dt: datetime | None = None,
        end_dt: datetime | None = None,
    ):
        if start_dt is None and start_date is not None:
            if isinstance(start_date, datetime):
                start_dt = start_date if timezone.is_aware(start_date) else timezone.make_aware(start_date)
                start_date = None
            else:
                start_dt, _ = resolve_sales_datetime_range(
                    start_date=start_date,
                    start_time=start_time,
                )
        if end_dt is None and end_date is not None:
            if isinstance(end_date, datetime):
                end_dt = end_date if timezone.is_aware(end_date) else timezone.make_aware(end_date)
                end_date = None
            else:
                _, end_dt = resolve_sales_datetime_range(
                    end_date=end_date,
                    end_time=end_time,
                )

        # Revenue / sold qty: order.status paid|completed only (not payment_status).
        sold_filter = Q(orderitem__order__status__in=SALES_COUNTED_ORDER_STATUSES)
        if start_dt:
            sold_filter &= Q(orderitem__order__created_at__gte=start_dt)
        if end_dt:
            sold_filter &= Q(orderitem__order__created_at__lt=end_dt)

        products = Product.objects.annotate(
            total_sold=Sum('orderitem__quantity', filter=sold_filter),
        ).annotate(
            total_revenue=Sum(
                F('orderitem__quantity') * F('orderitem__unit_price'),
                filter=sold_filter,
            ),
        )

        products_list = list(products.values(
            'id', 'name', 'description', 'price', 'stock_quantity', 'is_active',
            'category__name', 'total_sold', 'total_revenue',
        ))

        for product in products_list:
            product['category_name'] = product.pop('category__name', '')
            product['total_sold'] = int(product.get('total_sold') or 0)
            product['total_revenue'] = int(product.get('total_revenue') or 0)
            qty = product.get('stock_quantity') or 0
            product['is_low_stock'] = 0 < qty <= LOW_STOCK_THRESHOLD
            product['is_out_of_stock'] = qty <= 0
            product['stock_status'] = (
                'out_of_stock' if product['is_out_of_stock']
                else 'low_stock' if product['is_low_stock']
                else 'ok'
            )

        total_products = Product.objects.count()
        active_products = Product.objects.filter(is_active=True).count()
        low_stock_count = sum(1 for p in products_list if p.get('is_low_stock'))
        out_of_stock_count = sum(1 for p in products_list if p.get('is_out_of_stock'))
        total_revenue = sum(p.get('total_revenue') or 0 for p in products_list)
        total_sold_units = sum(p.get('total_sold') or 0 for p in products_list)

        range_meta = enrich_range_meta(
            start_dt,
            (end_dt - timedelta(minutes=1)) if (end_dt and end_time is not None) else end_dt,
            start_date=start_date if isinstance(start_date, date) else None,
            end_date=end_date if isinstance(end_date, date) else None,
        )

        return {
            'total_products': total_products,
            'active_products': active_products,
            'low_stock_count': low_stock_count,
            'out_of_stock_count': out_of_stock_count,
            'total_revenue': total_revenue,
            'total_sold_units': total_sold_units,
            'products': products_list,
            'start_date': start_dt.isoformat() if start_dt else None,
            'end_date': end_dt.isoformat() if end_dt else None,
            'low_stock_threshold': LOW_STOCK_THRESHOLD,
            'generated_at_jalali': format_jalali_datetime(timezone.now()),
            **range_meta,
        }

    @staticmethod
    def get_stock_report():
        products = Product.objects.select_related('category').all()

        stock_aggregate = products.aggregate(
            total_stock_value=Sum(F('stock_quantity') * F('price')),
            total_items=Sum('stock_quantity'),
        )

        total_stock_value = stock_aggregate['total_stock_value'] or 0
        total_items = stock_aggregate['total_items'] or 0

        stock_details = []
        low_stock_count = 0
        out_of_stock_count = 0
        for product in products:
            stock_value = product.stock_quantity * product.price
            is_out = product.stock_quantity <= 0
            is_low = 0 < product.stock_quantity <= LOW_STOCK_THRESHOLD
            if is_low:
                low_stock_count += 1
            if is_out:
                out_of_stock_count += 1

            stock_details.append({
                'id': product.id,
                'name': product.name,
                'category_name': product.category.name if product.category else '',
                'stock_quantity': product.stock_quantity,
                'price': product.price,
                'stock_value': stock_value,
                'is_active': product.is_active,
                'is_low_stock': is_low,
                'is_out_of_stock': is_out,
                'stock_status': (
                    'out_of_stock' if is_out else 'low_stock' if is_low else 'ok'
                ),
            })

        return {
            'total_stock_value': total_stock_value,
            'total_items': total_items,
            'low_stock_count': low_stock_count,
            'out_of_stock_count': out_of_stock_count,
            'low_stock_threshold': LOW_STOCK_THRESHOLD,
            'stock_details': stock_details,
            'generated_at_jalali': format_jalali_datetime(timezone.now()),
        }

    @staticmethod
    def get_daily_report(date=None, business_day_start_hour=None, business_day_start_minute=None):
        hour, minute = ReportSelector._resolve_business_start(
            business_day_start_hour,
            business_day_start_minute,
        )
        date, start, end = ReportSelector._get_business_day_range(
            date=date,
            business_day_start_hour=hour,
            business_day_start_minute=minute,
        )

        orders = ReportSelector._orders_in_range(start, end)
        successful_orders = orders.filter(status__in=SALES_COUNTED_ORDER_STATUSES)
        transactions = orders.exclude(Q(transaction_id__isnull=True) | Q(transaction_id=''))

        paid_count = successful_orders.count()
        total_sales = successful_orders.aggregate(total=Sum('total_amount'))['total'] or 0
        total_orders = orders.count()

        orders_list = [
            enrich_order_row(dict(row))
            for row in orders.values(
                'id', 'order_number', 'total_amount', 'status',
                'payment_status', 'created_at',
            )
        ]

        range_meta = enrich_range_meta(start, end, start_date=date)

        return {
            'date': date.isoformat(),
            'date_jalali': format_jalali_date(date),
            'business_day_start_hour': hour,
            'business_day_start_minute': minute,
            'business_day_start_time': format_business_day_start(hour, minute),
            'business_day_end_hour': hour,
            'business_day_end_minute': minute,
            'range_start': start.isoformat(),
            'range_end': end.isoformat(),
            'total_orders': total_orders,
            'paid_orders': paid_count,
            'total_sales': total_sales,
            'average_order_value': round(total_sales / paid_count, 2) if paid_count else 0,
            'total_transactions': transactions.count(),
            'orders': orders_list,
            **range_meta,
            **_breakdowns(orders),
            'top_products': _top_products(start, end, limit=8),
        }

    @staticmethod
    def get_hourly_report(date=None, business_day_start_hour=None, business_day_start_minute=None):
        hour, minute = ReportSelector._resolve_business_start(
            business_day_start_hour,
            business_day_start_minute,
        )
        date, start, end = ReportSelector._get_business_day_range(
            date=date,
            business_day_start_hour=hour,
            business_day_start_minute=minute,
        )

        orders = ReportSelector._orders_in_range(start, end)
        successful_orders = orders.filter(status__in=SALES_COUNTED_ORDER_STATUSES)
        failed_orders = orders.filter(payment_status='failed')
        transactions = orders.exclude(Q(transaction_id__isnull=True) | Q(transaction_id=''))

        hourly_rows = []
        for hour_index in range(24):
            bucket_start = start + timedelta(hours=hour_index)
            bucket_end = bucket_start + timedelta(hours=1)
            bucket_orders = orders.filter(created_at__gte=bucket_start, created_at__lt=bucket_end)
            bucket_successful = successful_orders.filter(
                created_at__gte=bucket_start,
                created_at__lt=bucket_end,
            )
            bucket_failed = failed_orders.filter(
                created_at__gte=bucket_start,
                created_at__lt=bucket_end,
            )
            bucket_transactions = transactions.filter(
                created_at__gte=bucket_start,
                created_at__lt=bucket_end,
            )

            hourly_rows.append({
                'hour_label': format_jalali_time(bucket_start),
                'hour_start': bucket_start.isoformat(),
                'hour_end': bucket_end.isoformat(),
                'hour_start_jalali': format_jalali_datetime(bucket_start),
                'hour_end_jalali': format_jalali_datetime(bucket_end),
                'total_orders': bucket_orders.count(),
                'successful_orders': bucket_successful.count(),
                'failed_orders': bucket_failed.count(),
                'total_transactions': bucket_transactions.count(),
                'total_sales': bucket_successful.aggregate(total=Sum('total_amount'))['total'] or 0,
            })

        paid_count = successful_orders.count()
        total_sales = successful_orders.aggregate(total=Sum('total_amount'))['total'] or 0
        range_meta = enrich_range_meta(start, end, start_date=date)

        return {
            'date': date.isoformat(),
            'date_jalali': format_jalali_date(date),
            'business_day_start_hour': hour,
            'business_day_start_minute': minute,
            'business_day_start_time': format_business_day_start(hour, minute),
            'business_day_end_hour': hour,
            'business_day_end_minute': minute,
            'range_start': start.isoformat(),
            'range_end': end.isoformat(),
            'total_orders': orders.count(),
            'paid_orders': paid_count,
            'successful_orders': paid_count,
            'failed_orders': failed_orders.count(),
            'total_transactions': transactions.count(),
            'total_sales': total_sales,
            'average_order_value': round(total_sales / paid_count, 2) if paid_count else 0,
            'hours': hourly_rows,
            **range_meta,
        }

    @staticmethod
    def get_exception_report(business_day_start_hour=None, business_day_start_minute=None):
        hour, minute = ReportSelector._resolve_business_start(
            business_day_start_hour,
            business_day_start_minute,
        )
        now = timezone.now()
        anchor, start, end = ReportSelector._get_business_day_range(
            business_day_start_hour=hour,
            business_day_start_minute=minute,
        )
        qs = ReportSelector._orders_in_range(start, end)

        failed = qs.filter(payment_status='failed').order_by('-created_at')
        stuck = qs.filter(
            status__in=['pending', 'processing'],
            created_at__lte=now - timedelta(minutes=STUCK_ORDER_MINUTES),
        ).order_by('-created_at')
        low_stock = Product.objects.filter(
            stock_quantity__lte=LOW_STOCK_THRESHOLD,
        ).order_by('stock_quantity', 'name')
        inactive_with_stock = Product.objects.filter(
            is_active=False,
            stock_quantity__gt=0,
        ).count()

        failed_amount = int(failed.aggregate(t=Sum('total_amount'))['t'] or 0)
        range_meta = enrich_range_meta(start, end, start_date=anchor)

        def _serialize_order(order: Order) -> Dict[str, Any]:
            return {
                'id': order.id,
                'order_number': order.order_number,
                'total_amount': order.total_amount,
                'status': order.status,
                'payment_status': order.payment_status,
                'error_message': (order.error_message or '')[:200],
                'created_at': order.created_at.isoformat() if order.created_at else None,
                'created_at_jalali': format_jalali_datetime(order.created_at),
            }

        def _serialize_product(product: Product) -> Dict[str, Any]:
            return {
                'id': product.id,
                'name': product.name,
                'stock_quantity': product.stock_quantity,
                'is_active': product.is_active,
            }

        return {
            'date': anchor.isoformat(),
            'date_jalali': format_jalali_date(anchor),
            'business_day_start_hour': hour,
            'business_day_start_minute': minute,
            'business_day_start_time': format_business_day_start(hour, minute),
            'range_start': start.isoformat(),
            'range_end': end.isoformat(),
            'failed_payments_count': failed.count(),
            'failed_payments_amount': failed_amount,
            'stuck_orders_count': stuck.count(),
            'low_stock_count': low_stock.count(),
            'inactive_with_stock_count': inactive_with_stock,
            'failed_orders': [_serialize_order(o) for o in failed[:20]],
            'stuck_orders': [_serialize_order(o) for o in stuck[:20]],
            'low_stock_products': [_serialize_product(p) for p in low_stock[:20]],
            **range_meta,
            'generated_at_jalali': format_jalali_datetime(now),
        }


def _top_products(start, end, limit: int = 8) -> List[Dict[str, Any]]:
    qs = (
        OrderItem.objects.filter(
            order__created_at__gte=start,
            order__created_at__lt=end,
            order__status__in=SALES_COUNTED_ORDER_STATUSES,
        )
        .values('product_id', 'product_name')
        .annotate(
            qty=Sum('quantity'),
            revenue=Sum(F('quantity') * F('unit_price')),
        )
        .order_by('-qty')[:limit]
    )
    return list(qs)


def _breakdowns(queryset) -> Dict[str, Any]:
    order_status = {
        row['status']: row['c']
        for row in queryset.values('status').annotate(c=Count('id'))
    }
    payment_status = {
        row['payment_status']: row['c']
        for row in queryset.values('payment_status').annotate(c=Count('id'))
    }
    breakdown: Dict[str, Any] = {
        'order_status_breakdown': order_status,
        'payment_status_breakdown': payment_status,
    }

    if hasattr(Order, 'fulfillment_type'):
        breakdown['fulfillment_breakdown'] = {
            (row['fulfillment_type'] or 'dine_in'): row['c']
            for row in queryset.values('fulfillment_type').annotate(c=Count('id'))
        }

    paid_qs = queryset.filter(status__in=SALES_COUNTED_ORDER_STATUSES)
    if hasattr(Order, 'service_fee'):
        breakdown['total_service_fee'] = int(
            paid_qs.aggregate(t=Sum('service_fee'))['t'] or 0
        )
    if hasattr(Order, 'packaging_fee'):
        breakdown['total_packaging_fee'] = int(
            paid_qs.aggregate(t=Sum('packaging_fee'))['t'] or 0
        )
    if hasattr(Order, 'discount_amount'):
        breakdown['total_discount'] = int(
            paid_qs.aggregate(t=Sum('discount_amount'))['t'] or 0
        )
    if hasattr(Order, 'coupon_id'):
        breakdown['coupon_usage_count'] = paid_qs.filter(coupon_id__isnull=False).count()

    gateway_rows = (
        queryset.exclude(Q(gateway_name__isnull=True) | Q(gateway_name=''))
        .values('gateway_name')
        .annotate(count=Count('id'), amount=Sum('total_amount'))
        .order_by('-count')[:5]
    )
    breakdown['gateway_breakdown'] = list(gateway_rows)
    return breakdown
