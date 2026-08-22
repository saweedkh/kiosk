from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from apps.admin_panel.utils.report_constants import SALES_PRESET_CHOICES


class DateRangeSerializer(serializers.Serializer):
    """Serializer for date/time range query parameters."""
    start_date = serializers.DateField(required=False, label=_('تاریخ شروع'))
    end_date = serializers.DateField(required=False, label=_('تاریخ پایان'))
    start_time = serializers.TimeField(
        required=False,
        allow_null=True,
        input_formats=['%H:%M', '%H:%M:%S'],
        label=_('ساعت شروع'),
    )
    end_time = serializers.TimeField(
        required=False,
        allow_null=True,
        input_formats=['%H:%M', '%H:%M:%S'],
        label=_('ساعت پایان'),
    )
    preset = serializers.ChoiceField(
        required=False,
        choices=[c[0] for c in SALES_PRESET_CHOICES],
        label=_('بازه آماده'),
    )
    business_day_start_hour = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
        max_value=23,
        label=_('ساعت شروع روز کاری'),
    )
    business_day_start_minute = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
        max_value=59,
        label=_('دقیقه شروع روز کاری'),
    )

    def validate(self, attrs):
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        if start_time is not None and not attrs.get('start_date'):
            raise serializers.ValidationError({'start_date': _('برای ساعت شروع، تاریخ شروع لازم است.')})
        if end_time is not None and not attrs.get('end_date'):
            raise serializers.ValidationError({'end_date': _('برای ساعت پایان، تاریخ پایان لازم است.')})
        return attrs


class DailyReportSerializer(serializers.Serializer):
    """Serializer for daily report query parameters."""
    date = serializers.DateField(required=False, label=_('تاریخ'))
    business_day_start_hour = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
        max_value=23,
        label=_('ساعت شروع روز کاری'),
    )
    business_day_start_minute = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
        max_value=59,
        label=_('دقیقه شروع روز کاری'),
    )


class HourlyReportSerializer(serializers.Serializer):
    """Serializer for hourly report query parameters."""
    date = serializers.DateField(required=False, label=_('تاریخ'))
    business_day_start_hour = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
        max_value=23,
        label=_('ساعت شروع روز کاری'),
    )
    business_day_start_minute = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
        max_value=59,
        label=_('دقیقه شروع روز کاری'),
    )


class ExceptionReportSerializer(serializers.Serializer):
    """Serializer for exception report query parameters."""
    business_day_start_hour = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
        max_value=23,
        label=_('ساعت شروع روز کاری'),
    )
    business_day_start_minute = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
        max_value=59,
        label=_('دقیقه شروع روز کاری'),
    )


class SalesReportResponseSerializer(serializers.Serializer):
    """Serializer for sales report response (includes transaction statistics)."""
    total_sales = serializers.IntegerField(help_text=_('Total sales amount'))
    paid_orders = serializers.IntegerField(help_text=_('Paid orders count'))
    total_orders = serializers.IntegerField(help_text=_('Total number of orders'))
    average_order_value = serializers.FloatField(help_text=_('Average order value'))
    total_transactions = serializers.IntegerField(help_text=_('Total number of transactions'))
    successful_transactions = serializers.IntegerField(help_text=_('Number of successful transactions'))
    failed_transactions = serializers.IntegerField(help_text=_('Number of failed transactions'))
    successful_amount = serializers.IntegerField(help_text=_('Total successful transaction amount'))
    start_date = serializers.CharField(required=False, allow_null=True, help_text=_('Start date'))
    end_date = serializers.CharField(required=False, allow_null=True, help_text=_('End date'))
    orders = serializers.ListField(child=serializers.DictField(), help_text=_('List of orders (paginated)'))


class ProductReportResponseSerializer(serializers.Serializer):
    """Serializer for product report response."""
    total_products = serializers.IntegerField(help_text=_('Total number of products'))
    active_products = serializers.IntegerField(help_text=_('Number of active products'))
    products = serializers.ListField(child=serializers.DictField(), help_text=_('List of products (paginated)'))


class StockReportResponseSerializer(serializers.Serializer):
    """Serializer for stock report response."""
    total_stock_value = serializers.IntegerField(help_text=_('Total stock value'))
    total_items = serializers.IntegerField(help_text=_('Total number of items'))
    stock_details = serializers.ListField(child=serializers.DictField(), help_text=_('Stock details (paginated)'))


class DailyReportResponseSerializer(serializers.Serializer):
    """Serializer for daily report response."""
    date = serializers.DateField(help_text=_('Report date'))
    business_day_start_hour = serializers.IntegerField(help_text=_('Business day start hour'))
    business_day_end_hour = serializers.IntegerField(help_text=_('Business day end hour'))
    range_start = serializers.CharField(help_text=_('Business day range start'))
    range_end = serializers.CharField(help_text=_('Business day range end'))
    total_sales = serializers.IntegerField(help_text=_('Total sales for the day'))
    total_orders = serializers.IntegerField(help_text=_('Number of orders for the day'))
    total_transactions = serializers.IntegerField(help_text=_('Number of transactions for the day'))
    orders = serializers.ListField(child=serializers.DictField(), help_text=_('List of orders (paginated)'))


class HourlyReportBucketSerializer(serializers.Serializer):
    """Serializer for one hourly report bucket."""
    hour_label = serializers.CharField(help_text=_('Hour label'))
    hour_start = serializers.CharField(help_text=_('Hour range start'))
    hour_end = serializers.CharField(help_text=_('Hour range end'))
    total_orders = serializers.IntegerField(help_text=_('Number of orders in the hour'))
    successful_orders = serializers.IntegerField(help_text=_('Number of successful orders in the hour'))
    failed_orders = serializers.IntegerField(help_text=_('Number of failed payments in the hour'))
    total_transactions = serializers.IntegerField(help_text=_('Number of transactions in the hour'))
    total_sales = serializers.IntegerField(help_text=_('Successful sales amount in the hour'))


class HourlyReportResponseSerializer(serializers.Serializer):
    """Serializer for hourly report response."""
    date = serializers.DateField(help_text=_('Report date'))
    business_day_start_hour = serializers.IntegerField(help_text=_('Business day start hour'))
    business_day_end_hour = serializers.IntegerField(help_text=_('Business day end hour'))
    range_start = serializers.CharField(help_text=_('Business day range start'))
    range_end = serializers.CharField(help_text=_('Business day range end'))
    total_sales = serializers.IntegerField(help_text=_('Total successful sales for the day'))
    total_orders = serializers.IntegerField(help_text=_('Number of orders for the day'))
    successful_orders = serializers.IntegerField(help_text=_('Number of successful orders for the day'))
    total_transactions = serializers.IntegerField(help_text=_('Number of transactions for the day'))
    hours = serializers.ListField(child=serializers.DictField(), help_text=_('Hourly buckets (paginated)'))
