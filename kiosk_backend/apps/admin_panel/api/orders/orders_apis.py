from rest_framework import generics
from apps.orders.models import Order
from apps.admin_panel.api.orders.orders_serializers import (
    AdminOrderListSerializer
)
from apps.admin_panel.api.orders.orders_filters import AdminOrderFilter
from apps.admin_panel.api.permissions import IsAdminUser
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class AdminOrderListAPIView(generics.ListAPIView):
    """
    API endpoint for listing all orders (Admin only).
    
    Returns paginated list of all orders with filtering support.
    Supports filtering by status, payment_status, date range, etc.
    """
    queryset = Order.objects.prefetch_related('items__product').all()
    serializer_class = AdminOrderListSerializer
    permission_classes = [IsAdminUser]
    filterset_class = AdminOrderFilter
    
    @custom_extend_schema(
        resource_name="AdminOrderList",
        parameters=[],
        response_serializer=AdminOrderListSerializer,
        status_codes=[
            ResponseStatusCodes.OK_PAGINATED,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="List Orders (Admin)",
        description="Get a paginated list of all orders with filtering support. Admin only.",
        tags=["Admin - Orders"],
        operation_id="admin_orders_list",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

