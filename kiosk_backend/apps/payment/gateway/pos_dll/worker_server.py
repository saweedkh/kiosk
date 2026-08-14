"""
Local POS worker HTTP API.

Runs in a dedicated OS process so pythonnet / pna.pcpos.dll crashes or
timeouts cannot take down the Waitress API process.
"""

from __future__ import annotations

import json
import logging
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, Optional
from urllib.parse import urlparse

logger = logging.getLogger('payment.pos_dll.worker')

_client = None
_client_lock = threading.Lock()
_state: Dict[str, Any] = {
    'status': 'starting',
    'message': '',
}


def _get_client():
    global _client
    from django.conf import settings

    from apps.core.desktop_paths import resolve_pos_dll_path
    from apps.core.hardware_config import get_pos_config
    from apps.payment.gateway.pos_dll.client import PosDllClient

    with _client_lock:
        pos = get_pos_config()
        timeout = int(
            getattr(settings, 'PAYMENT_GATEWAY_CONFIG', {}).get('timeout') or 120
        )
        dll_path = resolve_pos_dll_path()
        if _client is None:
            _client = PosDllClient(
                dll_path=dll_path,
                pos_ip=pos['tcp_host'],
                pos_port=int(pos['tcp_port']),
                timeout_seconds=timeout,
            )
        else:
            _client.pos_ip = pos['tcp_host']
            _client.pos_port = int(pos['tcp_port'])
            _client.timeout_seconds = timeout
        return _client


def warm_up() -> Dict[str, Any]:
    global _state
    try:
        client = _get_client()
        client.ensure_loaded()
        result = client.test_connection()
        client.start_keepalive()
        ok = bool(result.get('success'))
        _state = {
            'status': 'ready' if ok else 'degraded',
            'message': str(result.get('message') or ''),
        }
        return {**_state, 'test': result}
    except Exception as exc:  # noqa: BLE001
        _state = {'status': 'failed', 'message': str(exc)}
        logger.exception('POS worker warm-up failed')
        return dict(_state)


class _Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, fmt: str, *args) -> None:
        logger.info('pos_worker %s', fmt % args)

    def _send(self, code: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> Dict[str, Any]:
        length = int(self.headers.get('Content-Length') or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        if not raw:
            return {}
        return json.loads(raw.decode('utf-8'))

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path.rstrip('/') or '/'
        if path in ('/health', '/'):
            self._send(
                200,
                {
                    'ok': True,
                    'service': 'kiosk-pos-worker',
                    'pos_warm': _state.get('status', 'unknown'),
                    'message': _state.get('message', ''),
                },
            )
            return
        self._send(404, {'ok': False, 'message': 'not found'})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path.rstrip('/') or '/'
        try:
            data = self._read_json()
        except Exception as exc:  # noqa: BLE001
            self._send(400, {'success': False, 'response_message': f'bad json: {exc}'})
            return

        if path == '/test_connection':
            try:
                result = _get_client().test_connection()
                self._send(200, result)
            except Exception as exc:  # noqa: BLE001
                self._send(
                    200,
                    {'success': False, 'message': str(exc), 'connection_type': 'dll'},
                )
            return

        if path == '/pay':
            try:
                amount = int(data.get('amount') or 0)
                pay_result = _get_client().pay(
                    amount=amount,
                    order_number=str(data.get('order_number') or ''),
                    payment_id=str(data.get('payment_id') or ''),
                    bill_id=str(data.get('bill_id') or ''),
                )
                self._send(200, pay_result.as_dict())
            except Exception as exc:  # noqa: BLE001
                logger.exception('POS worker pay failed')
                self._send(
                    200,
                    {
                        'success': False,
                        'status': 'failed',
                        'response_code': '96',
                        'response_message': f'خطای worker پوز: {exc}',
                    },
                )
            return

        self._send(404, {'success': False, 'response_message': 'not found'})


def serve_forever(host: str = '127.0.0.1', port: int = 18766) -> None:
    warm_up()
    httpd = ThreadingHTTPServer((host, port), _Handler)
    # One pay at a time is enforced inside PosDllClient lock; keep a few threads
    # for /health during long card waits.
    logger.info('POS worker listening on http://%s:%s/', host, port)
    print(f'[kiosk-pos-worker] listening on http://{host}:{port}/', flush=True)
    httpd.serve_forever()
