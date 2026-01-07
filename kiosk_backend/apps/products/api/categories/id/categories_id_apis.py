from rest_framework import generics
from apps.products.models import Category
from apps.products.api.categories.id.categories_id_serializers import CategorySerializer
from apps.products.selectors.category_selector import CategorySelector
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class CategoryRetrieveAPIView(generics.RetrieveAPIView):
    """
    API endpoint for retrieving a single category by ID.
    
    Returns detailed information about a specific active category.
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'pk'
    
    @custom_extend_schema(
        resource_name="CategoryRetrieve",
        parameters=[],
        response_serializer=CategorySerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.NOT_FOUND,
        ],
        summary="Get Category Details",
        description="Retrieve detailed information about a specific active category.",
        tags=["Categories"],
        operation_id="categories_retrieve",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    def get_queryset(self):
        """
        Get queryset of active categories.
        
        Returns:
            QuerySet: QuerySet of active categories
        """
        return CategorySelector.get_active_categories()

