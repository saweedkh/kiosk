"""Shared report configuration (admin panel + Bale bot)."""

DEFAULT_BUSINESS_DAY_START_HOUR = 7
DEFAULT_BUSINESS_DAY_START_MINUTE = 0
LOW_STOCK_THRESHOLD = 5
STUCK_ORDER_MINUTES = 15

SALES_PRESET_CHOICES = (
    ('today', 'امروز'),
    ('yesterday', 'دیروز'),
    ('7d', '۷ روز اخیر'),
    ('30d', '۳۰ روز اخیر'),
)

# Sales totals use order.status (not payment_status).
# completed is included because those orders were paid and then fulfilled.
SALES_COUNTED_ORDER_STATUSES = ('paid', 'completed')
SALES_FAILED_ORDER_STATUSES = ('cancelled',)


def get_business_day_start() -> tuple[int, int]:
    """Read business-day start time from SiteSettings (fallback 07:00)."""
    try:
        from apps.core.models.settings import SiteSettings

        settings = SiteSettings.get_settings()
        hour = settings.business_day_start_hour
        minute = getattr(settings, 'business_day_start_minute', 0)
        if hour is None:
            hour = DEFAULT_BUSINESS_DAY_START_HOUR
        if minute is None:
            minute = DEFAULT_BUSINESS_DAY_START_MINUTE
        return max(0, min(23, int(hour))), max(0, min(59, int(minute)))
    except Exception:
        return DEFAULT_BUSINESS_DAY_START_HOUR, DEFAULT_BUSINESS_DAY_START_MINUTE


def get_business_day_start_hour() -> int:
    return get_business_day_start()[0]


def get_business_day_start_minute() -> int:
    return get_business_day_start()[1]


def format_business_day_start(hour: int, minute: int) -> str:
    return f'{int(hour):02d}:{int(minute):02d}'
