from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0017_fulfillment_type_enabled'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='fulfillment_choice_enabled',
            field=models.BooleanField(
                default=True,
                help_text='اگر خاموش باشد، انتخاب داخل‌سالن/بیرون‌بر در کیوسک نمایش داده نمی‌شود',
                verbose_name='فعال‌سازی انتخاب نوع سفارش',
            ),
        ),
    ]
