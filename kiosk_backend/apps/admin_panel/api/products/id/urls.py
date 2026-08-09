from django.urls import path
from apps.admin_panel.api.products.id.products_id_apis import (
    AdminProductRetrieveUpdateDestroyAPIView,
    AdminProductUpdateStockAPIView
)
from apps.admin_panel.api.products.options_apis import (
    ProductOptionGroupListCreateAPIView,
    ProductOptionGroupDetailAPIView,
    ProductOptionDetailAPIView,
)

urlpatterns = [
    path('', AdminProductRetrieveUpdateDestroyAPIView.as_view(), name='admin-product-detail'),
    path('update-stock/', AdminProductUpdateStockAPIView.as_view(), name='admin-product-update-stock'),
    path('option-groups/', ProductOptionGroupListCreateAPIView.as_view(), name='admin-product-option-groups'),
    path(
        'option-groups/<int:group_id>/',
        ProductOptionGroupDetailAPIView.as_view(),
        name='admin-product-option-group-detail',
    ),
    path(
        'option-groups/<int:group_id>/options/<int:option_id>/',
        ProductOptionDetailAPIView.as_view(),
        name='admin-product-option-detail',
    ),
]

