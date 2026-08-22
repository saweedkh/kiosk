from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.orders.models import Order, OrderItem


class AdminOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField(label=_('نام محصول'))
    subtotal = serializers.IntegerField(read_only=True, label=_('جمع'))

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'quantity',
            'unit_price', 'subtotal', 'selected_options',
        ]
        read_only_fields = [
            'id', 'subtotal', 'product_name', 'selected_options',
        ]

    def get_product_name(self, obj):
        if obj.product_id and obj.product:
            return obj.product.name
        return obj.product_name or _('محصول حذف‌شده')


class AdminOrderSerializer(serializers.ModelSerializer):
    items = AdminOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'session_key', 'status',
            'payment_status', 'total_amount', 'service_fee', 'packaging_fee',
            'discount_amount', 'coupon_code', 'receipt_number',
            'transaction_id', 'payment_method', 'gateway_name',
            'fulfillment_type', 'items', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'order_number', 'session_key', 'total_amount',
            'service_fee', 'packaging_fee', 'discount_amount', 'coupon_code',
            'receipt_number', 'transaction_id', 'payment_method', 'gateway_name',
            'fulfillment_type', 'items', 'created_at', 'updated_at',
        ]


class AdminOrderListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'payment_status',
            'total_amount', 'fulfillment_type', 'created_at'
        ]
        read_only_fields = ['id', 'order_number', 'total_amount', 'fulfillment_type', 'created_at']


class UpdateOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES, label=_('وضعیت'))


PAYMENT_STATUS_CHOICES = [
    ('pending', _('در انتظار')),
    ('processing', _('در حال پردازش')),
    ('paid', _('پرداخت شده')),
    ('failed', _('ناموفق')),
    ('cancelled', _('لغو شده')),
]


class UpdatePaymentStatusSerializer(serializers.Serializer):
    payment_status = serializers.ChoiceField(
        choices=PAYMENT_STATUS_CHOICES,
        label=_('وضعیت پرداخت'),
    )
