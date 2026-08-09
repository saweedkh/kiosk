from typing import List, Optional
from django.db.models import Q, F, Prefetch, QuerySet
from apps.products.models import Product, ProductOptionGroup, ProductOption


class ProductSelector:
    """
    Product query selector.
    
    This class encapsulates all database queries related to products
    with optimized queries using select_related and prefetch_related.
    """

    @staticmethod
    def _options_prefetch():
        return Prefetch(
            'option_groups',
            queryset=ProductOptionGroup.objects.filter(is_active=True)
            .prefetch_related(
                Prefetch(
                    'options',
                    queryset=ProductOption.objects.filter(is_active=True).order_by(
                        'display_order', 'id'
                    ),
                )
            )
            .order_by('display_order', 'id'),
        )
    
    @staticmethod
    def get_active_products() -> QuerySet[Product]:
        return (
            Product.objects.active()
            .select_related('category')
            .prefetch_related(ProductSelector._options_prefetch())
            .order_by('-stock_quantity', 'name')
        )
    
    @staticmethod
    def get_products_with_stock() -> QuerySet[Product]:
        return Product.objects.filter(
            stock_quantity__gt=0,
            is_active=True
        ).select_related('category').prefetch_related(ProductSelector._options_prefetch())
    
    @staticmethod
    def get_products_by_category(category_id: int) -> QuerySet[Product]:
        return Product.objects.filter(
            category_id=category_id,
            is_active=True,
            stock_quantity__gt=0
        ).select_related('category').prefetch_related(
            ProductSelector._options_prefetch()
        ).order_by('-stock_quantity', 'name')
    
    @staticmethod
    def search_products(query: str) -> QuerySet[Product]:
        return Product.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query),
            is_active=True
        ).select_related('category').prefetch_related(
            ProductSelector._options_prefetch()
        ).order_by('-stock_quantity', 'name')
    
    @staticmethod
    def get_product_with_details(product_id: int) -> Product:
        return Product.objects.select_related(
            'category'
        ).prefetch_related(
            'stock_history',
            ProductSelector._options_prefetch(),
        ).get(id=product_id)
    
    @staticmethod
    def get_all_products() -> QuerySet[Product]:
        return Product.objects.all().select_related('category')

