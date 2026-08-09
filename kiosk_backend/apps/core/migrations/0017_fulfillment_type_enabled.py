from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0016_coupons_enabled'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='dine_in_enabled',
            field=models.BooleanField(
                default=True,
                help_text='اگر خاموش باشد، مشتری نمی‌تواند نوع سفارش داخل سالن را انتخاب کند',
                verbose_name='فعال‌سازی داخل سالن',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='takeaway_enabled',
            field=models.BooleanField(
                default=True,
                help_text='اگر خاموش باشد، مشتری نمی‌تواند نوع سفارش بیرون‌بر را انتخاب کند',
                verbose_name='فعال‌سازی بیرون‌بر',
            ),
        ),
    ]
