"""
PosBridge — Windows HTTP service that drives official pna.pcpos.dll.

Endpoints:
  GET  /health
  POST /pay     JSON { "amount": 10000, "order_number": "K-1", ... }
  POST /test    force TestConnection

Run (Windows):
  run.bat
"""

from __future__ import annotations

import logging
import sys
from functools import wraps

from flask import Flask, jsonify, request
from flask_cors import CORS

import config
from dll_client import PosDllClient

logging.basicConfig(
    level=logging.DEBUG if config.DEBUG else logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger('pos_bridge')

app = Flask(__name__)
CORS(app, resources={r'/*': {'origins': '*'}})

client = PosDllClient(
    dll_path=config.POS_DLL_PATH,
    pos_ip=config.POS_IP,
    pos_port=config.POS_PORT,
    timeout_seconds=config.POS_TIMEOUT_SECONDS,
)


def require_token(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if config.BRIDGE_TOKEN:
            token = request.headers.get('X-Pos-Bridge-Token', '')
            if token != config.BRIDGE_TOKEN:
                return jsonify({'success': False, 'error': 'unauthorized'}), 401
        return fn(*args, **kwargs)

    return wrapper


@app.get('/health')
@require_token
def health():
    try:
        client.ensure_loaded()
        test = client.test_connection()
        return jsonify(
            {
                'ok': True,
                'dll_loaded': True,
                'dll_path': str(config.POS_DLL_PATH),
                'pos_ip': config.POS_IP,
                'pos_port': config.POS_PORT,
                'timeout_seconds': config.POS_TIMEOUT_SECONDS,
                'test_connection': test,
            }
        ), 200 if test.get('success') else 503
    except Exception as e:
        logger.exception('health failed')
        return jsonify({'ok': False, 'dll_loaded': False, 'error': str(e)}), 503


@app.post('/test')
@require_token
def test():
    try:
        result = client.test_connection()
        return jsonify(result), 200 if result.get('success') else 503
    except Exception as e:
        logger.exception('test failed')
        return jsonify({'success': False, 'message': str(e)}), 500


@app.post('/pay')
@require_token
def pay():
    data = request.get_json(silent=True) or {}
    try:
        amount = int(data.get('amount', 0))
    except (TypeError, ValueError):
        return jsonify({'success': False, 'error': 'amount must be integer (Rial)'}), 400

    order_number = str(data.get('order_number') or data.get('orderNumber') or '')
    payment_id = str(data.get('payment_id') or data.get('paymentId') or '')
    bill_id = str(data.get('bill_id') or data.get('billId') or '')

    # Allow one-off IP override (rare; prefer .env)
    if data.get('pos_ip') or data.get('pos_port'):
        return jsonify(
            {
                'success': False,
                'error': 'pos_ip/pos_port override disabled; set POS_IP/POS_PORT in bridge .env',
            }
        ), 400

    logger.info('pay request amount=%s order=%s', amount, order_number)
    result = client.pay(
        amount=amount,
        order_number=order_number,
        payment_id=payment_id,
        bill_id=bill_id,
    )
    body = result.as_dict()
    status = 200 if result.success else 402
    if result.status == 'cancelled':
        status = 409
    return jsonify(body), status


def main():
    logger.info(
        'PosBridge starting on %s:%s dll=%s pos=%s:%s',
        config.BRIDGE_HOST,
        config.BRIDGE_PORT,
        config.POS_DLL_PATH,
        config.POS_IP,
        config.POS_PORT,
    )
    try:
        client.ensure_loaded()
    except Exception as e:
        logger.error('DLL preload failed (will retry on first request): %s', e)

    # waitress is production WSGI for Windows
    try:
        from waitress import serve

        serve(app, host=config.BRIDGE_HOST, port=config.BRIDGE_PORT, threads=4)
    except ImportError:
        app.run(host=config.BRIDGE_HOST, port=config.BRIDGE_PORT, threaded=True)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
