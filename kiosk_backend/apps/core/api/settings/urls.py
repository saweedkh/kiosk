from django.urls import path
from apps.core.api.settings.views import (
    SiteSettingsPublicAPIView,
    SiteSettingsAdminAPIView
)

app_name = 'settings'

urlpatterns = [
    # Public API - بدون نیاز به authentication
    path('public/', SiteSettingsPublicAPIView.as_view(), name='public'),
    
    # Admin API - نیاز به authentication
    path('admin/', SiteSettingsAdminAPIView.as_view(), name='admin'),
]

