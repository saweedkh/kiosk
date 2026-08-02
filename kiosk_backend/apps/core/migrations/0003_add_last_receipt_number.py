from django.db import migrations, models


def seed_last_receipt_number(apps, schema_editor):
    SiteSettings = apps.get_model('core', 'SiteSettings')
    Order = apps.get_model('orders', 'Order')

    max_receipt = (
        Order.objects.exclude(receipt_number__isnull=True)
        .exclude(receipt_number__lte=0)
        .order_by('-receipt_number')
        .values_list('receipt_number', flat=True)
        .first()
    ) or 0

    settings, _ = SiteSettings.objects.get_or_create(
        pk=1,
        defaults={
            'site_name': 'فروشگاه',
            'copyright_text': '© تمامی حقوق محفوظ است',
            'last_receipt_number': max_receipt,
        },
    )
    if settings.last_receipt_number < max_receipt:
        settings.last_receipt_number = max_receipt
        settings.save(update_fields=['last_receipt_number'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_add_receipt_header_footer'),
        ('orders', '0004_allow_product_deletion'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='last_receipt_number',
            field=models.PositiveIntegerField(
                default=0,
                help_text='آخرین شماره فیش تخصیص‌داده‌شده؛ فیش بعدی این مقدار + ۱ است',
                verbose_name='آخرین شماره فیش',
            ),
        ),
        migrations.RunPython(seed_last_receipt_number, migrations.RunPython.noop),
    ]
