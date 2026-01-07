from django.urls import path, include
from apps.admin_panel.api.orders.orders_apis import AdminOrderListAPIView
from apps.admin_panel.api.orders.receipt_apis import ReceiptReprintAPIView

urlpatterns = [
    path('', AdminOrderListAPIView.as_view(), name='admin-order-list'),
    path('<int:pk>/', include('apps.admin_panel.api.orders.id.urls')),
    path('receipt/<str:order_number>/reprint/', ReceiptReprintAPIView.as_view(), name='admin-receipt-reprint'),
]

