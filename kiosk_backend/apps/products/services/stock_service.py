from typing import Optional
from django.contrib.auth import get_user_model
from apps.products.models import Product, StockHistory
from apps.logs.services.log_service import LogService

User = get_user_model()


class StockService:
    """
    Stock management service.
    
    This class handles all stock-related operations including
    stock updates, increases, and decreases with history tracking.
    """
    
    @staticmethod
    def update_stock(
        product_id: int,
        new_quantity: int,
        change_type: str = 'manual',
        admin_user: Optional[User] = None,
        notes: str = '',
        related_order_id: Optional[int] = None
    ) -> Product:
        """
        Update product stock quantity and create stock history record.
        
        Args:
            product_id: Product ID
            new_quantity: New stock quantity
            change_type: Type of change ('manual', 'sale', 'increase', 'decrease')
            admin_user: Admin user who made the change (optional)
            notes: Additional notes about the change
            related_order_id: Related order ID if applicable (optional)
            
        Returns:
            Product: Updated product instance
            
        Raises:
            Product.DoesNotExist: If product does not exist
        """
        product = Product.objects.get(id=product_id)
        previous_quantity = product.stock_quantity
        
        product.stock_quantity = new_quantity
        product.save()
        
        StockHistory.objects.create(
            product=product,
            previous_quantity=previous_quantity,
            new_quantity=new_quantity,
            change_type=change_type,
            admin_user=admin_user,
            notes=notes,
            related_order_id=related_order_id
        )
        
        LogService.log_info(
            'product',
            'stock_updated',
            user=admin_user,
            details={
                'product_id': product_id,
                'previous_quantity': previous_quantity,
                'new_quantity': new_quantity,
                'change_type': change_type
            }
        )
        
        return product
    
    @staticmethod
    def decrease_stock(product_id: int, quantity: int, related_order_id: Optional[int] = None) -> Product:
        """
        Decrease product stock quantity.
        
        Args:
            product_id: Product ID
            quantity: Quantity to decrease
            related_order_id: Related order ID if applicable (optional)
            
        Returns:
            Product: Updated product instance
            
        Raises:
            Product.DoesNotExist: If product does not exist
            ValueError: If insufficient stock available
        """
        product = Product.objects.get(id=product_id)
        new_quantity = product.stock_quantity - quantity
        
        if new_quantity < 0:
            LogService.log_error(
                'product',
                'stock_decrease_failed',
                details={
                    'product_id': product_id,
                    'current_stock': product.stock_quantity,
                    'requested_decrease': quantity
                }
            )
            raise ValueError('Insufficient stock')
        
        return StockService.update_stock(
            product_id=product_id,
            new_quantity=new_quantity,
            change_type='sale',
            notes=f'Decreased by {quantity}',
            related_order_id=related_order_id
        )
    
    @staticmethod
    def increase_stock(
        product_id: int,
        quantity: int,
        admin_user: Optional[User] = None,
        notes: str = ''
    ) -> Product:
        """
        Increase product stock quantity.
        
        Args:
            product_id: Product ID
            quantity: Quantity to increase
            admin_user: Admin user who made the change (optional)
            notes: Additional notes about the change
            
        Returns:
            Product: Updated product instance
            
        Raises:
            Product.DoesNotExist: If product does not exist
        """
        product = Product.objects.get(id=product_id)
        new_quantity = product.stock_quantity + quantity
        
        return StockService.update_stock(
            product_id=product_id,
            new_quantity=new_quantity,
            change_type='increase',
            admin_user=admin_user,
            notes=notes or f'Increased by {quantity}'
        )

