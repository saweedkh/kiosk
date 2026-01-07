from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.orders.models import Invoice


class InvoiceSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True, label=_('شماره سفارش'))
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'order', 'order_number',
            'pdf_file', 'json_data', 'created_at'
        ]
        read_only_fields = ['id', 'invoice_number', 'pdf_file', 'json_data', 'created_at']


class InvoiceJSONResponseSerializer(serializers.Serializer):
    """Serializer for invoice JSON download response."""
    # This will be a dynamic JSON structure, so we use JSONField
    data = serializers.JSONField(help_text=_('Invoice JSON data'))

