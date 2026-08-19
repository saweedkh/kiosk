from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0024_business_day_start_hour'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='business_day_start_minute',
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text='دقیقه شروع روز کاری (۰–۵۹)',
                verbose_name='شروع روز کاری (دقیقه)',
            ),
        ),
    ]
