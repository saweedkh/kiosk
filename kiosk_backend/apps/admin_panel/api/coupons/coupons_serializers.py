from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.orders.models import Coupon


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            'id',
            'code',
            'discount_type',
            'value',
            'min_order_amount',
            'max_discount_amount',
            'max_uses',
            'used_count',
            'valid_from',
            'valid_until',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'used_count', 'created_at', 'updated_at']

    def validate_code(self, value):
        code = (value or '').strip().upper()
        if not code:
            raise serializers.ValidationError(_('کد تخفیف الزامی است'))
        qs = Coupon.objects.filter(code__iexact=code)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(_('این کد قبلاً ثبت شده است'))
        return code

    def validate(self, attrs):
        discount_type = attrs.get(
            'discount_type',
            getattr(self.instance, 'discount_type', Coupon.TYPE_PERCENT),
        )
        value = attrs.get('value', getattr(self.instance, 'value', None))
        if value is not None and discount_type == Coupon.TYPE_PERCENT and value > 100:
            raise serializers.ValidationError({'value': _('درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد')})
        return attrs


class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField()
    items_total = serializers.IntegerField(min_value=0)
    service_fee = serializers.IntegerField(min_value=0, required=False, default=0)
    packaging_fee = serializers.IntegerField(min_value=0, required=False, default=0)
