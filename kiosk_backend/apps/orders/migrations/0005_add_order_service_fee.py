from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0004_allow_product_deletion'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='service_fee',
            field=models.PositiveIntegerField(
                default=0,
                help_text='مبلغ سرویس اضافه‌شده به این سفارش (ریال)',
                verbose_name='مبلغ سرویس',
            ),
        ),
    ]
