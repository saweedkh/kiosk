from django.urls import path
from apps.orders.api.orders.orders_apis import OrderCreateAPIView

urlpatterns = [
    path('create/', OrderCreateAPIView.as_view(), name='order-create'),
]

