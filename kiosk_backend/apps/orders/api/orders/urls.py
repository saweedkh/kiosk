from django.urls import path
from apps.orders.api.orders.orders_apis import (
    OrderCreateAPIView,
    OrderPaymentStatusAPIView,
)

urlpatterns = [
    path('create/', OrderCreateAPIView.as_view(), name='order-create'),
    path(
        '<int:order_id>/status/',
        OrderPaymentStatusAPIView.as_view(),
        name='order-payment-status',
    ),
]

