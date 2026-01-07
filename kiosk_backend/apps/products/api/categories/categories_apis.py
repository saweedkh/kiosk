from rest_framework import generics
from apps.products.models import Category
from apps.products.api.categories.categories_serializers import CategoryListSerializer
from apps.products.selectors.category_selector import CategorySelector
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class CategoryListAPIView(generics.ListAPIView):
    """
    API endpoint for listing active categories.
    
    Returns a list of all active categories.
    """
    queryset = Category.objects.none()
    serializer_class = CategoryListSerializer
    
    @custom_extend_schema(
        resource_name="CategoryList",
        response_serializer=CategoryListSerializer,
        status_codes=[
            ResponseStatusCodes.OK_ALL,
        ],
        summary="List Categories",
        description="Get a list of all active categories.",
        tags=["Categories"],
        operation_id="categories_list",
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

