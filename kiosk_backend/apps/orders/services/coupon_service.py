from typing import Any, Dict, Optional
from django.db import transaction
from django.utils import timezone

from apps.orders.models import Coupon


class CouponService:
    @staticmethod
    def normalize_code(code: str) -> str:
        return (code or '').strip().upper()

    @staticmethod
    def assert_feature_enabled() -> None:
        from apps.core.models.settings import SiteSettings

        settings = SiteSettings.get_settings()
        if not getattr(settings, 'coupons_enabled', True):
            raise ValueError('امکان استفاده از کد تخفیف در حال حاضر غیرفعال است')

    @staticmethod
    def get_active_coupon(code: str) -> Coupon:
        CouponService.assert_feature_enabled()
        normalized = CouponService.normalize_code(code)
        if not normalized:
            raise ValueError('کد تخفیف وارد نشده است')
        try:
            coupon = Coupon.objects.get(code__iexact=normalized)
        except Coupon.DoesNotExist as exc:
            raise ValueError('کد تخفیف نامعتبر است') from exc
        CouponService._assert_usable(coupon)
        return coupon

    @staticmethod
    def _assert_usable(coupon: Coupon) -> None:
        now = timezone.now()
        if not coupon.is_active:
            raise ValueError('این کد تخفیف غیرفعال است')
        if coupon.valid_from and now < coupon.valid_from:
            raise ValueError('زمان استفاده از این کد هنوز نرسیده است')
        if coupon.valid_until and now > coupon.valid_until:
            raise ValueError('مهلت استفاده از این کد به پایان رسیده است')
        if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
            raise ValueError('سقف استفاده از این کد تکمیل شده است')

    @staticmethod
    def calculate_discount(
        coupon: Coupon,
        items_total: int,
        service_fee: int = 0,
        packaging_fee: int = 0,
    ) -> int:
        base = max(int(items_total or 0), 0)
        if base < int(coupon.min_order_amount or 0):
            raise ValueError(
                f'حداقل مبلغ سفارش برای این کد {coupon.min_order_amount} ریال است'
            )
        if coupon.discount_type == Coupon.TYPE_PERCENT:
            pct = min(max(int(coupon.value or 0), 0), 100)
            discount = int(base * pct / 100)
            if coupon.max_discount_amount is not None:
                discount = min(discount, int(coupon.max_discount_amount))
        else:
            discount = int(coupon.value or 0)

        # Discount applies to items only (not service/packaging); never exceed items total
        return max(0, min(discount, base))

    @staticmethod
    def preview(
        code: str,
        items_total: int,
        service_fee: int = 0,
        packaging_fee: int = 0,
    ) -> Dict[str, Any]:
        coupon = CouponService.get_active_coupon(code)
        discount = CouponService.calculate_discount(
            coupon, items_total, service_fee, packaging_fee
        )
        return {
            'code': coupon.code,
            'discount_type': coupon.discount_type,
            'value': coupon.value,
            'discount_amount': discount,
            'items_total': items_total,
            'service_fee': service_fee,
            'packaging_fee': packaging_fee,
            'payable': max(items_total + service_fee + packaging_fee - discount, 0),
        }

    @staticmethod
    def consume(coupon: Optional[Coupon]) -> None:
        if not coupon:
            return
        with transaction.atomic():
            locked = Coupon.objects.select_for_update().get(pk=coupon.pk)
            CouponService._assert_usable(locked)
            locked.used_count = int(locked.used_count or 0) + 1
            locked.save(update_fields=['used_count', 'updated_at'])
