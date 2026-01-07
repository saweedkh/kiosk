"""
API endpoint for reprinting receipts (Admin only).
"""
from rest_framework import generics, status
from rest_framework.response import Response
from apps.orders.selectors.order_selector import OrderSelector
from apps.orders.services.receipt_service import ReceiptService
from apps.orders.services.print_service import PrintService
from apps.admin_panel.api.permissions import IsAdminUser
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class ReceiptReprintAPIView(generics.GenericAPIView):
    """
    API endpoint for reprinting receipt by order number (Admin only).
    
    POST: Prints receipt to network printer and returns receipt data
    """
    permission_classes = [IsAdminUser]
    
    @custom_extend_schema(
        resource_name="ReprintReceipt",
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.NOT_FOUND,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Reprint Receipt (Admin)",
        description="Reprint receipt for an order by sending it to network printer. Only available for admin users and paid orders.",
        tags=["Admin - Orders"],
        operation_id="admin_receipt_reprint",
    )
    def post(self, request, order_number: str):
        """
        Reprint receipt for an order and return receipt data.
        
        Args:
            request: HTTP request object
            order_number: Order number
            
        Returns:
            Response: Receipt data and print status
        """
        order = OrderSelector.get_order_by_number(order_number)
        
        if not order:
            return Response(
                data={
                    'error': 'Order not found',
                    'message': f'Order with number {order_number} does not exist'
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Only print for paid orders
        if order.payment_status != 'paid':
            return Response(
                data={
                    'error': 'Cannot print receipt',
                    'message': 'Receipt can only be printed for paid orders'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get receipt data
        receipt_data = ReceiptService.generate_receipt_data(order)
        
        # Generate receipt image
        receipt_image = PrintService.generate_receipt_image(receipt_data, width=576)
        
        # Save image and get URL
        image_url = PrintService.save_receipt_image(receipt_image, order_number, request)
        
        # Print receipt
        print_success = PrintService.print_receipt(order)
        
        response_data = {
            **receipt_data,
            'image_url': image_url,
            'print_status': 'success' if print_success else 'failed',
            'print_message': 'Receipt sent to printer successfully' if print_success else 'Failed to send receipt to printer'
        }
        
        if print_success:
            return Response(
                data=response_data,
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                data=response_data,
                status=status.HTTP_200_OK  # Still return 200, but with print_status='failed'
            )

