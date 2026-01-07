from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.orders.models import Order, OrderItem


class AdminOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True, label=_('نام محصول'))
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'quantity',
            'unit_price', 'subtotal'
        ]
        read_only_fields = ['id', 'subtotal']


class AdminOrderSerializer(serializers.ModelSerializer):
    items = AdminOrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'session_key', 'status',
            'payment_status', 'total_amount', 'transaction_id',
            'items', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'session_key', 'total_amount',
            'transaction_id', 'items', 'created_at', 'updated_at'
        ]


class AdminOrderListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'payment_status',
            'total_amount', 'created_at'
        ]
        read_only_fields = ['id', 'order_number', 'total_amount', 'created_at']


class UpdateOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES, label=_('وضعیت'))

