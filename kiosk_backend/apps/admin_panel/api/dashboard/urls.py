from django.urls import path
from apps.admin_panel.api.dashboard.dashboard_apis import (
    LiveDashboardAPIView,
    SystemHealthAPIView,
)

urlpatterns = [
    path('live/', LiveDashboardAPIView.as_view(), name='dashboard-live'),
    path('health/', SystemHealthAPIView.as_view(), name='system-health'),
]
