"""HTTP client gateway → Windows PosBridge (official PNA DLL)."""

from __future__ import annotations

import uuid
from typing import Any, Dict

import requests
from django.conf import settings

from apps.logs.services.log_service import LogService
from .base import BasePaymentGateway
from .exceptions import GatewayException


class BridgePaymentGateway(BasePaymentGateway):
    """
    Django talks JSON to PosBridge on Windows.
    PosBridge loads pna.pcpos.dll and drives the POS.
    """

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        host = (
            self.config.get('bridge_host')
            or getattr(settings, 'POS_BRIDGE_HOST', None)
            or '127.0.0.1'
        )
        port = int(
            self.config.get('bridge_port')
            or getattr(settings, 'POS_BRIDGE_PORT', 9000)
            or 9000
        )
        self.base_url = f'http://{host}:{port}'.rstrip('/')
        self.token = (
            self.config.get('bridge_token')
            or getattr(settings, 'POS_BRIDGE_TOKEN', '')
            or ''
        )
        # Card + PIN wait — must match bridge POS_TIMEOUT_SECONDS
        self.timeout = float(
            self.config.get('bridge_timeout')
            or getattr(settings, 'POS_BRIDGE_TIMEOUT', 130)
            or 130
        )

    def _headers(self) -> Dict[str, str]:
        headers = {'Content-Type': 'application/json', 'Accept': 'application/json'}
        if self.token:
            headers['X-Pos-Bridge-Token'] = self.token
        return headers

    def test_connection(self) -> Dict[str, Any]:
        try:
            r = requests.get(
                f'{self.base_url}/health',
                headers=self._headers(),
                timeout=15,
            )
            data = r.json() if r.content else {}
            ok = r.status_code == 200 and bool(data.get('ok'))
            test = data.get('test_connection') or {}
            return {
                'success': ok and bool(test.get('success', ok)),
                'message': test.get('message')
                or data.get('error')
                or (f'bridge health HTTP {r.status_code}'),
                'connection_type': 'bridge',
                'details': data,
            }
        except requests.RequestException as e:
            return {
                'success': False,
                'message': f'Bridge unreachable at {self.base_url}: {e}',
                'connection_type': 'bridge',
                'details': {'error': str(e)},
            }

    def initiate_payment(
        self, amount: int, order_details: Dict[str, Any], **kwargs
    ) -> Dict[str, Any]:
        order_number = order_details.get('order_number', '')
        payload = {
            'amount': int(amount),
            'order_number': order_number,
            'payment_id': order_details.get('payment_id', '') or '',
            'bill_id': order_details.get('bill_id', '') or '',
        }
        LogService.log_info(
            'payment',
            'bridge_payment_request',
            details={
                'url': f'{self.base_url}/pay',
                'amount': amount,
                'order_number': order_number,
                'timeout': self.timeout,
            },
        )
        try:
            r = requests.post(
                f'{self.base_url}/pay',
                json=payload,
                headers=self._headers(),
                timeout=self.timeout,
            )
        except requests.Timeout as e:
            LogService.log_error(
                'payment',
                'bridge_payment_timeout',
                details={'error': str(e), 'timeout': self.timeout},
            )
            raise GatewayException(
                f'زمان انتظار بریج پوز تمام شد ({self.timeout:.0f}s).'
            ) from e
        except requests.RequestException as e:
            LogService.log_error(
                'payment',
                'bridge_payment_network_error',
                details={'error': str(e), 'url': self.base_url},
            )
            raise GatewayException(
                f'اتصال به PosBridge برقرار نشد ({self.base_url}): {e}'
            ) from e

        try:
            data = r.json() if r.content else {}
        except ValueError:
            data = {}

        LogService.log_info(
            'payment',
            'bridge_payment_response',
            details={
                'http_status': r.status_code,
                'success': data.get('success'),
                'status': data.get('status'),
                'response_code': data.get('response_code'),
            },
        )

        if r.status_code == 401:
            raise GatewayException('PosBridge توکن نامعتبر است (X-Pos-Bridge-Token).')

        success = bool(data.get('success'))
        status = data.get('status') or ('success' if success else 'failed')
        txn = (
            data.get('transaction_id')
            or data.get('reference_number')
            or f'BRIDGE-{uuid.uuid4().hex[:12].upper()}'
        )

        result = {
            'success': success,
            'transaction_id': txn,
            'status': status,
            'response_code': str(data.get('response_code') or ''),
            'response_message': data.get('response_message')
            or data.get('error')
            or '',
            'card_number': data.get('card_number') or '',
            'reference_number': data.get('reference_number') or '',
            'gateway_response': data,
            'amount': amount,
        }

        if not success and status != 'cancelled':
            # OrderService expects exception on hard failure in some paths —
            # keep parity with POS gateway: return dict; caller checks success.
            pass
        return result

    def verify_payment(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        return {
            'success': True,
            'transaction_id': transaction_id,
            'status': 'success',
            'gateway_response': {'note': 'bridge has no separate verify'},
        }

    def get_payment_status(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        return self.verify_payment(transaction_id, **kwargs)

    def cancel_payment(self, transaction_id: str, **kwargs) -> Dict[str, Any]:
        return {
            'success': False,
            'transaction_id': transaction_id,
            'status': 'failed',
            'response_message': 'لغو از راه دور برای بریج پشتیبانی نمی‌شود',
        }

    def handle_webhook(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        return {'success': True, 'message': 'no webhook for bridge'}
