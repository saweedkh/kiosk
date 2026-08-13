from django.db import migrations, models


PACKAGING_TITLE_DEFAULT = 'هزینه بسته‌بندی'


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0021_service_title_and_amount_by_fulfillment'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='packaging_enabled',
            field=models.BooleanField(
                default=False,
                help_text='اگر روشن باشد، هزینه بسته‌بندی برای نوع سفارش انتخاب‌شده اعمال می‌شود',
                verbose_name='فعال‌سازی بسته‌بندی',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='packaging_title_dine_in',
            field=models.CharField(
                blank=True,
                default=PACKAGING_TITLE_DEFAULT,
                max_length=80,
                verbose_name='عنوان بسته‌بندی داخل سالن',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='packaging_title_takeaway',
            field=models.CharField(
                blank=True,
                default=PACKAGING_TITLE_DEFAULT,
                max_length=80,
                verbose_name='عنوان بسته‌بندی بیرون‌بر',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='packaging_fee_dine_in_amount',
            field=models.PositiveIntegerField(
                default=0,
                verbose_name='مبلغ بسته‌بندی داخل سالن (ریال)',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='packaging_fee_takeaway_amount',
            field=models.PositiveIntegerField(
                default=0,
                verbose_name='مبلغ بسته‌بندی بیرون‌بر (ریال)',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='packaging_fee_dine_in',
            field=models.BooleanField(
                default=True,
                verbose_name='اعمال بسته‌بندی روی داخل سالن',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='packaging_fee_takeaway',
            field=models.BooleanField(
                default=True,
                verbose_name='اعمال بسته‌بندی روی بیرون‌بر',
            ),
        ),
        migrations.AlterField(
            model_name='sitesettings',
            name='service_enabled',
            field=models.BooleanField(
                default=False,
                help_text='اگر روشن باشد، هزینه سرویس برای نوع سفارش انتخاب‌شده یک‌بار به فاکتور اضافه می‌شود',
                verbose_name='فعال‌سازی سرویس',
            ),
        ),
    ]
