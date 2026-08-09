from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_dashboard_ab_coupons_options'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='landing_bg_color',
            field=models.CharField(
                blank=True,
                default='',
                help_text='رنگ هگز پس‌زمینه (مثلاً #FFF3E8). خالی = پیش‌فرض تم',
                max_length=7,
                verbose_name='رنگ پس‌زمینه لندینگ',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='landing_text_color',
            field=models.CharField(
                blank=True,
                default='',
                help_text='رنگ هگز متن اصلی. خالی = پیش‌فرض تم',
                max_length=7,
                verbose_name='رنگ متن لندینگ',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='landing_muted_color',
            field=models.CharField(
                blank=True,
                default='',
                help_text='رنگ هگز تگ‌لاین و متن کم‌رنگ. خالی = پیش‌فرض تم',
                max_length=7,
                verbose_name='رنگ متن ثانویه لندینگ',
            ),
        ),
    ]
