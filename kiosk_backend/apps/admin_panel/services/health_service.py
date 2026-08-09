from typing import Any, Dict
import socket
import time


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
    def _printer_probe(host: str, port: int, timeout: float = 2.0) -> Dict[str, Any]:
        """
        TCP connect + ESC/POS realtime status (DLE EOT 1).
        Open port alone is not enough — many networks accept then drop.
        """
        started = time.monotonic()
        sock = None
        try:
            sock = socket.create_connection((host, int(port)), timeout=timeout)
            sock.settimeout(timeout)
            # DLE EOT 1 → printer status; real ESC/POS devices answer with 1 byte
            sock.sendall(b'\x10\x04\x01')
            data = sock.recv(16)
            latency_ms = int((time.monotonic() - started) * 1000)
            if not data:
                return {
                    'ok': False,
                    'status': 'down',
                    'latency_ms': latency_ms,
                    'host': host,
                    'port': int(port),
                    'error': 'no_status_response',
                    'message': 'پورت باز است ولی پاسخ چاپگر دریافت نشد',
                }
            return {
                'ok': True,
                'status': 'ok',
                'latency_ms': latency_ms,
                'host': host,
                'port': int(port),
                'error': None,
                'message': 'چاپگر در دسترس است',
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
                'message': 'اتصال به چاپگر برقرار نشد',
            }
        finally:
            if sock is not None:
                try:
                    sock.close()
                except Exception:
                    pass

    @staticmethod
    def check_pos() -> Dict[str, Any]:
        from apps.core.services.hardware_config import HardwareConfig

        mode = HardwareConfig.payment_mode()
        if mode == 'direct':
            return {
                'ok': True,
                'status': 'disabled',
                'latency_ms': 0,
                'host': None,
                'port': None,
                'error': None,
                'message': 'پرداخت مستقیم فعال است — پوز استفاده نمی‌شود',
            }
        if mode == 'mock':
            return {
                'ok': True,
                'status': 'mock',
                'latency_ms': 0,
                'host': None,
                'port': None,
                'error': None,
                'message': 'درگاه پرداخت در حالت شبیه‌سازی است',
            }

        cfg = HardwareConfig.payment_gateway_config()
        host = cfg.get('tcp_host') or '127.0.0.1'
        port = int(cfg.get('tcp_port') or 1362)
        result = HealthMonitorService._tcp_probe(host, port, timeout=2.0)
        result['message'] = (
            'کارتخوان در دسترس است' if result['ok'] else 'اتصال به کارتخوان برقرار نشد'
        )
        return result

    @staticmethod
    def check_printer() -> Dict[str, Any]:
        from apps.core.services.hardware_config import HardwareConfig

        cfg = HardwareConfig.printer_config()
        enabled = bool(cfg.get('enabled'))
        host = cfg.get('ip') or '192.168.1.100'
        port = int(cfg.get('port') or 9100)
        if not enabled:
            return {
                'ok': True,
                'status': 'disabled',
                'latency_ms': 0,
                'host': host,
                'port': port,
                'error': None,
                'message': 'چاپگر در تنظیمات غیرفعال است',
            }
        return HealthMonitorService._printer_probe(host, port, timeout=2.0)

    @staticmethod
    def check_bale() -> Dict[str, Any]:
        from apps.bale_bot.services.config_service import BaleConfigService

        health = BaleConfigService.check_health()
        status = health.get('status') or 'down'
        # Unused / not configured bot is soft — not a system outage
        if status in ('misconfigured', 'disabled', 'env_disabled') or not health.get(
            'has_token'
        ):
            return {
                'ok': True,
                'status': 'disabled' if status != 'misconfigured' else 'misconfigured',
                'latency_ms': health.get('latency_ms'),
                'api_ok': health.get('api_ok'),
                'worker_ok': health.get('worker_ok'),
                'bot_username': health.get('bot_username'),
                'message': health.get('message') or health.get('detail') or status,
                'raw': health,
            }
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
    def _is_soft_status(component: Dict[str, Any]) -> bool:
        return (component.get('status') or '') in (
            'mock',
            'disabled',
            'env_disabled',
            'misconfigured',
        )

    @staticmethod
    def get_overview() -> Dict[str, Any]:
        pos = HealthMonitorService.check_pos()
        printer = HealthMonitorService.check_printer()
        bale = HealthMonitorService.check_bale()
        components = {'pos': pos, 'printer': printer, 'bale': bale}

        critical = []
        for key, component in components.items():
            if component.get('ok'):
                continue
            if HealthMonitorService._is_soft_status(component):
                continue
            critical.append(key)

        if 'pos' in critical:
            overall = 'down'
        elif critical:
            # Printer (or other non-POS) failure → degraded, not full outage
            overall = 'degraded'
        else:
            overall = 'ok'

        from django.utils import timezone as dj_timezone

        return {
            'overall': overall,
            'checked_at': dj_timezone.now().isoformat(),
            'components': components,
        }
