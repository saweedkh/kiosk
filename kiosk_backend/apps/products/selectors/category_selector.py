from apps.products.models import Category


class CategorySelector:
    @staticmethod
    def get_active_categories():
        return Category.objects.active().order_by('display_order', 'name')
    
    @staticmethod
    def get_root_categories():
        return Category.objects.root_categories().order_by('display_order', 'name')
    
    @staticmethod
    def get_category_with_children(category_id):
        return Category.objects.prefetch_related(
            'children'
        ).get(id=category_id)
    
    @staticmethod
    def get_category_products(category_id):
        from apps.products.models import Product
        return Product.objects.filter(
            category_id=category_id,
            is_active=True
        ).select_related('category').order_by(
            '-stock_quantity',  # Products with stock first (descending order)
            'name'  # Then by name for consistent ordering
        )

