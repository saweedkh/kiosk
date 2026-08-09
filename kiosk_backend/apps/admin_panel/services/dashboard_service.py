from typing import Any, Dict, List
from datetime import datetime, time, timedelta

from django.db.models import Sum, Count, Avg, F, ExpressionWrapper, IntegerField
from django.db.models.functions import ExtractHour, TruncDate
from django.utils import timezone

from apps.orders.models import Order, OrderItem


class DashboardService:
    """Operational dashboard metrics for the kiosk admin."""

    @staticmethod
    def _day_range(day):
        start = timezone.make_aware(datetime.combine(day, time.min))
        end = timezone.make_aware(datetime.combine(day, time.max))
        return start, end

    @staticmethod
    def _paid_agg(qs):
        agg = qs.filter(payment_status='paid').aggregate(
            sales=Sum('total_amount'),
            orders=Count('id'),
            avg_basket=Avg('total_amount'),
        )
        return {
            'sales': int(agg['sales'] or 0),
            'orders': int(agg['orders'] or 0),
            'avg_basket': int(round(agg['avg_basket'] or 0)),
        }

    @staticmethod
    def get_live_metrics() -> Dict[str, Any]:
        today = timezone.localdate()
        yesterday = today - timedelta(days=1)
        start, end = DashboardService._day_range(today)
        y_start, y_end = DashboardService._day_range(yesterday)

        qs = Order.objects.filter(created_at__gte=start, created_at__lte=end)
        y_qs = Order.objects.filter(created_at__gte=y_start, created_at__lte=y_end)

        paid = DashboardService._paid_agg(qs)
        y_paid = DashboardService._paid_agg(y_qs)

        total_attempts = qs.count()
        cancelled = qs.filter(payment_status__in=['cancelled', 'failed']).count()
        cancel_rate = round((cancelled / total_attempts) * 100, 1) if total_attempts else 0.0

        fulfillment = (
            qs.filter(payment_status='paid')
            .values('fulfillment_type')
            .annotate(count=Count('id'))
        )
        by_fulfillment = {row['fulfillment_type']: int(row['count']) for row in fulfillment}

        def delta_pct(current: int, previous: int):
            if previous <= 0:
                return None if current <= 0 else 100.0
            return round(((current - previous) / previous) * 100, 1)

        return {
            'date': today.isoformat(),
            'sales_today': paid['sales'],
            'orders_today': paid['orders'],
            'avg_basket': paid['avg_basket'],
            'payment_attempts': total_attempts,
            'cancelled_payments': cancelled,
            'cancel_rate': cancel_rate,
            'pending_payments': qs.filter(payment_status='pending').count(),
            'sales_yesterday': y_paid['sales'],
            'orders_yesterday': y_paid['orders'],
            'sales_delta_pct': delta_pct(paid['sales'], y_paid['sales']),
            'orders_delta_pct': delta_pct(paid['orders'], y_paid['orders']),
            'dine_in_orders': by_fulfillment.get('dine_in', 0),
            'takeaway_orders': by_fulfillment.get('takeaway', 0),
        }

    @staticmethod
    def get_hourly_heatmap(days: int = 7) -> Dict[str, Any]:
        days = max(1, min(int(days or 7), 30))
        since = timezone.now() - timedelta(days=days)
        rows = (
            Order.objects.filter(
                created_at__gte=since,
                payment_status='paid',
            )
            .annotate(hour=ExtractHour('created_at'))
            .values('hour')
            .annotate(
                orders=Count('id'),
                sales=Sum('total_amount'),
            )
            .order_by('hour')
        )
        by_hour = {int(r['hour']): r for r in rows}
        hours: List[Dict[str, Any]] = []
        max_orders = 0
        for h in range(24):
            row = by_hour.get(h)
            orders = int(row['orders']) if row else 0
            sales = int(row['sales'] or 0) if row else 0
            max_orders = max(max_orders, orders)
            hours.append({'hour': h, 'orders': orders, 'sales': sales})

        for cell in hours:
            cell['intensity'] = round(cell['orders'] / max_orders, 3) if max_orders else 0.0

        return {
            'days': days,
            'max_orders': max_orders,
            'hours': hours,
        }

    @staticmethod
    def get_top_products(limit: int = 5) -> List[Dict[str, Any]]:
        start, end = DashboardService._day_range(timezone.localdate())
        line_total = ExpressionWrapper(
            F('unit_price') * F('quantity'),
            output_field=IntegerField(),
        )
        rows = (
            OrderItem.objects.filter(
                order__created_at__gte=start,
                order__created_at__lte=end,
                order__payment_status='paid',
            )
            .values('product_id', 'product_name')
            .annotate(
                qty=Sum('quantity'),
                revenue=Sum(line_total),
            )
            .order_by('-qty')[: max(1, min(int(limit or 5), 10))]
        )
        return [
            {
                'product_id': row['product_id'],
                'name': row['product_name'] or '—',
                'quantity': int(row['qty'] or 0),
                'revenue': int(row['revenue'] or 0),
            }
            for row in rows
        ]

    @staticmethod
    def get_recent_orders(limit: int = 8) -> List[Dict[str, Any]]:
        start, end = DashboardService._day_range(timezone.localdate())
        orders = (
            Order.objects.filter(created_at__gte=start, created_at__lte=end)
            .order_by('-created_at')[: max(1, min(int(limit or 8), 20))]
        )
        out = []
        for o in orders:
            out.append({
                'id': o.id,
                'order_number': o.order_number,
                'total_amount': int(o.total_amount or 0),
                'payment_status': o.payment_status,
                'fulfillment_type': o.fulfillment_type,
                'created_at': timezone.localtime(o.created_at).isoformat(),
            })
        return out

    @staticmethod
    def get_sales_trend(days: int = 7) -> Dict[str, Any]:
        days = max(1, min(int(days or 7), 30))
        since_date = timezone.localdate() - timedelta(days=days - 1)
        start = timezone.make_aware(datetime.combine(since_date, time.min))
        rows = (
            Order.objects.filter(
                created_at__gte=start,
                payment_status='paid',
            )
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(
                sales=Sum('total_amount'),
                orders=Count('id'),
            )
            .order_by('day')
        )
        by_day = {r['day']: r for r in rows}
        points = []
        for i in range(days):
            d = since_date + timedelta(days=i)
            row = by_day.get(d)
            points.append({
                'date': d.isoformat(),
                'sales': int(row['sales'] or 0) if row else 0,
                'orders': int(row['orders'] or 0) if row else 0,
            })
        return {'days': days, 'points': points}
