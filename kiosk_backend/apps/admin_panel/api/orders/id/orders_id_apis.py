from rest_framework import generics, status
from rest_framework.response import Response
from apps.orders.models import Order
from apps.admin_panel.api.orders.orders_serializers import (
    AdminOrderSerializer,
    UpdateOrderStatusSerializer
)
from apps.admin_panel.api.permissions import IsAdminUser
from apps.orders.services.order_service import OrderService
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class AdminOrderRetrieveAPIView(generics.RetrieveAPIView):
    """
    API endpoint for retrieving a single order (Admin only).
    
    Returns detailed information about a specific order including all items.
    """
    queryset = Order.objects.prefetch_related('items__product').all()
    serializer_class = AdminOrderSerializer
    permission_classes = [IsAdminUser]
    
    @custom_extend_schema(
        resource_name="AdminOrderRetrieve",
        parameters=[],
        response_serializer=AdminOrderSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.NOT_FOUND,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Get Order Details (Admin)",
        description="Retrieve detailed information about an order including all items. Admin only.",
        tags=["Admin - Orders"],
        operation_id="admin_orders_retrieve",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class AdminOrderUpdateStatusAPIView(generics.GenericAPIView):
    """
    API endpoint for updating order status (Admin only).
    
    Updates the status of an order.
    """
    queryset = Order.objects.all()
    serializer_class = UpdateOrderStatusSerializer
    permission_classes = [IsAdminUser]
    
    @custom_extend_schema(
        resource_name="AdminOrderUpdateStatus",
        parameters=[UpdateOrderStatusSerializer],
        response_serializer=AdminOrderSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.NOT_FOUND,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Update Order Status (Admin)",
        description="Update the status of an order. Admin only.",
        tags=["Admin - Orders"],
        operation_id="admin_orders_update_status",
    )
    def put(self, request, pk):
        """
        Update order status.
        
        Args:
            request: HTTP request object with status
            pk: Order ID
            
        Returns:
            Response: Updated order data
            
        Raises:
            ValidationError: If status is invalid
            OrderNotFoundException: If order not found
        """
        order = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        OrderService.update_order_status(order.id, serializer.validated_data['status'])
        
        order.refresh_from_db()
        return Response(AdminOrderSerializer(order).data)

