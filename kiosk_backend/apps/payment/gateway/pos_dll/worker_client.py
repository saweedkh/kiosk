"""HTTP client for the isolated POS worker process."""

from __future__ import annotations

import logging
import os
import subprocess
import sys
import threading
import time
from typing import Any, Dict, Optional

import requests
from django.conf import settings

logger = logging.getLogger('payment.pos_dll.worker_client')

_spawn_lock = threading.Lock()


def worker_base_url() -> str:
    host = getattr(settings, 'POS_WORKER_HOST', '127.0.0.1')
    port = int(getattr(settings, 'POS_WORKER_PORT', 18766) or 18766)
    return f'http://{host}:{port}'


def worker_enabled() -> bool:
    return bool(getattr(settings, 'POS_WORKER_ENABLED', False))


def health(timeout: float = 2.0) -> Optional[Dict[str, Any]]:
    try:
        r = requests.get(f'{worker_base_url()}/health', timeout=timeout)
        if r.status_code != 200:
            return None
        return r.json()
    except Exception:
        return None


def ensure_running(wait_s: float = 90.0) -> bool:
    """Return True if worker answers /health (spawn once if needed)."""
    if health():
        return True
    with _spawn_lock:
        if health():
            return True
        if not _spawn_worker():
            return False
        deadline = time.monotonic() + wait_s
        while time.monotonic() < deadline:
            info = health()
            if info:
                logger.info('POS worker is up: %s', info.get('pos_warm'))
                return True
            time.sleep(1.0)
    return False


def _spawn_worker() -> bool:
    host = getattr(settings, 'POS_WORKER_HOST', '127.0.0.1')
    port = str(int(getattr(settings, 'POS_WORKER_PORT', 18766) or 18766))
    env = os.environ.copy()
    env.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.desktop')
    env['POS_WORKER_HOST'] = host
    env['POS_WORKER_PORT'] = port
    env['SEED_DEMO_DATA'] = '0'

    if getattr(sys, 'frozen', False):
        args = [sys.executable, 'pos_worker']
        cwd = os.path.dirname(sys.executable)
    else:
        backend_root = os.path.abspath(
            os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')
        )
        main_py = os.path.join(backend_root, 'main.py')
        args = [sys.executable, main_py, 'pos_worker']
        cwd = backend_root

    creationflags = 0
    if os.name == 'nt':
        creationflags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
        creationflags |= getattr(subprocess, 'DETACHED_PROCESS', 0x00000008)
        creationflags |= getattr(subprocess, 'CREATE_NEW_PROCESS_GROUP', 0x00000200)

    try:
        subprocess.Popen(
            args,
            cwd=cwd,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creationflags,
            close_fds=True,
        )
        logger.info('Spawned POS worker: %s', args)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error('Failed to spawn POS worker: %s', exc)
        return False


def test_connection() -> Dict[str, Any]:
    if not ensure_running(wait_s=60):
        return {
            'success': False,
            'message': 'POS worker در دسترس نیست',
            'connection_type': 'dll_worker',
        }
    timeout = int(
        getattr(settings, 'PAYMENT_GATEWAY_CONFIG', {}).get('timeout') or 120
    )
    r = requests.post(
        f'{worker_base_url()}/test_connection',
        json={},
        timeout=min(30, timeout),
    )
    r.raise_for_status()
    data = r.json()
    data['connection_type'] = 'dll_worker'
    return data


def pay(
    *,
    amount: int,
    order_number: str = '',
    payment_id: str = '',
    bill_id: str = '',
) -> Dict[str, Any]:
    if not ensure_running(wait_s=90):
        return {
            'success': False,
            'status': 'failed',
            'response_code': '91',
            'response_message': 'سرویس پوز (worker) بالا نیست',
        }
    timeout = int(
        getattr(settings, 'PAYMENT_GATEWAY_CONFIG', {}).get('timeout') or 120
    )
    # HTTP wait must exceed card wait inside the worker.
    http_timeout = timeout + 30
    try:
        r = requests.post(
            f'{worker_base_url()}/pay',
            json={
                'amount': int(amount),
                'order_number': order_number,
                'payment_id': payment_id,
                'bill_id': bill_id,
            },
            timeout=http_timeout,
        )
        r.raise_for_status()
        return r.json()
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'status': 'failed',
            'response_code': '68',
            'response_message': f'پاسخ پوز در {timeout} ثانیه نیامد (timeout)',
        }
    except requests.exceptions.ConnectionError:
        # Worker likely crashed mid-transaction — API stays alive.
        logger.error('POS worker connection lost during pay (process may have crashed)')
        return {
            'success': False,
            'status': 'failed',
            'response_code': '96',
            'response_message': 'اتصال به سرویس پوز قطع شد (worker کرش کرده؛ API سالم است)',
        }
    except Exception as exc:  # noqa: BLE001
        logger.exception('POS worker pay error')
        return {
            'success': False,
            'status': 'failed',
            'response_code': '96',
            'response_message': f'خطای ارتباط با worker پوز: {exc}',
        }


def warm_status() -> str:
    info = health(timeout=1.5)
    if not info:
        return 'down'
    return str(info.get('pos_warm') or 'unknown')
