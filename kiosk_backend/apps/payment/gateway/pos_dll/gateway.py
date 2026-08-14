"""In-process or worker-proxied POS gateway via official pna.pcpos.dll."""

from __future__ import annotations

import os
from typing import Any, Dict

from django.conf import settings

from apps.core.desktop_paths import resolve_pos_dll_path
from apps.core.hardware_config import get_pos_config
from apps.logs.services.log_service import LogService
from ..base import BasePaymentGateway
from ..exceptions import GatewayException
from . import worker_client
from .client import PosDllClient


class POSDllPaymentGateway(BasePaymentGateway):
    """
    Desktop: prefer isolated pos_worker process (crash-safe for API).
    Fallback: in-process DLL when POS_WORKER_ENABLED is False.
    """

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
            or 120
        )
        self.dll_path = self.config.get('dll_path') or resolve_pos_dll_path()
        self.use_worker = worker_client.worker_enabled()

    def _client_instance(self) -> PosDllClient:
        if POSDllPaymentGateway._client is None:
            POSDllPaymentGateway._client = PosDllClient(
                dll_path=self.dll_path,
                pos_ip=self.tcp_host,
                pos_port=self.tcp_port,
                timeout_seconds=self.timeout,
            )
            try:
                POSDllPaymentGateway._client.start_keepalive()
            except Exception:
                pass
        else:
            POSDllPaymentGateway._client.pos_ip = self.tcp_host
            POSDllPaymentGateway._client.pos_port = self.tcp_port
            POSDllPaymentGateway._client.timeout_seconds = self.timeout
        return POSDllPaymentGateway._client

    def test_connection(self) -> Dict[str, Any]:
        if self.use_worker:
            try:
                return worker_client.test_connection()
            except Exception as e:
                return {
                    'success': False,
                    'message': str(e),
                    'connection_type': 'dll_worker',
                    'details': {'error': str(e)},
                }
        try:
            return self._client_instance().test_connection()
        except Exception as e:
            return {
                'success': False,
                'message': str(e),
                'connection_type': 'dll',
                'details': {'dll': str(self.dll_path), 'error': str(e)},
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
                'via_worker': self.use_worker,
            },
        )
        try:
            if self.use_worker:
                data = worker_client.pay(
                    amount=int(amount),
                    order_number=order_number,
                    payment_id=str(order_details.get('payment_id') or ''),
                    bill_id=str(order_details.get('bill_id') or ''),
                )
            else:
                result = self._client_instance().pay(
                    amount=int(amount),
                    order_number=order_number,
                    payment_id=str(order_details.get('payment_id') or ''),
                    bill_id=str(order_details.get('bill_id') or ''),
                )
                data = result.as_dict()
        except FileNotFoundError as e:
            raise GatewayException(str(e)) from e
        except RuntimeError as e:
            raise GatewayException(str(e)) from e

        LogService.log_info(
            'payment',
            'dll_payment_response',
            details={
                'success': data.get('success'),
                'status': data.get('status'),
                'response_code': data.get('response_code'),
                'via_worker': self.use_worker,
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
        return {
            'success': False,
            'transaction_id': transaction_id,
            'status': 'failed',
            'response_message': 'لغو از راه دور برای DLL پشتیبانی نمی‌شود',
        }

    def handle_webhook(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        return {'success': True, 'message': 'no webhook for dll'}
