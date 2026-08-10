import os

from django.db import migrations, models


def seed_protocol_from_env(apps, schema_editor):
    """Copy legacy protocol env into SiteSettings when still at defaults."""
    SiteSettings = apps.get_model('core', 'SiteSettings')
    site = SiteSettings.objects.filter(pk=1).first()
    if site is None:
        return

    updated = []

    fmt = (os.getenv('POS_MESSAGE_FORMAT') or '').strip()
    allowed = {
        'pardakht_novin_official',
        'dll_exact',
        'with_rq_and_banner',
        'with_length',
        'with_stx_etx',
        'with_terminator',
        'with_null',
    }
    if fmt in allowed and site.pos_message_format == 'pardakht_novin_official' and fmt != 'pardakht_novin_official':
        site.pos_message_format = fmt
        updated.append('pos_message_format')

    simple = os.getenv('POS_USE_SIMPLE_FORMAT')
    if simple is not None and str(simple).strip() != '':
        want = str(simple).strip().lower() in ('1', 'true', 'yes')
        if site.pos_use_simple_format != want:
            site.pos_use_simple_format = want
            updated.append('pos_use_simple_format')

    banner = (os.getenv('POS_BANNER') or '').strip()
    if banner and (site.pos_banner or '') in ('', 'R2023tejaratEParsian'):
        site.pos_banner = banner
        updated.append('pos_banner')

    delay = os.getenv('MOCK_PAYMENT_DELAY')
    if delay and float(site.mock_payment_delay) == 3.0:
        try:
            site.mock_payment_delay = float(delay)
            updated.append('mock_payment_delay')
        except ValueError:
            pass

    mock_ok = os.getenv('MOCK_PAYMENT_SUCCESS')
    if mock_ok is not None and str(mock_ok).strip() != '':
        want = str(mock_ok).strip().lower() in ('1', 'true', 'yes')
        if site.mock_payment_success != want:
            site.mock_payment_success = want
            updated.append('mock_payment_success')

    if updated:
        fields = updated + (['updated_at'] if hasattr(site, 'updated_at') else [])
        site.save(update_fields=fields)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0020_seed_hardware_from_env'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='pos_message_format',
            field=models.CharField(
                choices=[
                    ('pardakht_novin_official', 'پرداخت نوین (پیشنهادی)'),
                    ('dll_exact', 'دقیق DLL'),
                    ('with_rq_and_banner', 'با بنر RQ'),
                    ('with_length', 'با پیشوند طول'),
                    ('with_stx_etx', 'STX/ETX'),
                    ('with_terminator', 'با terminator'),
                    ('with_null', 'با null'),
                ],
                default='pardakht_novin_official',
                help_text='معادل POS_MESSAGE_FORMAT در .env — برای PNA معمولاً پرداخت نوین',
                max_length=40,
                verbose_name='فرمت پیام پوز',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='pos_use_simple_format',
            field=models.BooleanField(
                default=True,
                help_text='معادل POS_USE_SIMPLE_FORMAT — برای PNA معمولاً روشن',
                verbose_name='فرمت ساده پوز',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='pos_banner',
            field=models.CharField(
                blank=True,
                default='R2023tejaratEParsian',
                help_text='معادل POS_BANNER — فقط برای فرمت with_rq_and_banner',
                max_length=128,
                verbose_name='بنر پوز',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='mock_payment_delay',
            field=models.FloatField(
                default=3.0,
                help_text='معادل MOCK_PAYMENT_DELAY',
                verbose_name='تأخیر شبیه‌سازی پرداخت (ثانیه)',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='mock_payment_success',
            field=models.BooleanField(
                default=True,
                help_text='معادل MOCK_PAYMENT_SUCCESS',
                verbose_name='موفقیت شبیه‌سازی پرداخت',
            ),
        ),
        migrations.RunPython(seed_protocol_from_env, noop_reverse),
    ]
