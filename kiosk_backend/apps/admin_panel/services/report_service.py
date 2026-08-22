from typing import Optional, Dict, Any
from datetime import datetime, date

from django.contrib.auth import get_user_model

from apps.admin_panel.selectors.report_selector import ReportSelector
from apps.admin_panel.utils.report_constants import get_business_day_start
from apps.admin_panel.utils.report_datetime import resolve_sales_preset_range
from apps.logs.services.log_service import LogService

User = get_user_model()


def _resolve_start(
    hour: int | None,
    minute: int | None,
) -> tuple[int, int]:
    if hour is None and minute is None:
        return get_business_day_start()
    default_hour, default_minute = get_business_day_start()
    resolved_hour = default_hour if hour is None else max(0, min(23, int(hour)))
    resolved_minute = default_minute if minute is None else max(0, min(59, int(minute)))
    return resolved_hour, resolved_minute


class ReportService:
    """Report generation service for admin panel."""

    @staticmethod
    def get_sales_report(
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        *,
        start_time=None,
        end_time=None,
        start_dt: Optional[datetime] = None,
        end_dt: Optional[datetime] = None,
        preset: Optional[str] = None,
        business_day_start_hour: int | None = None,
        business_day_start_minute: int | None = None,
        user: Optional[User] = None,
    ) -> Dict[str, Any]:
        if preset:
            hour, minute = _resolve_start(business_day_start_hour, business_day_start_minute)
            start_dt, end_dt, start_date, end_date = resolve_sales_preset_range(
                preset,
                business_day_start_hour=hour,
                business_day_start_minute=minute,
            )
            start_time = None
            end_time = None

        report = ReportSelector.get_sales_report(
            start_date=start_date,
            end_date=end_date,
            start_time=start_time,
            end_time=end_time,
            start_dt=start_dt,
            end_dt=end_dt,
        )
        if preset:
            report['preset'] = preset

        LogService.log_info(
            'admin',
            'sales_report_generated',
            user=user,
            details={
                'start_date': str(start_date) if start_date else None,
                'end_date': str(end_date) if end_date else None,
                'start_time': str(start_time) if start_time else None,
                'end_time': str(end_time) if end_time else None,
                'preset': preset,
            },
        )
        return report

    @staticmethod
    def get_product_report(
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        *,
        start_time=None,
        end_time=None,
        start_dt: Optional[datetime] = None,
        end_dt: Optional[datetime] = None,
        preset: Optional[str] = None,
        business_day_start_hour: int | None = None,
        business_day_start_minute: int | None = None,
        user: Optional[User] = None,
    ) -> Dict[str, Any]:
        if preset:
            hour, minute = _resolve_start(business_day_start_hour, business_day_start_minute)
            start_dt, end_dt, start_date, end_date = resolve_sales_preset_range(
                preset,
                business_day_start_hour=hour,
                business_day_start_minute=minute,
            )
            start_time = None
            end_time = None

        report = ReportSelector.get_product_report(
            start_date=start_date,
            end_date=end_date,
            start_time=start_time,
            end_time=end_time,
            start_dt=start_dt,
            end_dt=end_dt,
        )
        if preset:
            report['preset'] = preset

        LogService.log_info(
            'admin',
            'product_report_generated',
            user=user,
            details={
                'start_date': str(start_date) if start_date else None,
                'end_date': str(end_date) if end_date else None,
                'preset': preset,
            },
        )
        return report

    @staticmethod
    def get_stock_report(user: Optional[User] = None) -> Dict[str, Any]:
        report = ReportSelector.get_stock_report()
        LogService.log_info('admin', 'stock_report_generated', user=user)
        return report

    @staticmethod
    def get_daily_report(
        date: Optional[date] = None,
        business_day_start_hour: int | None = None,
        business_day_start_minute: int | None = None,
        user: Optional[User] = None,
    ) -> Dict[str, Any]:
        report = ReportSelector.get_daily_report(
            date=date,
            business_day_start_hour=business_day_start_hour,
            business_day_start_minute=business_day_start_minute,
        )
        LogService.log_info(
            'admin',
            'daily_report_generated',
            user=user,
            details={
                'date': str(date) if date else None,
                'business_day_start_hour': business_day_start_hour,
                'business_day_start_minute': business_day_start_minute,
            },
        )
        return report

    @staticmethod
    def get_hourly_report(
        date: Optional[date] = None,
        business_day_start_hour: int | None = None,
        business_day_start_minute: int | None = None,
        user: Optional[User] = None,
    ) -> Dict[str, Any]:
        report = ReportSelector.get_hourly_report(
            date=date,
            business_day_start_hour=business_day_start_hour,
            business_day_start_minute=business_day_start_minute,
        )
        LogService.log_info(
            'admin',
            'hourly_report_generated',
            user=user,
            details={
                'date': str(date) if date else None,
                'business_day_start_hour': business_day_start_hour,
                'business_day_start_minute': business_day_start_minute,
            },
        )
        return report

    @staticmethod
    def get_exception_report(
        business_day_start_hour: int | None = None,
        business_day_start_minute: int | None = None,
        user: Optional[User] = None,
    ) -> Dict[str, Any]:
        report = ReportSelector.get_exception_report(
            business_day_start_hour=business_day_start_hour,
            business_day_start_minute=business_day_start_minute,
        )
        LogService.log_info(
            'admin',
            'exception_report_generated',
            user=user,
            details={
                'business_day_start_hour': business_day_start_hour,
                'business_day_start_minute': business_day_start_minute,
            },
        )
        return report
