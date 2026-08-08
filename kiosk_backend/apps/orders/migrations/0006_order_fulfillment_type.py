from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_add_order_service_fee'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='fulfillment_type',
            field=models.CharField(
                choices=[('dine_in', 'داخل سالن'), ('takeaway', 'بیرون‌بر')],
                default='dine_in',
                help_text='داخل سالن یا بیرون‌بر',
                max_length=20,
                verbose_name='نوع سفارش',
            ),
        ),
    ]
