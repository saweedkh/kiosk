"""In-process POS gateway via official pna.pcpos.dll (no extra HTTP hop)."""

from __future__ import annotations

import os
from typing import Any, Dict

from django.conf import settings

from apps.core.desktop_paths import resolve_pos_dll_path
from apps.core.hardware_config import get_pos_config
from apps.logs.services.log_service import LogService
from ..base import BasePaymentGateway
from ..exceptions import GatewayException
from .client import PosDllClient


def _coerce_order_id(value: Any) -> int | None:
    try:
        if value is None or value == '':
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


class POSDllPaymentGateway(BasePaymentGateway):
    """Loads Intek PCPOS DLL in the API process and drives the card reader directly."""

    _client: PosDllClient | None = None

    def __init__(self, config: Dict[str, Any] | None = None):
        if os.name != 'nt':
            raise GatewayException(
                'درگاه DLL فقط روی ویندوز پشتیبانی می‌شود.'
            )
        self.config = dict(config or {})
        pos = get_pos_config()
        self.tcp_host = pos['tcp_host']
        self.tcp_port = int(pos['tcp_port'])
        self.timeout = int(
            self.config.get('timeout')
            or getattr(settings, 'PAYMENT_GATEWAY_CONFIG', {}).get('timeout')
            or 60
        )
        self.dll_path = self.config.get('dll_path') or resolve_pos_dll_path()

    def _client_instance(self) -> PosDllClient:
        if POSDllPaymentGateway._client is None:
            POSDllPaymentGateway._client = PosDllClient(
                dll_path=self.dll_path,
                pos_ip=self.tcp_host,
                pos_port=self.tcp_port,
                timeout_seconds=self.timeout,
            )
            POSDllPaymentGateway._client.start_keepalive()
        else:
            POSDllPaymentGateway._client.pos_ip = self.tcp_host
            POSDllPaymentGateway._client.pos_port = self.tcp_port
            POSDllPaymentGateway._client.timeout_seconds = self.timeout
        return POSDllPaymentGateway._client

    def test_connection(
        self,
        pos_ip: str | None = None,
        pos_port: int | None = None,
        timeout_seconds: float | None = None,
        **kwargs,
    ) -> Dict[str, Any]:
        try:
            return self._client_instance().test_connection(
                pos_ip=pos_ip or kwargs.get('pos_ip'),
                pos_port=pos_port if pos_port is not None else kwargs.get('pos_port'),
                timeout_seconds=(
                    timeout_seconds
                    if timeout_seconds is not None
                    else kwargs.get('timeout_seconds')
                ),
            )
        except Exception as e:
            return {
                'success': False,
                'busy': False,
                'timed_out': False,
                'message': str(e),
                'connection_type': 'dll',
                'details': {'dll': str(self.dll_path), 'error': str(e)},
            }

    _retired: list = []

    def reset_client(self, test: bool = True) -> Dict[str, Any]:
        """
        Drop a hung PCPOS session and use a fresh client.

        Does not unload pna.pcpos.dll (CLR stays in-process). Recovers from a
        stuck lock/timeout without restarting Waitress. A native DLL crash that
        already killed the process cannot be fixed this way.
        """
        old = POSDllPaymentGateway._client
        if old is not None and getattr(old, '_in_pay', False):
            return {
                'ok': False,
                'success': False,
                'busy': True,
                'reset': False,
                'timed_out': False,
                'message': (
                    'سفارش روی کارتخوان در جریان است. بعد از اتمام پرداخت بازنشانی کنید.'
                ),
                'connection_type': 'dll',
            }

        new = PosDllClient(
            dll_path=self.dll_path,
            pos_ip=self.tcp_host,
            pos_port=self.tcp_port,
            timeout_seconds=self.timeout,
        )
        if old is not None:
            try:
                old.request_cancel()
            except Exception:
                pass
            try:
                old.stop_keepalive()
            except Exception:
                pass
            try:
                new.adopt_runtime(old)
            except Exception:
                pass
            POSDllPaymentGateway._retired.append(old)
            if len(POSDllPaymentGateway._retired) > 4:
                POSDllPaymentGateway._retired = POSDllPaymentGateway._retired[-4:]

        POSDllPaymentGateway._client = new
        new.start_keepalive()
        LogService.log_info(
            'payment',
            'dll_client_reset',
            details={'pos_ip': self.tcp_host, 'pos_port': self.tcp_port},
        )

        probe: Dict[str, Any] = {}
        if test:
            try:
                probe = new.test_connection(timeout_seconds=3.0)
            except Exception as exc:
                probe = {
                    'success': False,
                    'message': str(exc),
                    'timed_out': False,
                    'busy': False,
                }

        ok = bool(probe.get('success')) if test else True
        if probe.get('timed_out'):
            message = (
                'اتصال DLL بازنشانی شد، ولی تست در ۳ ثانیه پاسخ نداد. '
                'اگر هنوز مشکل دارید کارتخوان را یک‌بار خاموش/روشن کنید.'
            )
        elif probe.get('busy'):
            message = 'اتصال DLL بازنشانی شد؛ کارتخوان هنوز مشغول تراکنش است.'
        elif ok:
            message = (
                f'اتصال DLL بازنشانی شد و تست موفق بود '
                f'({self.tcp_host}:{self.tcp_port})'
            )
        elif test:
            message = (
                probe.get('message')
                or 'اتصال DLL بازنشانی شد، ولی تست اتصال ناموفق بود.'
            )
        else:
            message = 'اتصال DLL بازنشانی شد.'

        return {
            'ok': ok,
            'success': ok,
            'busy': bool(probe.get('busy')),
            'reset': True,
            'timed_out': bool(probe.get('timed_out')),
            'status': (
                'timeout'
                if probe.get('timed_out')
                else ('ok' if ok else 'down')
            ),
            'message': message,
            'connection_type': 'dll',
            'host': self.tcp_host,
            'port': self.tcp_port,
        }

    def initiate_payment(
        self, amount: int, order_details: Dict[str, Any], **kwargs
    ) -> Dict[str, Any]:
        order_number = order_details.get('order_number', '')
        LogService.log_info(
            'payment',
            'dll_payment_request',
            details={
                'amount': amount,
                'order_number': order_number,
                'pos_ip': self.tcp_host,
                'pos_port': self.tcp_port,
                'dll': str(self.dll_path),
            },
        )
        try:
            result = self._client_instance().pay(
                amount=int(amount),
                order_number=order_number,
                payment_id=str(order_details.get('payment_id') or ''),
                bill_id=str(order_details.get('bill_id') or ''),
                order_id=_coerce_order_id(order_details.get('order_id')),
            )
        except FileNotFoundError as e:
            raise GatewayException(str(e)) from e
        except RuntimeError as e:
            raise GatewayException(str(e)) from e

        data = result.as_dict()
        LogService.log_info(
            'payment',
            'dll_payment_response',
            details={
                'success': data.get('success'),
                'status': data.get('status'),
                'response_code': data.get('response_code'),
            },
        )
        return {
            'success': bool(data.get('success')),
            'transaction_id': data.get('transaction_id') or '',
            'status': data.get('status')
            or ('success' if data.get('success') else 'failed'),
            'response_code': data.get('response_code') or '',
            'response_message': data.get('response_message') or '',
            'card_number': data.get('card_number') or '',
            'reference_number': data.get('reference_number') or '',
            'gateway_response': data,
            'amount': amount,
        }

    def verify_payment(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        return {
            'success': True,
            'transaction_id': transaction_id,
            'status': 'success',
            'gateway_response': {'note': 'DLL has no separate verify'},
        }

    def get_payment_status(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        return self.verify_payment(transaction_id, **kwargs)

    def cancel_payment(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        client = POSDllPaymentGateway._client
        if client is None:
            return {
                'success': False,
                'transaction_id': transaction_id,
                'status': 'failed',
                'response_message': 'تراکنش بازی روی پوز نیست',
            }
        aborted = client.request_cancel()
        return {
            'success': aborted,
            'transaction_id': transaction_id,
            'status': 'cancelled',
            'response_message': (
                'انتظار کیوسک قطع شد. اگر مبلغ روی پوز مانده، روی دستگاه لغو بزنید.'
            ),
        }

    def handle_webhook(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        return {'success': True, 'message': 'no webhook for dll'}
