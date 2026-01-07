from rest_framework import generics, status
from rest_framework.response import Response
from django.db.models import ProtectedError
from django.utils.translation import gettext_lazy as _
from apps.products.models import Category
from apps.admin_panel.api.categories.categories_serializers import AdminCategorySerializer
from apps.admin_panel.api.permissions import IsAdminUser
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class AdminCategoryRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint for retrieving, updating, and deleting a category (Admin only).
    
    GET: Retrieve category details
    PUT/PATCH: Update category
    DELETE: Delete category
    """
    queryset = Category.objects.select_related('parent').prefetch_related('children').all()
    serializer_class = AdminCategorySerializer
    permission_classes = [IsAdminUser]
    
    @custom_extend_schema(
        resource_name="AdminCategoryRetrieve",
        parameters=[],
        response_serializer=AdminCategorySerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.NOT_FOUND,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Get Category Details (Admin)",
        description="Retrieve detailed information about a category. Admin only.",
        tags=["Admin - Categories"],
        operation_id="admin_categories_retrieve",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @custom_extend_schema(
        resource_name="AdminCategoryUpdate",
        parameters=[AdminCategorySerializer],
        response_serializer=AdminCategorySerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.NOT_FOUND,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Update Category (Admin)",
        description="Update category information (full update). Admin only.",
        tags=["Admin - Categories"],
        operation_id="admin_categories_update",
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)
    
    @custom_extend_schema(
        resource_name="AdminCategoryPartialUpdate",
        parameters=[AdminCategorySerializer],
        response_serializer=AdminCategorySerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.NOT_FOUND,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Partially Update Category (Admin)",
        description="Partially update category information. Admin only.",
        tags=["Admin - Categories"],
        operation_id="admin_categories_partial_update",
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)
    
    @custom_extend_schema(
        resource_name="AdminCategoryDelete",
        parameters=[],
        status_codes=[
            ResponseStatusCodes.NO_CONTENT,
            ResponseStatusCodes.NOT_FOUND,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
            ResponseStatusCodes.BAD_REQUEST,
        ],
        summary="Delete Category (Admin)",
        description="Delete a category. Admin only. Cannot delete if category has products.",
        tags=["Admin - Categories"],
        operation_id="admin_categories_delete",
    )
    def delete(self, request, *args, **kwargs):
        category = self.get_object()
        try:
            return super().delete(request, *args, **kwargs)
        except ProtectedError:
            # Count products in this category
            products_count = category.products.count()
            error_message = _(
                f'نمی‌توانید دسته‌بندی "{category.name}" را حذف کنید زیرا {products_count} محصول به آن متصل است. '
                'لطفاً ابتدا محصولات را به دسته‌بندی دیگری منتقل کنید یا حذف کنید.'
            )
            return Response(
                {'detail': error_message},
                status=status.HTTP_400_BAD_REQUEST
            )

