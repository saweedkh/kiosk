"""
One-time: copy legacy POS/printer env into SiteSettings if still at defaults.
After this, admin panel is the source of truth (HardwareConfig ignores env).
"""

import os

from django.db import migrations


def seed_from_env(apps, schema_editor):
    SiteSettings = apps.get_model('core', 'SiteSettings')
    site = SiteSettings.objects.filter(pk=1).first()
    if site is None:
        return

    updated = []

    gw = (os.getenv('PAYMENT_GATEWAY_NAME') or '').strip().lower()
    if gw in ('pos', 'mock', 'direct') and site.payment_mode == 'mock' and gw != 'mock':
        site.payment_mode = gw
        updated.append('payment_mode')

    host = (os.getenv('POS_TCP_HOST') or '').strip()
    if host and not (site.pos_host or '').strip():
        site.pos_host = host
        updated.append('pos_host')

    port = os.getenv('POS_TCP_PORT')
    if port and str(site.pos_port) == '1362':
        try:
            site.pos_port = int(port)
            updated.append('pos_port')
        except ValueError:
            pass

    timeout = os.getenv('POS_TIMEOUT')
    if timeout and str(site.pos_timeout) == '30':
        try:
            site.pos_timeout = int(timeout)
            updated.append('pos_timeout')
        except ValueError:
            pass

    merchant = (os.getenv('PAYMENT_GATEWAY_MERCHANT_ID') or '').strip()
    if merchant and not (site.pos_merchant_id or '').strip():
        site.pos_merchant_id = merchant
        updated.append('pos_merchant_id')

    terminal = (os.getenv('PAYMENT_GATEWAY_TERMINAL_ID') or '').strip()
    if terminal and not (site.pos_terminal_id or '').strip():
        site.pos_terminal_id = terminal
        updated.append('pos_terminal_id')

    if os.getenv('PRINTER_ENABLED', '').lower() in ('1', 'true', 'yes'):
        if not site.printer_enabled:
            site.printer_enabled = True
            updated.append('printer_enabled')

    printer_ip = (os.getenv('PRINTER_IP') or '').strip()
    if printer_ip and not (site.printer_host or '').strip():
        site.printer_host = printer_ip
        updated.append('printer_host')

    printer_port = os.getenv('PRINTER_PORT')
    if printer_port and str(site.printer_port) == '9100':
        try:
            site.printer_port = int(printer_port)
            updated.append('printer_port')
        except ValueError:
            pass

    if updated:
        site.save(update_fields=updated + ['updated_at'] if hasattr(site, 'updated_at') else updated)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0019_pos_printer_settings'),
    ]

    operations = [
        migrations.RunPython(seed_from_env, noop_reverse),
    ]
