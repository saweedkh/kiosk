"""
POS / printer runtime config — SiteSettings (admin panel) is the only source of truth.
"""

from __future__ import annotations

from typing import Any, Dict


# Protocol / mock knobs that are not edited in admin (stable defaults).
_PROTOCOL_DEFAULTS: Dict[str, Any] = {
    'mock_payment_delay': 3.0,
    'mock_payment_success': True,
    'pos_message_format': 'dll_exact',
    'pos_use_simple_format': False,
    'pos_banner': 'R2023tejaratEParsian',
}

_DEFAULT_POS_HOST = '192.168.1.100'
_DEFAULT_POS_PORT = 1362
_DEFAULT_POS_TIMEOUT = 30
_DEFAULT_PRINTER_HOST = '192.168.1.100'
_DEFAULT_PRINTER_PORT = 9100


def _safe_site():
    try:
        from apps.core.models.settings import SiteSettings

        return SiteSettings.get_settings()
    except Exception:
        return None


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

        host = _DEFAULT_POS_HOST
        port = _DEFAULT_POS_PORT
        timeout = _DEFAULT_POS_TIMEOUT
        merchant = ''
        terminal = ''

        if site:
            host = (site.pos_host or '').strip() or _DEFAULT_POS_HOST
            port = int(site.pos_port or _DEFAULT_POS_PORT)
            timeout = int(site.pos_timeout or _DEFAULT_POS_TIMEOUT)
            merchant = (site.pos_merchant_id or '').strip()
            terminal = (site.pos_terminal_id or '').strip()

        return {
            **_PROTOCOL_DEFAULTS,
            'gateway_name': gateway_name,
            'tcp_host': host,
            'tcp_port': port,
            'timeout': timeout,
            'merchant_id': merchant,
            'terminal_id': terminal,
        }

    @staticmethod
    def printer_config() -> Dict[str, Any]:
        site = _safe_site()
        if not site:
            return {
                'enabled': False,
                'ip': _DEFAULT_PRINTER_HOST,
                'port': _DEFAULT_PRINTER_PORT,
            }
        host = (site.printer_host or '').strip() or _DEFAULT_PRINTER_HOST
        port = int(site.printer_port or _DEFAULT_PRINTER_PORT)
        return {
            'enabled': bool(site.printer_enabled),
            'ip': host,
            'port': port,
        }
