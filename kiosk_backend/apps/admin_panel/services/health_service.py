from typing import Any, Dict, Optional
import socket
import time

from django.utils import timezone


class HealthMonitorService:
    """Probe POS, network printer, and Bale bot health."""

    @staticmethod
    def _tcp_probe(host: str, port: int, timeout: float = 2.0) -> Dict[str, Any]:
        started = time.monotonic()
        sock = None
        try:
            sock = socket.create_connection((host, int(port)), timeout=timeout)
            latency_ms = int((time.monotonic() - started) * 1000)
            return {
                'ok': True,
                'status': 'ok',
                'latency_ms': latency_ms,
                'host': host,
                'port': int(port),
                'error': None,
            }
        except Exception as exc:
            latency_ms = int((time.monotonic() - started) * 1000)
            return {
                'ok': False,
                'status': 'down',
                'latency_ms': latency_ms,
                'host': host,
                'port': int(port),
                'error': str(exc),
            }
        finally:
            if sock is not None:
                try:
                    sock.close()
                except Exception:
                    pass

    @staticmethod
    def check_pos() -> Dict[str, Any]:
        from apps.core.hardware_config import get_pos_config, merge_payment_gateway_config

        cfg = merge_payment_gateway_config()
        gateway = (
            cfg.get('GATEWAY_TYPE')
            or cfg.get('gateway_name')
            or cfg.get('gateway')
            or 'mock'
        ).lower()
        if gateway == 'mock':
            return {
                'ok': True,
                'status': 'mock',
                'latency_ms': 0,
                'host': None,
                'port': None,
                'error': None,
                'message': 'درگاه پرداخت در حالت mock است',
            }

        pos = get_pos_config()
        host = pos['tcp_host']
        port = int(pos['tcp_port'])

        if gateway in ('dll', 'pos_dll', 'pcpos'):
            return HealthMonitorService._dll_probe(host, port, timeout_s=2.0)

        result = HealthMonitorService._tcp_probe(host, port, timeout=2.0)
        result['connection_type'] = 'tcp'
        result['message'] = (
            'کارتخوان در دسترس است' if result['ok'] else 'اتصال به کارتخوان برقرار نشد'
        )
        return result

    @staticmethod
    def _dll_probe(
        host: str,
        port: int,
        timeout_s: float = 2.0,
    ) -> Dict[str, Any]:
        started = time.monotonic()
        try:
            from apps.payment.gateway.adapter import PaymentGatewayAdapter

            gw = PaymentGatewayAdapter.get_gateway()
            test = (
                gw.test_connection(
                    pos_ip=host,
                    pos_port=port,
                    timeout_seconds=timeout_s,
                )
                if hasattr(gw, 'test_connection')
                else {}
            )
            latency_ms = int((time.monotonic() - started) * 1000)
            timed_out = bool(test.get('timed_out'))
            busy = bool(test.get('busy')) and not timed_out
            ok = bool(test.get('success'))
            if timed_out:
                status = 'timeout'
                ok = False
                message = (
                    test.get('message')
                    or f'تست اتصال کارتخوان در {timeout_s:g} ثانیه پاسخ نداد'
                )
            elif busy:
                status = 'busy'
                ok = True
                message = (
                    test.get('message')
                    or 'کارتخوان در حال تراکنش است'
                )
            elif ok:
                status = 'ok'
                message = f'اتصال DLL به کارتخوان برقرار شد ({host}:{port})'
            else:
                status = 'down'
                message = (
                    test.get('message')
                    or f'اتصال DLL به کارتخوان برقرار نشد ({host}:{port})'
                )
            return {
                'ok': ok,
                'success': ok,
                'busy': busy,
                'timed_out': timed_out,
                'status': status,
                'latency_ms': latency_ms,
                'host': host,
                'port': port,
                'error': None if ok or busy else (test.get('message') or message),
                'message': message,
                'connection_type': 'dll',
            }
        except Exception as exc:
            latency_ms = int((time.monotonic() - started) * 1000)
            logger_msg = f'خطای DLL: {exc}'
            return {
                'ok': False,
                'success': False,
                'busy': False,
                'timed_out': False,
                'status': 'error',
                'latency_ms': latency_ms,
                'host': host,
                'port': port,
                'error': str(exc),
                'message': logger_msg,
                'connection_type': 'dll',
            }

    @staticmethod
    def test_pos_connection(
        pos_ip: Optional[str] = None,
        pos_port: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Explicit admin TestConnection (DLL) or TCP probe. Not used by pay()."""
        from apps.core.hardware_config import get_pos_config, merge_payment_gateway_config

        cfg = merge_payment_gateway_config()
        gateway = (
            cfg.get('GATEWAY_TYPE')
            or cfg.get('gateway_name')
            or cfg.get('gateway')
            or 'mock'
        ).lower()
        pos = get_pos_config()
        host = str(pos_ip or pos['tcp_host'] or '').strip() or pos['tcp_host']
        try:
            port = int(pos_port if pos_port is not None else pos['tcp_port'])
        except (TypeError, ValueError):
            port = int(pos['tcp_port'])

        if gateway == 'mock':
            return {
                'ok': True,
                'success': True,
                'busy': False,
                'status': 'mock',
                'latency_ms': 0,
                'host': host,
                'port': port,
                'error': None,
                'message': 'درگاه در حالت آزمایشی است؛ تست اتصال کارتخوان لازم نیست.',
                'connection_type': 'mock',
            }

        if gateway in ('dll', 'pos_dll', 'pcpos'):
            return HealthMonitorService._dll_probe(host, port, timeout_s=3.0)

        result = HealthMonitorService._tcp_probe(host, port, timeout=2.0)
        result['success'] = bool(result.get('ok'))
        result['busy'] = False
        result['connection_type'] = 'tcp'
        result['message'] = (
            f'اتصال TCP به کارتخوان برقرار شد ({host}:{port})'
            if result['ok']
            else f'اتصال TCP به کارتخوان برقرار نشد ({host}:{port})'
        )
        return result

    @staticmethod
    def reset_pos_connection() -> Dict[str, Any]:
        """Replace hung in-process DLL client, then run a short TestConnection."""
        from apps.core.hardware_config import merge_payment_gateway_config

        cfg = merge_payment_gateway_config()
        gateway = (
            cfg.get('GATEWAY_TYPE')
            or cfg.get('gateway_name')
            or cfg.get('gateway')
            or 'mock'
        ).lower()
        if gateway == 'mock':
            return {
                'ok': True,
                'success': True,
                'busy': False,
                'reset': False,
                'status': 'mock',
                'message': 'درگاه در حالت آزمایشی است؛ بازنشانی DLL لازم نیست.',
                'connection_type': 'mock',
            }
        try:
            from apps.payment.gateway.adapter import PaymentGatewayAdapter

            gw = PaymentGatewayAdapter.get_gateway()
            reset = getattr(gw, 'reset_client', None)
            if not callable(reset):
                return {
                    'ok': False,
                    'success': False,
                    'busy': False,
                    'reset': False,
                    'status': 'error',
                    'message': 'این درگاه بازنشانی اتصال DLL ندارد.',
                    'connection_type': gateway,
                }
            return reset(test=True)
        except Exception as exc:
            return {
                'ok': False,
                'success': False,
                'busy': False,
                'reset': False,
                'status': 'error',
                'message': f'خطای بازنشانی DLL: {exc}',
                'connection_type': gateway,
            }

    @staticmethod
    def check_printer() -> Dict[str, Any]:
        from apps.core.hardware_config import get_printer_config

        printer = get_printer_config()
        enabled = bool(printer.get('enabled', False))
        host = printer.get('ip', '192.168.1.100')
        port = int(printer.get('port', 9100))
        if not enabled:
            return {
                'ok': False,
                'status': 'disabled',
                'latency_ms': 0,
                'host': host,
                'port': port,
                'error': None,
                'message': 'چاپگر در تنظیمات غیرفعال است',
            }
        result = HealthMonitorService._tcp_probe(host, port, timeout=2.0)
        result['message'] = 'چاپگر در دسترس است' if result['ok'] else 'اتصال به چاپگر برقرار نشد'
        return result

    @staticmethod
    def check_bale() -> Dict[str, Any]:
        from apps.bale_bot.services.config_service import BaleConfigService

        health = BaleConfigService.check_health()
        status = health.get('status') or 'down'
        ok = status in ('ok', 'degraded')
        return {
            'ok': ok,
            'status': status,
            'latency_ms': health.get('latency_ms'),
            'api_ok': health.get('api_ok'),
            'worker_ok': health.get('worker_ok'),
            'bot_username': health.get('bot_username'),
            'message': health.get('message') or health.get('detail') or status,
            'raw': health,
        }

    @staticmethod
    def get_overview() -> Dict[str, Any]:
        def _safe(label: str, fn):
            try:
                return fn()
            except Exception as exc:
                return {
                    'ok': False,
                    'status': 'error',
                    'latency_ms': 0,
                    'error': str(exc),
                    'message': f'خطای پایش {label}: {exc}',
                }

        pos = _safe('کارتخوان', HealthMonitorService.check_pos)
        printer = _safe('چاپگر', HealthMonitorService.check_printer)
        bale = _safe('بله', HealthMonitorService.check_bale)
        components = {'pos': pos, 'printer': printer, 'bale': bale}
        overall = 'ok'
        if not pos.get('ok') or not printer.get('ok') or not bale.get('ok'):
            critical = []
            if not pos.get('ok') and pos.get('status') not in ('mock', 'busy', 'warming'):
                critical.append('pos')
            if not printer.get('ok') and printer.get('status') not in ('disabled',):
                critical.append('printer')
            if not bale.get('ok') and bale.get('status') not in ('disabled', 'env_disabled'):
                critical.append('bale')
            overall = 'down' if critical else 'degraded'

        return {
            'overall': overall,
            'checked_at': timezone.now().isoformat(),
            'components': components,
        }
