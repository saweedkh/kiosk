from django.contrib import admin
from django.db.models import ProtectedError
from django.contrib import messages
from django.utils.translation import gettext_lazy as _
from apps.products.models import Product, Category, StockHistory


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'display_order', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']
    ordering = ['display_order', 'name']
    
    def delete_model(self, request, obj):
        """
        Override delete_model to handle ProtectedError when category has products.
        """
        try:
            super().delete_model(request, obj)
        except ProtectedError as e:
            # Count products in this category
            products_count = obj.products.count()
            error_message = _(
                f'نمی‌توانید دسته‌بندی "{obj.name}" را حذف کنید زیرا {products_count} محصول به آن متصل است. '
                'لطفاً ابتدا محصولات را به دسته‌بندی دیگری منتقل کنید یا حذف کنید.'
            )
            messages.error(request, error_message)
            raise


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'stock_quantity', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['is_in_stock', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'category', 'image')
        }),
        ('Pricing', {
            'fields': ('price',)
        }),
        ('Stock', {
            'fields': ('stock_quantity', 'is_in_stock')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(StockHistory)
class StockHistoryAdmin(admin.ModelAdmin):
    list_display = ['product', 'previous_quantity', 'new_quantity', 'change_type', 'created_at']
    list_filter = ['change_type', 'created_at']
    search_fields = ['product__name']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
