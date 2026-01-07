# Generated migration to assign default category to products without category
# and make category field required

from django.db import migrations, models
import django.db.models.deletion
import sys
import io


def assign_default_category(apps, schema_editor):
    """
    Assign default category to all products that don't have a category.
    Uses the first active category, or creates a default category if none exists.
    """
    Product = apps.get_model('products', 'Product')
    Category = apps.get_model('products', 'Category')
    
    # Get products without category
    products_without_category = Product.objects.filter(category__isnull=True)
    count = products_without_category.count()
    
    if count > 0:
        # Try to get first active category
        default_category = Category.objects.filter(is_active=True).first()
        
        # If no active category exists, get any category
        if not default_category:
            default_category = Category.objects.first()
        
        # If still no category exists, create a default one
        if not default_category:
            default_category = Category.objects.create(
                name='دسته‌بندی پیش‌فرض',
                is_active=True,
                display_order=0
            )
        
        # Assign default category to all products without category
        products_without_category.update(category=default_category)
        # Use ASCII-safe output for Windows compatibility
        try:
            print(f'[OK] {count} محصول بدون category به دسته‌بندی "{default_category.name}" اختصاص داده شد.')
        except UnicodeEncodeError:
            # Fallback for Windows console with cp1252 encoding
            print(f'[OK] {count} products assigned to default category.')
    else:
        try:
            print('[OK] همه محصولات دارای category هستند.')
        except UnicodeEncodeError:
            print('[OK] All products have category.')


def reverse_assign_default_category(apps, schema_editor):
    """
    Reverse migration: This is a data migration, so we can't really reverse it.
    We'll just pass since we can't know which products originally had null category.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0002_remove_product_min_stock_level'),
    ]

    operations = [
        # Step 1: Assign default category to products without category
        migrations.RunPython(
            assign_default_category,
            reverse_assign_default_category,
        ),
        
        # Step 2: Make category field required (null=False)
        migrations.AlterField(
            model_name='product',
            name='category',
            field=models.ForeignKey(
                help_text='دسته‌بندی محصول اجباری است',
                on_delete=django.db.models.deletion.PROTECT,
                related_name='products',
                to='products.category',
                verbose_name='دسته‌بندی'
            ),
        ),
    ]

