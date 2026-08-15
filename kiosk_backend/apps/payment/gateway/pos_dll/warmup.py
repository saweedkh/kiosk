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
    """Load pythonnet / DLL then keep the LAN session warm (TestConnection in keepalive)."""
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

        gw = PaymentGatewayAdapter.get_gateway()
        client = getattr(gw, '_client_instance', None)
        if not callable(client):
            with _lock:
                _state.update(
                    status='skipped',
                    message='gateway has no DLL client',
                    elapsed_s=round(time.perf_counter() - t0, 2),
                )
            return

        pos_client = client()
        pos_client.ensure_loaded()
        with _lock:
            _state.update(
                status='ready',
                message='DLL loaded',
                elapsed_s=round(time.perf_counter() - t0, 2),
            )
        logger.info(
            'POS warmup DLL loaded in %.1fs — TestConnection via keepalive',
            time.perf_counter() - t0,
        )
        pos_client.start_keepalive()
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
