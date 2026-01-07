from django.urls import path
from apps.orders.api.order_items.order_items_apis import OrderItemListAPIView

urlpatterns = [
    path('order/<int:order_id>/items/', OrderItemListAPIView.as_view(), name='order-item-list'),
]

