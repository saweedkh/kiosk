from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0022_packaging_fee_by_fulfillment'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='kiosk_payment_cancel_enabled',
            field=models.BooleanField(
                default=False,
                help_text='اگر فعال باشد، در مودال پرداخت کیوسک دکمه «لغو پرداخت» نمایش داده می‌شود',
                verbose_name='دکمه لغو پرداخت در کیوسک',
            ),
        ),
    ]
