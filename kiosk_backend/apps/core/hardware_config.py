"""
Resolve POS and printer settings from SiteSettings (DB), with env fallbacks.
"""
from __future__ import annotations

from typing import Any, Dict

from django.conf import settings as django_settings


def get_pos_config() -> Dict[str, Any]:
    from apps.core.models.settings import SiteSettings

    site = SiteSettings.get_settings()
    env = getattr(django_settings, 'PAYMENT_GATEWAY_CONFIG', {}) or {}
    host = (getattr(site, 'pos_ip', None) or '').strip()
    if not host:
        host = (env.get('tcp_host') or env.get('POS_TCP_HOST') or '192.168.1.102').strip()
    port = getattr(site, 'pos_port', None) or env.get('tcp_port') or env.get('POS_TCP_PORT') or 1362
    return {
        'tcp_host': host,
        'tcp_port': int(port),
    }


def get_printer_config() -> Dict[str, Any]:
    from apps.core.models.settings import SiteSettings

    site = SiteSettings.get_settings()
    env_enabled = bool(getattr(django_settings, 'PRINTER_ENABLED', False))
    enabled = getattr(site, 'printer_enabled', env_enabled)
    ip = (getattr(site, 'printer_ip', None) or '').strip()
    if not ip:
        ip = getattr(django_settings, 'PRINTER_IP', '192.168.1.100')
    port = getattr(site, 'printer_port', None) or getattr(django_settings, 'PRINTER_PORT', 9100)
    return {
        'enabled': bool(enabled),
        'ip': ip,
        'port': int(port),
    }


def merge_payment_gateway_config(config: Dict[str, Any] | None = None) -> Dict[str, Any]:
    from apps.core.models.settings import SiteSettings

    site = SiteSettings.get_settings()
    cfg = dict(config if config is not None else django_settings.PAYMENT_GATEWAY_CONFIG)
    cfg.update(get_pos_config())

    mode = (getattr(site, 'pos_payment_mode', None) or SiteSettings.POS_PAYMENT_MODE_REAL).strip().lower()
    if mode == SiteSettings.POS_PAYMENT_MODE_MOCK:
        cfg['gateway_name'] = 'mock'
        delay = getattr(site, 'mock_payment_delay', None)
        if delay is not None:
            cfg['mock_payment_delay'] = max(1.0, float(delay))
        rate = getattr(site, 'mock_payment_success_rate', None)
        if rate is not None:
            rate_int = max(0, min(100, int(rate)))
            cfg['mock_payment_success_rate'] = rate_int
            cfg['mock_payment_success'] = rate_int >= 100

    return cfg
