from rest_framework import generics
from apps.orders.models import OrderItem
from apps.orders.api.order_items.order_items_serializers import OrderItemSerializer
from apps.orders.selectors.order_selector import OrderSelector
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class OrderItemListAPIView(generics.ListAPIView):
    """
    API endpoint for listing order items.
    
    Returns all items for a specific order.
    """
    serializer_class = OrderItemSerializer
    
    @custom_extend_schema(
        resource_name="OrderItemList",
        parameters=[],
        response_serializer=OrderItemSerializer,
        status_codes=[ResponseStatusCodes.OK_ALL],
        summary="List Order Items",
        description="Get all items for a specific order.",
        tags=["Orders"],
        operation_id="order_items_list",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    def get_queryset(self):
        """
        Get queryset of order items for a specific order.
        
        Returns:
            QuerySet: QuerySet of order items
        """
        order_id = self.kwargs.get('order_id')
        if not order_id:
            return OrderItem.objects.none()
        
        return OrderSelector.get_order_items(order_id)

