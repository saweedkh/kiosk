from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.orders.models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField(label=_('نام محصول'))
    product_price = serializers.SerializerMethodField(label=_('قیمت محصول'))
    subtotal = serializers.IntegerField(read_only=True, label=_('جمع'))
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_price',
            'quantity', 'unit_price', 'subtotal'
        ]
        read_only_fields = ['id', 'subtotal', 'product_name', 'product_price']
    
    def get_product_name(self, obj):
        """Return product name from product if exists, otherwise from product_name backup."""
        if obj.product:
            return obj.product.name
        return obj.product_name or _('محصول حذف شده')
    
    def get_product_price(self, obj):
        """Return product price from product if exists, otherwise None."""
        if obj.product:
            return obj.product.price
        return None


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'session_key', 'status',
            'payment_status', 'total_amount', 'service_fee', 'fulfillment_type', 'items',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'session_key', 'status',
            'payment_status', 'total_amount', 'service_fee', 'fulfillment_type',
            'created_at', 'updated_at'
        ]


class OrderItemCreateSerializer(serializers.Serializer):
    """Serializer for order item creation."""
    product_id = serializers.IntegerField(label=_('شناسه محصول'))
    quantity = serializers.IntegerField(min_value=1, label=_('تعداد'))


class OrderCreateSerializer(serializers.Serializer):
    """Serializer for order creation from frontend."""
    items = OrderItemCreateSerializer(many=True, label=_('آیتم‌های سفارش'))
    fulfillment_type = serializers.ChoiceField(
        choices=['dine_in', 'takeaway'],
        default='dine_in',
        label=_('نوع سفارش'),
        help_text=_('dine_in = داخل سالن، takeaway = بیرون‌بر'),
    )
    
    def validate_items(self, value):
        """Validate that items list is not empty."""
        if not value:
            raise serializers.ValidationError(_('لیست آیتم‌های سفارش نمی‌تواند خالی باشد.'))
        return value

