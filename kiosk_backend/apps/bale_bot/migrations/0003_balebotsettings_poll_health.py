from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bale_bot', '0002_balebotsettings'),
    ]

    operations = [
        migrations.AddField(
            model_name='balebotsettings',
            name='last_poll_at',
            field=models.DateTimeField(
                blank=True,
                help_text='آخرین باری که worker با موفقیت getUpdates زد',
                null=True,
                verbose_name='آخرین دریافت موفق',
            ),
        ),
        migrations.AddField(
            model_name='balebotsettings',
            name='last_poll_error',
            field=models.CharField(
                blank=True,
                default='',
                max_length=500,
                verbose_name='آخرین خطای polling',
            ),
        ),
    ]
