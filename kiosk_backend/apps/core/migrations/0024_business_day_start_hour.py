from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0023_kiosk_payment_cancel_enabled'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='business_day_start_hour',
            field=models.PositiveSmallIntegerField(
                default=7,
                help_text='ساعت شروع «روز کاری» برای گزارشات (مثلاً ۷ = از ۰۷:۰۰ تا ۰۷:۰۰ فردا)',
                verbose_name='شروع روز کاری (ساعت)',
            ),
        ),
    ]
