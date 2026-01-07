from rest_framework import generics
from apps.products.models import Product
from apps.products.api.products.id.products_id_serializers import ProductDetailSerializer
from apps.products.selectors.product_selector import ProductSelector
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class ProductRetrieveAPIView(generics.RetrieveAPIView):
    """
    API endpoint for retrieving a single product by ID.
    
    Returns detailed information about a specific active product
    including category and stock history.
    """
    queryset = Product.objects.all()
    serializer_class = ProductDetailSerializer
    lookup_field = 'pk'
    
    @custom_extend_schema(
        resource_name="ProductRetrieve",
        response_serializer=ProductDetailSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.NOT_FOUND,
        ],
        summary="Get Product Details",
        description="Retrieve detailed information about a specific product including category, stock quantity, and stock history.",
        tags=["Products"],
        operation_id="products_retrieve",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    def get_queryset(self):
        """
        Get queryset of active products.
        
        Returns:
            QuerySet: QuerySet of active products
        """
        return ProductSelector.get_active_products()

