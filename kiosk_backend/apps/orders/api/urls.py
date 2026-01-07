from django.urls import path, include

app_name = 'orders'

urlpatterns = [
    path('orders/', include('apps.orders.api.orders.urls')),
    path('order-items/', include('apps.orders.api.order_items.urls')),
    path('invoices/', include('apps.orders.api.invoices.urls')),
]

