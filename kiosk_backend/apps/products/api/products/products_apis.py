from rest_framework import generics
from apps.products.models import Product
from apps.products.api.products.products_serializers import ProductListSerializer
from apps.products.api.products.products_filters import ProductFilter
from apps.products.selectors.product_selector import ProductSelector
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class ProductListAPIView(generics.ListAPIView):
    """
    API endpoint for listing active products.
    
    Returns a paginated list of active products with optional filtering.
    Supports filtering by category, price range, and search query.
    """
    queryset = Product.objects.none()
    serializer_class = ProductListSerializer
    filterset_class = ProductFilter
    
    @custom_extend_schema(
        resource_name="ProductList",
        parameters=[],
        response_serializer=ProductListSerializer,
        status_codes=[
            ResponseStatusCodes.OK_PAGINATED,
            ResponseStatusCodes.BAD_REQUEST,
        ],
        summary="List Products",
        description="Get a paginated list of active products with optional filtering by category, price range, and stock availability.",
        tags=["Products"],
        operation_id="products_list",
    )
    def get(self, request, *args, **kwargs):
        # Pass request context to serializer for image URL building
        return super().get(request, *args, **kwargs)
    
    def get_serializer_context(self):
        """Add request to serializer context for image URL building."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        """
        Get queryset of active products.
        
        Returns:
            QuerySet: QuerySet of active products
        """
        return ProductSelector.get_active_products()
