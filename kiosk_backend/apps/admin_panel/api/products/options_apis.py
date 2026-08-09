from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin_panel.api.permissions import IsAdminUser, HasAppPermission
from apps.admin_panel.api.products.options_serializers import (
    ProductOptionGroupSerializer,
    ProductOptionGroupWriteSerializer,
    ProductOptionWriteSerializer,
)
from apps.products.models import Product, ProductOptionGroup, ProductOption
from apps.core.models.settings import SiteSettings


class ProductOptionGroupListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'change_products'
    pagination_class = None

    def get_permissions(self):
        if self.request.method == 'GET':
            self.required_permission = 'view_products'
        else:
            self.required_permission = 'change_products'
        return super().get_permissions()

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ProductOptionGroupSerializer
        return ProductOptionGroupWriteSerializer

    def get_queryset(self):
        product_id = self.kwargs['product_id']
        return (
            ProductOptionGroup.objects.filter(product_id=product_id)
            .prefetch_related('options')
            .order_by('display_order', 'id')
        )

    def perform_create(self, serializer):
        product = Product.objects.get(pk=self.kwargs['product_id'])
        serializer.save(product=product)
        SiteSettings.bump_catalog_revision()


class ProductOptionGroupDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'change_products'
    lookup_url_kwarg = 'group_id'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ProductOptionGroupWriteSerializer
        return ProductOptionGroupSerializer

    def get_queryset(self):
        return ProductOptionGroup.objects.filter(
            product_id=self.kwargs['product_id']
        ).prefetch_related('options')

    def perform_update(self, serializer):
        serializer.save()
        SiteSettings.bump_catalog_revision()

    def perform_destroy(self, instance):
        instance.delete()
        SiteSettings.bump_catalog_revision()


class ProductOptionDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'change_products'
    serializer_class = ProductOptionWriteSerializer
    lookup_url_kwarg = 'option_id'

    def get_queryset(self):
        return ProductOption.objects.filter(
            group_id=self.kwargs['group_id'],
            group__product_id=self.kwargs['product_id'],
        )

    def perform_update(self, serializer):
        serializer.save()
        SiteSettings.bump_catalog_revision()

    def perform_destroy(self, instance):
        instance.delete()
        SiteSettings.bump_catalog_revision()
