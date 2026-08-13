from django.db import migrations, models


DINE_IN_DEFAULT = 'سرویس داخل سالن'
TAKEAWAY_DEFAULT = 'سرویس بیرون‌بر'


def copy_legacy_service_fee(apps, schema_editor):
    SiteSettings = apps.get_model('core', 'SiteSettings')
    for row in SiteSettings.objects.all():
        fee = int(row.service_fee or 0)
        row.service_fee_dine_in_amount = fee
        row.service_fee_takeaway_amount = fee
        if not (row.service_title_dine_in or '').strip():
            row.service_title_dine_in = DINE_IN_DEFAULT
        if not (row.service_title_takeaway or '').strip():
            row.service_title_takeaway = TAKEAWAY_DEFAULT
        row.save(
            update_fields=[
                'service_fee_dine_in_amount',
                'service_fee_takeaway_amount',
                'service_title_dine_in',
                'service_title_takeaway',
            ]
        )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0020_pos_payment_mode'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='service_title_dine_in',
            field=models.CharField(
                blank=True,
                default=DINE_IN_DEFAULT,
                help_text='عنوان نمایشی روی سبد و فیش برای سفارش داخل سالن',
                max_length=80,
                verbose_name='عنوان سرویس داخل سالن',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='service_title_takeaway',
            field=models.CharField(
                blank=True,
                default=TAKEAWAY_DEFAULT,
                help_text='عنوان نمایشی روی سبد و فیش برای سفارش بیرون‌بر',
                max_length=80,
                verbose_name='عنوان سرویس بیرون‌بر',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='service_fee_dine_in_amount',
            field=models.PositiveIntegerField(
                default=0,
                help_text='مبلغ ثابت سرویس برای سفارش داخل سالن (ریال). روی کل فاکتور فقط یک‌بار اضافه می‌شود',
                verbose_name='مبلغ سرویس داخل سالن (ریال)',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='service_fee_takeaway_amount',
            field=models.PositiveIntegerField(
                default=0,
                help_text='مبلغ ثابت سرویس برای سفارش بیرون‌بر (ریال). روی کل فاکتور فقط یک‌بار اضافه می‌شود',
                verbose_name='مبلغ سرویس بیرون‌بر (ریال)',
            ),
        ),
        migrations.AlterField(
            model_name='sitesettings',
            name='service_enabled',
            field=models.BooleanField(
                default=False,
                help_text='اگر روشن باشد، برای سفارش‌هایی که حداقل یک محصول با تیک سرویس دارند یک‌بار مبلغ همان نوع سفارش اعمال می‌شود',
                verbose_name='فعال‌سازی سرویس',
            ),
        ),
        migrations.AlterField(
            model_name='sitesettings',
            name='service_fee',
            field=models.PositiveIntegerField(
                default=0,
                help_text='سازگاری قدیمی: با مبلغ سرویس داخل سالن همگام می‌شود',
                verbose_name='مبلغ سرویس (ریال)',
            ),
        ),
        migrations.RunPython(copy_legacy_service_fee, migrations.RunPython.noop),
    ]
