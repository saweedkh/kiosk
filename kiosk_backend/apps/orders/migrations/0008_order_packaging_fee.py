from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0007_dashboard_ab_coupons_options'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='packaging_fee',
            field=models.PositiveIntegerField(
                default=0,
                help_text='مبلغ بسته‌بندی اضافه‌شده به این سفارش (ریال)',
                verbose_name='مبلغ بسته‌بندی',
            ),
        ),
    ]
