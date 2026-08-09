from django.urls import path
from apps.admin_panel.api.coupons.coupons_apis import (
    CouponListCreateAPIView,
    CouponDetailAPIView,
    CouponValidateAPIView,
)

urlpatterns = [
    path('', CouponListCreateAPIView.as_view(), name='coupon-list'),
    path('validate/', CouponValidateAPIView.as_view(), name='coupon-validate'),
    path('<int:pk>/', CouponDetailAPIView.as_view(), name='coupon-detail'),
]
