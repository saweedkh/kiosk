from typing import Dict, Any, List
from django.core.exceptions import ValidationError
from apps.products.models import Product
from apps.products.selectors.product_selector import ProductSelector
from apps.logs.services.log_service import LogService
from apps.core.exceptions.order import InsufficientStockException


class ProductService:
    """
    Product management service.
    
    This class contains all business logic related to products.
    """
    
    @staticmethod
    def create_product(validated_data: Dict[str, Any]) -> Product:
        """
        Create a new product.
        
        Args:
            validated_data: Dictionary containing validated product data
                - name: Product name
                - description: Product description
                - price: Product price (in Rial)
                - category: Product category
                - stock_quantity: Initial stock quantity
                - image: Product image (optional)
                - is_active: Active/inactive status
                
        Returns:
            Product: Created product instance
            
        Raises:
            ValidationError: If data is invalid
        """
        product = Product.objects.create(**validated_data)
        
        LogService.log_info(
            'product',
            'product_created',
            details={'product_id': product.id, 'name': product.name}
        )
        
        return product
    
    @staticmethod
    def update_product(instance: Product, validated_data: Dict[str, Any]) -> Product:
        """
        Update an existing product.
        
        Args:
            instance: Product instance to update
            validated_data: Dictionary containing fields to update
                
        Returns:
            Product: Updated product instance
            
        Raises:
            ValidationError: If data is invalid
        """
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        LogService.log_info(
            'product',
            'product_updated',
            details={'product_id': instance.id, 'name': instance.name}
        )
        
        return instance
    
    @staticmethod
    def get_active_products() -> List[Product]:
        """
        Get list of active products.
        
        Returns:
            List[Product]: List of active products with stock quantity greater than zero
        """
        return ProductSelector.get_active_products()
    
    @staticmethod
    def get_product_details(product_id: int) -> Product:
        """
        Get complete details of a product.
        
        Args:
            product_id: Product ID
            
        Returns:
            Product: Product instance with all details (including category)
            
        Raises:
            Product.DoesNotExist: If product does not exist
        """
        try:
            return ProductSelector.get_product_with_details(product_id)
        except Product.DoesNotExist:
            LogService.log_error(
                'product',
                'product_not_found',
                details={'product_id': product_id}
            )
            raise
    
    @staticmethod
    def search_products(query: str) -> List[Product]:
        """
        Search products by name and description.
        
        Args:
            query: Search query string
            
        Returns:
            List[Product]: List of products matching the search query
        """
        return ProductSelector.search_products(query)
    
    @staticmethod
    def check_stock(product_id: int, quantity: int) -> Product:
        """
        Check product stock availability.
        
        Args:
            product_id: Product ID
            quantity: Required quantity
            
        Returns:
            Product: Product instance if sufficient stock is available
            
        Raises:
            InsufficientStockException: If insufficient stock
            Product.DoesNotExist: If product does not exist
        """
        product = Product.objects.get(id=product_id)
        if product.stock_quantity < quantity:
            LogService.log_warning(
                'product',
                'insufficient_stock',
                details={
                    'product_id': product_id,
                    'requested': quantity,
                    'available': product.stock_quantity
                }
            )
            raise InsufficientStockException(
                f'Insufficient stock. Available: {product.stock_quantity}, Requested: {quantity}'
            )
        return product

