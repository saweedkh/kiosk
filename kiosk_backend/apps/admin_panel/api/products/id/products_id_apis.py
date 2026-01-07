from rest_framework import generics, status
from rest_framework.response import Response
from apps.products.models import Product
from apps.admin_panel.api.products.products_serializers import (
    AdminProductSerializer,
    UpdateStockSerializer,
    ProductUpdateSerializerInput
)
from apps.admin_panel.api.permissions import IsAdminUser
from apps.products.services.product_service import ProductService
from apps.products.services.stock_service import StockService
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class AdminProductRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint for retrieving, updating, and deleting a product (Admin only).
    
    GET: Retrieve product details
    PUT/PATCH: Update product
    DELETE: Delete product
    """
    queryset = Product.objects.select_related('category').all()
    serializer_class = AdminProductSerializer
    permission_classes = [IsAdminUser]
    
    @custom_extend_schema(
        resource_name="AdminProductRetrieve",
        parameters=[],
        response_serializer=AdminProductSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.NOT_FOUND,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Get Product Details (Admin)",
        description="Retrieve detailed information about a product. Admin only.",
        tags=["Admin - Products"],
        operation_id="admin_products_retrieve",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @custom_extend_schema(
        resource_name="AdminProductUpdate",
        request=ProductUpdateSerializerInput,
        response_serializer=AdminProductSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.NOT_FOUND,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Update Product (Admin)",
        description="Update product information (full update). Admin only.",
        tags=["Admin - Products"],
        operation_id="admin_products_update",
    )
    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)
    
    @custom_extend_schema(
        resource_name="AdminProductPartialUpdate",
        request=ProductUpdateSerializerInput,
        response_serializer=AdminProductSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.NOT_FOUND,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Partially Update Product (Admin)",
        description="Partially update product information. Admin only.",
        tags=["Admin - Products"],
        operation_id="admin_products_partial_update",
    )
    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
    
    def perform_update(self, serializer):
        instance = serializer.instance
        product = ProductService.update_product(instance, serializer.validated_data)
        serializer.instance = product
    
    @custom_extend_schema(
        resource_name="AdminProductDelete",
        parameters=[],
        status_codes=[
            ResponseStatusCodes.NO_CONTENT,
            ResponseStatusCodes.NOT_FOUND,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Delete Product (Admin)",
        description="Delete a product. Admin only.",
        tags=["Admin - Products"],
        operation_id="admin_products_delete",
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)


class AdminProductUpdateStockAPIView(generics.GenericAPIView):
    """
    API endpoint for updating product stock (Admin only).
    
    Updates stock quantity and creates stock history record.
    """
    queryset = Product.objects.all()
    serializer_class = UpdateStockSerializer
    permission_classes = [IsAdminUser]
    
    @custom_extend_schema(
        resource_name="AdminProductUpdateStock",
        parameters=[UpdateStockSerializer],
        response_serializer=AdminProductSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.NOT_FOUND,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Update Product Stock (Admin)",
        description="Update product stock quantity and create stock history record. Admin only.",
        tags=["Admin - Products"],
        operation_id="admin_products_update_stock",
    )
    def put(self, request, *args, **kwargs):
        """
        Update product stock quantity.
        
        Args:
            request: HTTP request object with stock_quantity and optional notes
            pk: Product ID
            
        Returns:
            Response: Updated product data
            
        Raises:
            ValidationError: If data is invalid
        """
        product = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        StockService.update_stock(
            product_id=product.id,
            new_quantity=serializer.validated_data['stock_quantity'],
            change_type='manual',
            admin_user=request.user,
            notes=serializer.validated_data.get('notes', '')
        )
        
        product.refresh_from_db()
        return Response(AdminProductSerializer(product).data)

