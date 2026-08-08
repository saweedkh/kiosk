from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0003_assign_default_category_and_make_required'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='service_fee_applicable',
            field=models.BooleanField(
                default=False,
                help_text='اگر فعال باشد، هزینه سرویس تنظیمات یک‌بار روی فاکتوری که این محصول در آن باشد اعمال می‌شود',
                verbose_name='اعمال هزینه سرویس',
            ),
        ),
    ]
