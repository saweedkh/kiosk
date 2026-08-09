from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin_panel.api.permissions import IsAdminUser, HasAppPermission
from apps.admin_panel.services.dashboard_service import DashboardService
from apps.admin_panel.services.health_service import HealthMonitorService
from apps.core.api.schema import custom_extend_schema, ResponseStatusCodes


class LiveDashboardAPIView(APIView):
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'

    @custom_extend_schema(
        resource_name='LiveDashboard',
        status_codes=[ResponseStatusCodes.OK, ResponseStatusCodes.UNAUTHORIZED, ResponseStatusCodes.FORBIDDEN],
        summary='Live dashboard metrics',
        tags=['Admin - Dashboard'],
        operation_id='admin_dashboard_live',
    )
    def get(self, request):
        days = request.query_params.get('days', 7)
        try:
            days_int = int(days)
        except (TypeError, ValueError):
            days_int = 7

        return Response({
            'live': DashboardService.get_live_metrics(),
            'heatmap': DashboardService.get_hourly_heatmap(days=days_int),
            'trend': DashboardService.get_sales_trend(days=days_int),
            'top_products': DashboardService.get_top_products(limit=5),
            'recent_orders': DashboardService.get_recent_orders(limit=8),
        })


class SystemHealthAPIView(APIView):
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'

    @custom_extend_schema(
        resource_name='SystemHealth',
        status_codes=[ResponseStatusCodes.OK, ResponseStatusCodes.UNAUTHORIZED, ResponseStatusCodes.FORBIDDEN],
        summary='POS / printer / Bale health',
        tags=['Admin - Health'],
        operation_id='admin_system_health',
    )
    def get(self, request):
        return Response(HealthMonitorService.get_overview())
