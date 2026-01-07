from django.urls import path
from apps.admin_panel.api.products.id.products_id_apis import (
    AdminProductRetrieveUpdateDestroyAPIView,
    AdminProductUpdateStockAPIView
)

urlpatterns = [
    path('', AdminProductRetrieveUpdateDestroyAPIView.as_view(), name='admin-product-detail'),
    path('update-stock/', AdminProductUpdateStockAPIView.as_view(), name='admin-product-update-stock'),
]

