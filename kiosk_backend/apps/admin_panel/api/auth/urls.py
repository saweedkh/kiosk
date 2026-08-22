from django.urls import path
from apps.admin_panel.api.auth.auth_apis import (
    LoginAPIView,
    LogoutAPIView,
    UserInfoAPIView,
    RefreshTokenAPIView,
)

urlpatterns = [
    path('login/', LoginAPIView.as_view(), name='admin-login'),
    path('logout/', LogoutAPIView.as_view(), name='admin-logout'),
    path('user/', UserInfoAPIView.as_view(), name='admin-user'),
    path('refresh/', RefreshTokenAPIView.as_view(), name='admin-token-refresh'),
]

