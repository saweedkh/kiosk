from django.urls import path
from apps.admin_panel.api.orders.id.orders_id_apis import (
    AdminOrderRetrieveAPIView,
    AdminOrderUpdateStatusAPIView,
    AdminOrderUpdatePaymentStatusAPIView,
)

urlpatterns = [
    path('', AdminOrderRetrieveAPIView.as_view(), name='admin-order-retrieve'),
    path('update-status/', AdminOrderUpdateStatusAPIView.as_view(), name='admin-order-update-status'),
    path(
        'update-payment-status/',
        AdminOrderUpdatePaymentStatusAPIView.as_view(),
        name='admin-order-update-payment-status',
    ),
]

