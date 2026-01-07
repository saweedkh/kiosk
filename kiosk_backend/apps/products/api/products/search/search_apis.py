from rest_framework import generics, status
from rest_framework.response import Response
from apps.products.api.products.search.search_serializers import (
    ProductSearchQuerySerializer,
    ProductSearchSerializer
)
from apps.products.selectors.product_selector import ProductSelector
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class ProductSearchAPIView(generics.GenericAPIView):
    """
    API endpoint for searching products by name or description.
    
    Query Parameters:
        q: Search query string (required)
        
    Returns a list of products matching the search query.
    """
    serializer_class = ProductSearchSerializer
    
    @custom_extend_schema(
        resource_name="ProductSearch",
        parameters=[ProductSearchQuerySerializer],
        response_serializer=ProductSearchSerializer,
        status_codes=[
            ResponseStatusCodes.OK_ALL,
            ResponseStatusCodes.BAD_REQUEST,
        ],
        summary="Search Products",
        description="Search for products by name or description. Returns a list of active products matching the search query.",
        tags=["Products"],
        operation_id="products_search",
    )
    def get(self, request):
        """
        Search products by query string.
        
        Args:
            request: HTTP request object
            
        Returns:
            Response: List of products matching the search query
        """
        params_serializer = ProductSearchQuerySerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        params = params_serializer.validated_data
        
        query = params.get('q', '')
        products = ProductSelector.search_products(query)
        
        serializer = ProductSearchSerializer(products, many=True, context={'request': request})
        return Response(
            data=serializer.data,
            status=status.HTTP_200_OK
        )

