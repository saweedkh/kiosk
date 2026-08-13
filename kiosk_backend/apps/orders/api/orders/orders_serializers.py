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
            'quantity', 'unit_price', 'subtotal', 'selected_options',
        ]
        read_only_fields = ['id', 'subtotal', 'product_name', 'product_price', 'selected_options']
    
    def get_product_name(self, obj):
        if obj.product:
            return obj.product.name
        return obj.product_name or _('محصول حذف شده')
    
    def get_product_price(self, obj):
        if obj.product:
            return obj.product.price
        return None


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'session_key', 'status',
            'payment_status', 'total_amount', 'service_fee', 'packaging_fee',
            'discount_amount',
            'coupon_code', 'landing_theme', 'fulfillment_type', 'items',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'session_key', 'status',
            'payment_status', 'total_amount', 'service_fee', 'packaging_fee',
            'discount_amount',
            'coupon_code', 'landing_theme', 'fulfillment_type',
            'created_at', 'updated_at'
        ]


class OrderItemCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(label=_('شناسه محصول'))
    quantity = serializers.IntegerField(min_value=1, label=_('تعداد'))
    option_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        default=list,
        label=_('شناسه آپشن‌ها'),
    )


class OrderCreateSerializer(serializers.Serializer):
    items = OrderItemCreateSerializer(many=True, label=_('آیتم‌های سفارش'))
    fulfillment_type = serializers.ChoiceField(
        choices=['dine_in', 'takeaway'],
        default='dine_in',
        label=_('نوع سفارش'),
        help_text=_('dine_in = داخل سالن، takeaway = بیرون‌بر'),
    )
    coupon_code = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=40,
        label=_('کد تخفیف'),
    )
    landing_theme = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=20,
        label=_('تم لندینگ'),
    )
    
    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError(_('لیست آیتم‌های سفارش نمی‌تواند خالی باشد.'))
        return value
