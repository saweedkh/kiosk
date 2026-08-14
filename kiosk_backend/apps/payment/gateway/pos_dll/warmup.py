"""Background POS DLL warm-up so the first real order is not cold."""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Any, Dict

logger = logging.getLogger('payment.pos_dll')

_lock = threading.Lock()
_state: Dict[str, Any] = {
    'status': 'idle',  # idle | warming | ready | failed | skipped
    'message': '',
    'elapsed_s': 0.0,
}
_done = threading.Event()


def get_status() -> Dict[str, Any]:
    with _lock:
        return dict(_state)


def start_async() -> None:
    """Load pythonnet / DLL and TestConnection without blocking Waitress."""
    if os.name != 'nt':
        with _lock:
            _state.update(status='skipped', message='not windows')
        _done.set()
        return

    with _lock:
        if _state['status'] in ('warming', 'ready', 'failed', 'skipped'):
            return
        _state['status'] = 'warming'
        _state['message'] = 'loading'

    threading.Thread(target=_run, name='pos-dll-warmup', daemon=True).start()


def _run() -> None:
    t0 = time.perf_counter()
    try:
        from apps.payment.gateway.adapter import PaymentGatewayAdapter

        gw = PaymentGatewayAdapter().get_gateway()
        if not hasattr(gw, 'test_connection'):
            with _lock:
                _state.update(
                    status='skipped',
                    message='gateway has no test_connection',
                    elapsed_s=round(time.perf_counter() - t0, 2),
                )
            return

        # Prefer ensure_loaded even if POS is offline — CLR/DLL cost is the slow part.
        client = getattr(gw, '_client_instance', None)
        pos_client = None
        if callable(client):
            try:
                pos_client = client()
                pos_client.ensure_loaded()
            except Exception as exc:  # noqa: BLE001
                logger.warning('POS ensure_loaded during warmup: %s', exc)

        result = gw.test_connection()
        ok = bool(result.get('success'))
        if pos_client is not None:
            try:
                pos_client.start_keepalive()
            except Exception as exc:  # noqa: BLE001
                logger.warning('POS keepalive start failed: %s', exc)

        with _lock:
            _state.update(
                status='ready' if ok else 'failed',
                message=str(result.get('message') or ''),
                elapsed_s=round(time.perf_counter() - t0, 2),
            )
        logger.info(
            'POS warmup %s in %.1fs: %s',
            'ok' if ok else 'failed',
            time.perf_counter() - t0,
            result.get('message'),
        )
    except Exception as exc:  # noqa: BLE001
        with _lock:
            _state.update(
                status='failed',
                message=str(exc),
                elapsed_s=round(time.perf_counter() - t0, 2),
            )
        logger.warning('POS warmup failed: %s', exc)
    finally:
        _done.set()
