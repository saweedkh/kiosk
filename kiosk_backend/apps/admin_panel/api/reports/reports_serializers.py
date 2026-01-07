from rest_framework import serializers
from django.utils.translation import gettext_lazy as _


class DateRangeSerializer(serializers.Serializer):
    """Serializer for date range query parameters."""
    start_date = serializers.DateField(required=False, label=_('تاریخ شروع'))
    end_date = serializers.DateField(required=False, label=_('تاریخ پایان'))


class DailyReportSerializer(serializers.Serializer):
    """Serializer for daily report query parameters."""
    date = serializers.DateField(required=False, label=_('تاریخ'))


class SalesReportResponseSerializer(serializers.Serializer):
    """Serializer for sales report response (includes transaction statistics)."""
    total_sales = serializers.IntegerField(help_text=_('Total sales amount'))
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
    total_sales = serializers.IntegerField(help_text=_('Total sales for the day'))
    total_orders = serializers.IntegerField(help_text=_('Number of orders for the day'))
    total_transactions = serializers.IntegerField(help_text=_('Number of transactions for the day'))
    orders = serializers.ListField(child=serializers.DictField(), help_text=_('List of orders (paginated)'))

