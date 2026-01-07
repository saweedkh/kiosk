from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.orders.models import OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField(label=_('نام محصول'))
    product_price = serializers.SerializerMethodField(label=_('قیمت محصول'))
    subtotal = serializers.IntegerField(read_only=True, label=_('جمع'))
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'order', 'product', 'product_name', 'product_price',
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

