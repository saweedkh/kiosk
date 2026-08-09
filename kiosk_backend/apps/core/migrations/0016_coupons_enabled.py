from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0015_cart_layout'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='coupons_enabled',
            field=models.BooleanField(
                default=True,
                help_text='اگر خاموش باشد، فیلد کد تخفیف در سبد مشتری نمایش داده نمی‌شود و اعمال کوپن رد می‌شود',
                verbose_name='فعال‌سازی کوپن تخفیف',
            ),
        ),
    ]
