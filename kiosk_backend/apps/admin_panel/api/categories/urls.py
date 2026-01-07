from django.urls import path, include
from apps.admin_panel.api.categories.categories_apis import AdminCategoryListAPIView

urlpatterns = [
    path('', AdminCategoryListAPIView.as_view(), name='admin-category-list'),
    path('<int:pk>/', include('apps.admin_panel.api.categories.id.urls')),
]

