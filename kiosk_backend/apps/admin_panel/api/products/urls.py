from django.urls import path, include
from apps.admin_panel.api.products.products_apis import AdminProductListAPIView

urlpatterns = [
    path('', AdminProductListAPIView.as_view(), name='admin-product-list'),
    path('<int:pk>/', include('apps.admin_panel.api.products.id.urls')),
]

