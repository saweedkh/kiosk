from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_receipt_copy_mode'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='service_fee_dine_in',
            field=models.BooleanField(
                default=True,
                help_text='اگر روشن باشد، هزینه سرویس برای سفارش‌های داخل سالن اعمال می‌شود',
                verbose_name='اعمال سرویس روی داخل سالن',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='service_fee_takeaway',
            field=models.BooleanField(
                default=True,
                help_text='اگر روشن باشد، هزینه سرویس برای سفارش‌های بیرون‌بر اعمال می‌شود',
                verbose_name='اعمال سرویس روی بیرون‌بر',
            ),
        ),
    ]
