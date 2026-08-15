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


class PosTestConnectionAPIView(APIView):
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'

    @custom_extend_schema(
        resource_name='PosTestConnection',
        status_codes=[ResponseStatusCodes.OK, ResponseStatusCodes.UNAUTHORIZED, ResponseStatusCodes.FORBIDDEN],
        summary='Test POS / card-reader connection',
        tags=['Admin - Health'],
        operation_id='admin_pos_test_connection',
    )
    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        pos_ip = data.get('pos_ip') or data.get('ip')
        pos_port = data.get('pos_port') or data.get('port')
        if isinstance(pos_ip, str):
            pos_ip = pos_ip.strip() or None
        else:
            pos_ip = None
        try:
            pos_port = int(pos_port) if pos_port not in (None, '') else None
        except (TypeError, ValueError):
            pos_port = None
        return Response(HealthMonitorService.test_pos_connection(pos_ip, pos_port))


class PosResetConnectionAPIView(APIView):
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'

    @custom_extend_schema(
        resource_name='PosResetConnection',
        status_codes=[ResponseStatusCodes.OK, ResponseStatusCodes.UNAUTHORIZED, ResponseStatusCodes.FORBIDDEN],
        summary='Reset in-process POS DLL client',
        tags=['Admin - Health'],
        operation_id='admin_pos_reset_connection',
    )
    def post(self, request):
        return Response(HealthMonitorService.reset_pos_connection())
