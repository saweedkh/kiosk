from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0019_hardware_settings'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='mock_payment_delay',
            field=models.PositiveSmallIntegerField(
                default=3,
                help_text='فقط در حالت آزمایشی — شبیه‌سازی زمان پردازش کارتخوان',
                verbose_name='تأخیر Mock (ثانیه)',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='mock_payment_success_rate',
            field=models.PositiveSmallIntegerField(
                default=100,
                help_text='۱۰۰ = همیشه موفق؛ کمتر = احتمال رد تراکنش برای تست',
                verbose_name='نرخ موفقیت Mock (٪)',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='pos_payment_mode',
            field=models.CharField(
                choices=[('mock', 'آزمایشی (Mock)'), ('real', 'واقعی (کارتخوان)')],
                default='real',
                help_text='آزمایشی: بدون کارتخوان واقعی. واقعی: ارسال مبلغ به دستگاه پرداخت.',
                max_length=10,
                verbose_name='حالت پرداخت POS',
            ),
        ),
    ]
