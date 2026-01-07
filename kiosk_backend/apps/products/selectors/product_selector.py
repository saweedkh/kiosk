from typing import List, Optional
from django.db.models import Q, F, Prefetch, QuerySet
from apps.products.models import Product


class ProductSelector:
    """
    Product query selector.
    
    This class encapsulates all database queries related to products
    with optimized queries using select_related and prefetch_related.
    """
    
    @staticmethod
    def get_active_products() -> QuerySet[Product]:
        """
        Get all active products with category information.
        Products with stock are ordered first.
        
        Returns:
            QuerySet[Product]: QuerySet of active products with category prefetched,
            ordered by stock availability (products with stock first)
        """
        return Product.objects.active().select_related('category').order_by(
            '-stock_quantity',  # Products with stock first (descending order)
            'name'  # Then by name for consistent ordering
        )
    
    @staticmethod
    def get_products_with_stock() -> QuerySet[Product]:
        """
        Get products that are active and have stock available.
        
        Returns:
            QuerySet[Product]: QuerySet of products with stock > 0 and is_active=True
        """
        return Product.objects.filter(
            stock_quantity__gt=0,
            is_active=True
        ).select_related('category')
    
    @staticmethod
    def get_products_by_category(category_id: int) -> QuerySet[Product]:
        """
        Get active products with stock by category.
        Products with more stock are ordered first.
        
        Args:
            category_id: Category ID
            
        Returns:
            QuerySet[Product]: QuerySet of products in specified category,
            ordered by stock quantity (descending)
        """
        return Product.objects.filter(
            category_id=category_id,
            is_active=True,
            stock_quantity__gt=0
        ).select_related('category').order_by(
            '-stock_quantity',  # Products with more stock first
            'name'  # Then by name for consistent ordering
        )
    
    @staticmethod
    def search_products(query: str) -> QuerySet[Product]:
        """
        Search products by name or description.
        Products with stock are ordered first.
        
        Args:
            query: Search query string
            
        Returns:
            QuerySet[Product]: QuerySet of products matching search query,
            ordered by stock availability (products with stock first)
        """
        return Product.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query),
            is_active=True
        ).select_related('category').order_by(
            '-stock_quantity',  # Products with stock first (descending order)
            'name'  # Then by name for consistent ordering
        )
    
    @staticmethod
    def get_product_with_details(product_id: int) -> Product:
        """
        Get product with all related details including category and stock history.
        
        Args:
            product_id: Product ID
            
        Returns:
            Product: Product instance with category and stock_history prefetched
            
        Raises:
            Product.DoesNotExist: If product does not exist
        """
        return Product.objects.select_related(
            'category'
        ).prefetch_related(
            'stock_history'
        ).get(id=product_id)
    
    @staticmethod
    def get_all_products() -> QuerySet[Product]:
        """
        Get all products regardless of status.
        
        Returns:
            QuerySet[Product]: QuerySet of all products with category prefetched
        """
        return Product.objects.all().select_related('category')

