from django.urls import path

from apps.accounts.api.views import (
    GroupDetailAPIView,
    GroupListCreateAPIView,
    PermissionCatalogAPIView,
    UserDetailAPIView,
    UserListCreateAPIView,
)

urlpatterns = [
    path('permissions/', PermissionCatalogAPIView.as_view(), name='accounts-permissions'),
    path('groups/', GroupListCreateAPIView.as_view(), name='accounts-groups'),
    path('groups/<int:pk>/', GroupDetailAPIView.as_view(), name='accounts-group-detail'),
    path('users/', UserListCreateAPIView.as_view(), name='accounts-users'),
    path('users/<int:pk>/', UserDetailAPIView.as_view(), name='accounts-user-detail'),
]
