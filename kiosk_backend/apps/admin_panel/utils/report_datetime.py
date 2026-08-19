"""Jalali date/time formatting for reports (Asia/Tehran)."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Any, Dict, Optional, Tuple

from django.utils import timezone


def tehran_day_start(value: date) -> datetime:
    """Start of calendar day in current timezone (Asia/Tehran)."""
    naive = datetime.combine(value, time.min)
    return timezone.make_aware(naive, timezone.get_current_timezone())


def tehran_day_end_exclusive(value: date) -> datetime:
    """Exclusive end boundary: midnight after the given calendar day."""
    return tehran_day_start(value) + timedelta(days=1)


def resolve_sales_datetime_range(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> Tuple[Optional[datetime], Optional[datetime]]:
    """
    Convert inclusive calendar dates to aware datetimes in local TZ.
    Filter with created_at__gte start and created_at__lt end_exclusive.
    """
    start_dt = tehran_day_start(start_date) if start_date else None
    end_dt = tehran_day_end_exclusive(end_date) if end_date else None
    return start_dt, end_dt


def resolve_sales_preset_range(
    preset: str,
    business_day_start_hour: int | None = None,
    business_day_start_minute: int | None = None,
) -> Tuple[datetime, datetime, date, date]:
    """Business-day-aligned preset windows in local timezone."""
    from apps.admin_panel.selectors.report_selector import ReportSelector
    from apps.admin_panel.utils.report_constants import get_business_day_start

    if business_day_start_hour is None and business_day_start_minute is None:
        hour, minute = get_business_day_start()
    else:
        default_hour, default_minute = get_business_day_start()
        hour = default_hour if business_day_start_hour is None else max(0, min(23, int(business_day_start_hour)))
        minute = default_minute if business_day_start_minute is None else max(0, min(59, int(business_day_start_minute)))
    today = timezone.localdate()
    preset = (preset or '').strip().lower()

    if preset == 'today':
        anchor = today
        _, start, end = ReportSelector._get_business_day_range(
            date=anchor,
            business_day_start_hour=hour,
            business_day_start_minute=minute,
        )
        return start, end, anchor, anchor

    if preset == 'yesterday':
        anchor = today - timedelta(days=1)
        _, start, end = ReportSelector._get_business_day_range(
            date=anchor,
            business_day_start_hour=hour,
            business_day_start_minute=minute,
        )
        return start, end, anchor, anchor

    days_back = 6 if preset == '7d' else 29 if preset == '30d' else 0
    start_anchor = today - timedelta(days=days_back)
    end_anchor = today
    _, start, _ = ReportSelector._get_business_day_range(
        date=start_anchor,
        business_day_start_hour=hour,
        business_day_start_minute=minute,
    )
    _, _, end = ReportSelector._get_business_day_range(
        date=end_anchor,
        business_day_start_hour=hour,
        business_day_start_minute=minute,
    )
    return start, end, start_anchor, end_anchor


def to_local(value: datetime | None) -> datetime | None:
    if not value:
        return None
    if timezone.is_naive(value):
        value = timezone.make_aware(value, timezone.get_current_timezone())
    return timezone.localtime(value)


def format_jalali_date(value: date | datetime | None = None) -> str:
    if value is None:
        value = timezone.localdate()
    try:
        import jdatetime

        if isinstance(value, datetime):
            value = to_local(value).date()
        return jdatetime.date.fromgregorian(date=value).strftime('%Y/%m/%d')
    except Exception:
        if isinstance(value, datetime):
            return value.date().isoformat()
        return value.isoformat()


def format_jalali_datetime(value: datetime | None) -> str:
    if not value:
        return '—'
    local = to_local(value)
    try:
        import jdatetime

        jdt = jdatetime.datetime.fromgregorian(datetime=local)
        return jdt.strftime('%Y/%m/%d %H:%M:%S')
    except Exception:
        return local.strftime('%Y-%m-%d %H:%M:%S')


def format_jalali_time(value: datetime | None) -> str:
    if not value:
        return '—'
    local = to_local(value)
    try:
        import jdatetime

        jdt = jdatetime.datetime.fromgregorian(datetime=local)
        return jdt.strftime('%H:%M')
    except Exception:
        return local.strftime('%H:%M')


def enrich_order_row(row: Dict[str, Any]) -> Dict[str, Any]:
    for field, jalali_field in (
        ('created_at', 'created_at_jalali'),
        ('updated_at', 'updated_at_jalali'),
    ):
        value = row.get(field)
        if not value or row.get(jalali_field):
            continue
        if isinstance(value, str):
            try:
                value = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                continue
        if isinstance(value, datetime):
            row[jalali_field] = format_jalali_datetime(value)
    return row


def enrich_range_meta(
    start: datetime | None,
    end: datetime | None,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> Dict[str, str]:
    meta: Dict[str, str] = {}
    if start:
        meta['range_start_jalali'] = format_jalali_datetime(start)
    if end:
        meta['range_end_jalali'] = format_jalali_datetime(end)
    if start_date:
        meta['start_date_jalali'] = format_jalali_date(start_date)
    if end_date:
        meta['end_date_jalali'] = format_jalali_date(end_date)
    return meta
