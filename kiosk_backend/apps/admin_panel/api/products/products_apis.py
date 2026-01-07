from rest_framework import generics, status
from rest_framework.response import Response
from apps.products.models import Product
from apps.admin_panel.api.products.products_serializers import (
    AdminProductSerializer,
    AdminProductListSerializer
)
from apps.admin_panel.api.products.products_filters import AdminProductFilter
from apps.admin_panel.api.permissions import IsAdminUser
from apps.products.services.product_service import ProductService
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class AdminProductListAPIView(generics.ListCreateAPIView):
    """
    API endpoint for listing and creating products (Admin only).
    
    GET: Returns paginated list of all products with filtering support.
    POST: Creates a new product.
    """
    queryset = Product.objects.select_related('category').all()
    permission_classes = [IsAdminUser]
    filterset_class = AdminProductFilter
    
    def get_serializer_class(self):
        """
        Return appropriate serializer class based on request method.
        
        Returns:
            Serializer: AdminProductListSerializer for GET, AdminProductSerializer for POST
        """
        if self.request.method == 'GET':
            return AdminProductListSerializer
        return AdminProductSerializer
    
    @custom_extend_schema(
        resource_name="AdminProductList",
        parameters=[],
        response_serializer=AdminProductListSerializer,
        status_codes=[
            ResponseStatusCodes.OK_PAGINATED,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="List Products (Admin)",
        description="Get a paginated list of all products with filtering support. Admin only.",
        tags=["Admin - Products"],
        operation_id="admin_products_list",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    def get_serializer_context(self):
        """Add request to serializer context for image URL building."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    @custom_extend_schema(
        resource_name="AdminProductCreate",
        parameters=[AdminProductSerializer],
        response_serializer=AdminProductSerializer,
        status_codes=[
            ResponseStatusCodes.CREATED,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Create Product (Admin)",
        description="Create a new product. Admin only.",
        tags=["Admin - Products"],
        operation_id="admin_products_create",
    )
    def post(self, request, *args, **kwargs):
        """
        Create a new product.
        
        Args:
            request: HTTP request object with product data
            
        Returns:
            Response: Created product data
            
        Raises:
            ValidationError: If data is invalid
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = ProductService.create_product(serializer.validated_data)
        return Response(
            AdminProductSerializer(product).data,
            status=status.HTTP_201_CREATED
        )

