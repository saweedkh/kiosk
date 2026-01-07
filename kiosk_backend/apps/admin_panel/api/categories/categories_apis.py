from rest_framework import generics
from apps.products.models import Category
from apps.admin_panel.api.categories.categories_serializers import (
    AdminCategorySerializer,
    AdminCategoryListSerializer
)
from apps.admin_panel.api.categories.categories_filters import AdminCategoryFilter
from apps.admin_panel.api.permissions import IsAdminUser
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class AdminCategoryListAPIView(generics.ListCreateAPIView):
    """
    API endpoint for listing and creating categories (Admin only).
    
    GET: Returns paginated list of all categories with filtering support.
    POST: Creates a new category.
    """
    queryset = Category.objects.select_related('parent').prefetch_related('children').all()
    permission_classes = [IsAdminUser]
    filterset_class = AdminCategoryFilter
    
    def get_serializer_class(self):
        """
        Return appropriate serializer class based on request method.
        
        Returns:
            Serializer: AdminCategoryListSerializer for GET, AdminCategorySerializer for POST
        """
        if self.request.method == 'GET':
            return AdminCategoryListSerializer
        return AdminCategorySerializer
    
    @custom_extend_schema(
        resource_name="AdminCategoryList",
        response_serializer=AdminCategoryListSerializer,
        status_codes=[
            ResponseStatusCodes.OK_PAGINATED,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="List Categories (Admin)",
        description="Get a paginated list of all categories with filtering support. Admin only.",
        tags=["Admin - Categories"],
        operation_id="admin_categories_list",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @custom_extend_schema(
        resource_name="AdminCategoryCreate",
        parameters=[AdminCategorySerializer],
        response_serializer=AdminCategorySerializer,
        status_codes=[
            ResponseStatusCodes.CREATED,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Create Category (Admin)",
        description="Create a new category. Admin only.",
        tags=["Admin - Categories"],
        operation_id="admin_categories_create",
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

