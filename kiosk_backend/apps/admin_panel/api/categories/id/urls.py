from django.urls import path
from apps.admin_panel.api.categories.id.categories_id_apis import (
    AdminCategoryRetrieveUpdateDestroyAPIView
)

urlpatterns = [
    path('', AdminCategoryRetrieveUpdateDestroyAPIView.as_view(), name='admin-category-detail'),
]

