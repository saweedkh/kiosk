from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_receipt_template_mode'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='service_enabled',
            field=models.BooleanField(
                default=False,
                help_text='در صورت فعال بودن، مبلغ سرویس به جمع فاکتور اضافه می‌شود',
                verbose_name='فعال‌سازی سرویس',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='service_fee',
            field=models.PositiveIntegerField(
                default=0,
                help_text='مبلغ سرویس به ریال که هنگام فعال بودن به مبلغ کل اضافه می‌شود',
                verbose_name='مبلغ سرویس (ریال)',
            ),
        ),
    ]
