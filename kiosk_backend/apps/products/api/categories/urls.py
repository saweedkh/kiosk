from django.urls import path
from apps.products.api.categories.categories_apis import CategoryListAPIView
from apps.products.api.categories.id.categories_id_apis import CategoryRetrieveAPIView
from apps.products.api.categories.products.products_apis import CategoryProductsAPIView

urlpatterns = [
    path('', CategoryListAPIView.as_view(), name='category-list'),
    path('<int:pk>/', CategoryRetrieveAPIView.as_view(), name='category-detail'),
    path('<int:pk>/products/', CategoryProductsAPIView.as_view(), name='category-products'),
]

