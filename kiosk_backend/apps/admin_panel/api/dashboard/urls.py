from django.urls import path
from apps.admin_panel.api.dashboard.dashboard_apis import (
    LiveDashboardAPIView,
    PosResetConnectionAPIView,
    PosTestConnectionAPIView,
    SystemHealthAPIView,
)

urlpatterns = [
    path('live/', LiveDashboardAPIView.as_view(), name='dashboard-live'),
    path('health/', SystemHealthAPIView.as_view(), name='system-health'),
    path('health/pos-test/', PosTestConnectionAPIView.as_view(), name='pos-test-connection'),
    path('health/pos-reset/', PosResetConnectionAPIView.as_view(), name='pos-reset-connection'),
]
