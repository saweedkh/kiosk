"""
POS / printer runtime config — SiteSettings (Admin → Settings → Hardware)
is the source of truth. Values mirror the former .env payment/POS keys.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

_DEFAULT_POS_PORT = 1362
_DEFAULT_POS_TIMEOUT = 30
_DEFAULT_PRINTER_PORT = 9100
_DEFAULT_MESSAGE_FORMAT = 'pardakht_novin_official'
_DEFAULT_BANNER = 'R2023tejaratEParsian'


def _safe_site():
    try:
        from apps.core.models.settings import SiteSettings

        return SiteSettings.get_settings()
    except Exception:
        logger.exception(
            'Failed to load SiteSettings for hardware config; '
            'falling back to safe defaults (payment may be mock).'
        )
        return None


def _as_int(value: Any, default: int) -> int:
    try:
        if value is None or value == '':
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


class HardwareConfig:
    """Admin-panel hardware settings for POS and network printer."""

    @staticmethod
    def payment_mode() -> str:
        site = _safe_site()
        mode = ((getattr(site, 'payment_mode', None) or 'mock') if site else 'mock')
        mode = str(mode).strip().lower()
        if mode in ('pos', 'direct', 'mock'):
            return mode
        return 'mock'

    @staticmethod
    def payment_gateway_config() -> Dict[str, Any]:
        """Config dict for PaymentGatewayAdapter (mock / pos)."""
        site = _safe_site()
        mode = HardwareConfig.payment_mode()
        # Adapter only knows mock | pos; "direct" is handled in OrderService.
        gateway_name = 'pos' if mode == 'pos' else 'mock'

        if not site:
            return {
                'gateway_name': gateway_name,
                'tcp_host': '',
                'tcp_port': _DEFAULT_POS_PORT,
                'timeout': _DEFAULT_POS_TIMEOUT,
                'merchant_id': '',
                'terminal_id': '',
                'mock_payment_delay': 3.0,
                'mock_payment_success': True,
                'pos_message_format': _DEFAULT_MESSAGE_FORMAT,
                'pos_use_simple_format': True,
                'pos_banner': _DEFAULT_BANNER,
            }

        host = (site.pos_host or '').strip()
        port = _as_int(site.pos_port, _DEFAULT_POS_PORT)
        timeout = _as_int(site.pos_timeout, _DEFAULT_POS_TIMEOUT)
        merchant = (site.pos_merchant_id or '').strip()
        terminal = (site.pos_terminal_id or '').strip()
        message_format = (
            (getattr(site, 'pos_message_format', None) or '').strip()
            or _DEFAULT_MESSAGE_FORMAT
        )
        banner = (getattr(site, 'pos_banner', None) or '').strip() or _DEFAULT_BANNER
        raw_delay = getattr(site, 'mock_payment_delay', 3.0)
        try:
            delay = float(3.0 if raw_delay is None else raw_delay)
        except (TypeError, ValueError):
            delay = 3.0

        return {
            'gateway_name': gateway_name,
            'tcp_host': host,
            'tcp_port': port,
            'timeout': timeout,
            'merchant_id': merchant,
            'terminal_id': terminal,
            'mock_payment_delay': delay,
            'mock_payment_success': bool(getattr(site, 'mock_payment_success', True)),
            'pos_message_format': message_format,
            'pos_use_simple_format': bool(getattr(site, 'pos_use_simple_format', True)),
            'pos_banner': banner,
        }

    @staticmethod
    def require_pos_host(config: Optional[Dict[str, Any]] = None) -> str:
        """Return configured POS host or raise a clear gateway error."""
        from apps.payment.gateway.exceptions import GatewayException

        cfg = config if config is not None else HardwareConfig.payment_gateway_config()
        host = (cfg.get('tcp_host') or '').strip()
        if not host:
            raise GatewayException(
                'آی‌پی پوز تنظیم نشده است. از پنل ادمین → تنظیمات → سخت‌افزار، '
                'آی‌پی کارتخوان را وارد و ذخیره کنید.'
            )
        return host

    @staticmethod
    def printer_config() -> Dict[str, Any]:
        site = _safe_site()
        if not site:
            return {
                'enabled': False,
                'ip': '',
                'port': _DEFAULT_PRINTER_PORT,
            }
        host = (site.printer_host or '').strip()
        port = _as_int(site.printer_port, _DEFAULT_PRINTER_PORT)
        return {
            'enabled': bool(site.printer_enabled),
            'ip': host,
            'port': port,
        }
