from typing import Any, Dict, List
from datetime import datetime, time, timedelta

from django.db.models import Sum, Count, Avg
from django.db.models.functions import ExtractHour
from django.utils import timezone

from apps.orders.models import Order
from apps.core.models import LandingEvent, SiteSettings


class DashboardService:
    """Live dashboard metrics, hourly heatmap, and landing A/B stats."""

    @staticmethod
    def _today_range():
        today = timezone.localdate()
        start = timezone.make_aware(datetime.combine(today, time.min))
        end = timezone.make_aware(datetime.combine(today, time.max))
        return start, end

    @staticmethod
    def get_live_metrics() -> Dict[str, Any]:
        start, end = DashboardService._today_range()
        qs = Order.objects.filter(created_at__gte=start, created_at__lte=end)

        paid = qs.filter(payment_status='paid')
        paid_agg = paid.aggregate(
            sales=Sum('total_amount'),
            orders=Count('id'),
            avg_basket=Avg('total_amount'),
        )
        total_attempts = qs.count()
        cancelled = qs.filter(payment_status__in=['cancelled', 'failed']).count()
        cancel_rate = round((cancelled / total_attempts) * 100, 1) if total_attempts else 0.0

        return {
            'date': timezone.localdate().isoformat(),
            'sales_today': int(paid_agg['sales'] or 0),
            'orders_today': int(paid_agg['orders'] or 0),
            'avg_basket': int(round(paid_agg['avg_basket'] or 0)),
            'payment_attempts': total_attempts,
            'cancelled_payments': cancelled,
            'cancel_rate': cancel_rate,
            'pending_payments': qs.filter(payment_status='pending').count(),
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
    def get_landing_ab_stats(days: int = 7) -> Dict[str, Any]:
        days = max(1, min(int(days or 7), 90))
        since = timezone.now() - timedelta(days=days)
        settings_obj = SiteSettings.get_settings()
        themes = sorted({
            settings_obj.landing_theme or 'cinema',
            settings_obj.landing_theme_b or 'neon',
        })

        events = (
            LandingEvent.objects.filter(created_at__gte=since)
            .values('theme', 'event_type')
            .annotate(count=Count('id'))
        )
        bucket: Dict[str, Dict[str, int]] = {}
        for row in events:
            theme = row['theme'] or 'unknown'
            bucket.setdefault(theme, {'impression': 0, 'start': 0})
            if row['event_type'] in ('impression', 'start'):
                bucket[theme][row['event_type']] = int(row['count'])

        for t in themes:
            bucket.setdefault(t, {'impression': 0, 'start': 0})

        results = []
        for theme, counts in sorted(bucket.items()):
            impressions = counts['impression']
            starts = counts['start']
            rate = round((starts / impressions) * 100, 1) if impressions else 0.0
            results.append({
                'theme': theme,
                'impressions': impressions,
                'starts': starts,
                'start_rate': rate,
            })

        return {
            'days': days,
            'ab_enabled': bool(settings_obj.landing_ab_enabled),
            'theme_a': settings_obj.landing_theme,
            'theme_b': settings_obj.landing_theme_b,
            'split_a_percent': int(settings_obj.landing_ab_split or 50),
            'variants': results,
        }
