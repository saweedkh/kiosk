from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0018_fulfillment_choice_enabled'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='payment_mode',
            field=models.CharField(
                choices=[
                    ('pos', 'ارسال به کارتخوان (پوز)'),
                    ('direct', 'ثبت مستقیم بدون پوز'),
                    ('mock', 'شبیه‌سازی پرداخت'),
                ],
                default='mock',
                help_text='پوز: انتظار کارتخوان — مستقیم: ثبت فوری بدون پوز — شبیه‌سازی: تست بدون دستگاه',
                max_length=20,
                verbose_name='حالت پرداخت',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='pos_host',
            field=models.CharField(
                blank=True,
                default='',
                help_text='مثلاً 192.168.1.100 — خالی = مقدار پیش‌فرض محیطی',
                max_length=255,
                verbose_name='آی‌پی / میزبان پوز',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='pos_port',
            field=models.PositiveIntegerField(default=1362, verbose_name='پورت پوز'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='pos_timeout',
            field=models.PositiveIntegerField(
                default=30, verbose_name='تایم‌اوت پوز (ثانیه)'
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='pos_merchant_id',
            field=models.CharField(
                blank=True,
                default='',
                max_length=64,
                verbose_name='شناسه پذیرنده (Merchant)',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='pos_terminal_id',
            field=models.CharField(
                blank=True,
                default='',
                max_length=64,
                verbose_name='شناسه ترمینال',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='printer_enabled',
            field=models.BooleanField(
                default=False,
                help_text='اگر خاموش باشد، بعد از پرداخت فیش به پرینتر شبکه ارسال نمی‌شود',
                verbose_name='ارسال فیش به پرینتر',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='printer_host',
            field=models.CharField(
                blank=True,
                default='',
                help_text='مثلاً 192.168.1.100 — خالی = مقدار پیش‌فرض محیطی',
                max_length=255,
                verbose_name='آی‌پی / میزبان پرینتر',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='printer_port',
            field=models.PositiveIntegerField(default=9100, verbose_name='پورت پرینتر'),
        ),
    ]
