from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_landing_theme_settings'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='catalog_revision',
            field=models.PositiveIntegerField(
                default=0,
                help_text='با هر تغییر محصول/دسته افزایش می‌یابد؛ کiosk با این عدد کش منو را تازه می‌کند',
                verbose_name='نسخه کاتالوگ',
            ),
        ),
    ]
