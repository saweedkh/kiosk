from rest_framework import generics
from rest_framework.response import Response
from apps.products.models import Category
from apps.products.api.categories.products.products_serializers import CategoryProductSerializer
from apps.products.selectors.category_selector import CategorySelector
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class CategoryProductsAPIView(generics.GenericAPIView):
    """
    API endpoint for listing products in a category.
    
    Returns all active products with stock in the specified category.
    """
    serializer_class = CategoryProductSerializer
    
    @custom_extend_schema(
        resource_name="CategoryProducts",
        parameters=[],
        response_serializer=CategoryProductSerializer,
        status_codes=[
            ResponseStatusCodes.OK_ALL,
            ResponseStatusCodes.NOT_FOUND,
        ],
        summary="Get Category Products",
        description="Get all active products with stock in a specific category.",
        tags=["Categories"],
        operation_id="categories_products",
    )
    def get(self, request, pk):
        """
        Get products for a specific category.
        
        Args:
            request: HTTP request object
            pk: Category ID
            
        Returns:
            Response: List of products in the category
            
        Raises:
            Category.DoesNotExist: If category not found
        """
        category = Category.objects.get(pk=pk)
        products = CategorySelector.get_category_products(category.id)
        serializer = self.get_serializer(products, many=True, context={'request': request})
        return Response(serializer.data)

