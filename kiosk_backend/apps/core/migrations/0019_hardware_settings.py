from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0018_fulfillment_choice_enabled'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='pos_ip',
            field=models.CharField(
                default='192.168.1.102',
                help_text='آدرس IP دستگاه POS روی شبکه محلی',
                max_length=45,
                verbose_name='آی‌پی کارتخوان',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='pos_port',
            field=models.PositiveIntegerField(
                default=1362,
                help_text='پورت TCP دستگاه POS (معمولاً 1362)',
                verbose_name='پورت کارتخوان',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='printer_enabled',
            field=models.BooleanField(
                default=True,
                help_text='اگر خاموش باشد، فیش بعد از پرداخت چاپ نمی‌شود',
                verbose_name='فعال‌سازی چاپگر',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='printer_ip',
            field=models.CharField(
                default='192.168.1.100',
                help_text='آدرس IP پرینتر حرارتی ESC/POS',
                max_length=45,
                verbose_name='آی‌پی چاپگر',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='printer_port',
            field=models.PositiveIntegerField(
                default=9100,
                help_text='پورت TCP پرینتر (معمولاً 9100)',
                verbose_name='پورت چاپگر',
            ),
        ),
    ]
