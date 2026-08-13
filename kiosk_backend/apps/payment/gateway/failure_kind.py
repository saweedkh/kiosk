"""
Classify POS payment outcomes for kiosk UX (keep cart vs reset session).
"""
from __future__ import annotations

from typing import Any, Dict, Optional

INSUFFICIENT_FUNDS_CODES = frozenset({'02'})
CANCEL_CODES = frozenset({'81', '99'})

PAYMENT_FAILURE_INSUFFICIENT_FUNDS = 'insufficient_funds'
PAYMENT_FAILURE_CANCELLED = 'cancelled'
PAYMENT_FAILURE_TIMEOUT = 'timeout'
PAYMENT_FAILURE_OTHER = 'other'


def classify_payment_failure(
    *,
    payment_status: Optional[str] = None,
    gateway_response: Optional[Dict[str, Any]] = None,
    error_message: str = '',
) -> str:
    """
    Returns one of: insufficient_funds | cancelled | timeout | other
    """
    gr = gateway_response or {}
    status = (gr.get('status') or payment_status or '').strip().lower()
    message = ' '.join(
        filter(
            None,
            [
                error_message or '',
                str(gr.get('response_message') or ''),
                str(gr.get('raw') or ''),
            ],
        )
    ).lower()

    if status == 'cancelled' or _looks_cancelled(message, gr):
        return PAYMENT_FAILURE_CANCELLED

    if _looks_timeout(message):
        return PAYMENT_FAILURE_TIMEOUT

    code = _normalize_response_code(gr.get('response_code'))
    if code in INSUFFICIENT_FUNDS_CODES or _looks_insufficient_funds(message):
        return PAYMENT_FAILURE_INSUFFICIENT_FUNDS

    return PAYMENT_FAILURE_OTHER


def _normalize_response_code(code: Any) -> str:
    text = str(code or '').strip()
    if not text:
        return ''
    if len(text) >= 2:
        return text[-2:]
    return text


def _looks_cancelled(message: str, gateway_response: Dict[str, Any]) -> bool:
    code = _normalize_response_code(gateway_response.get('response_code'))
    if code in CANCEL_CODES:
        return True
    tokens = ('لغو', 'cancelled', 'canceled', 'cancel')
    return any(token in message for token in tokens)


def _looks_timeout(message: str) -> bool:
    tokens = ('timeout', 'timed out', 'time out', 'زمان', 'no response')
    return any(token in message for token in tokens)


def _looks_insufficient_funds(message: str) -> bool:
    tokens = ('insufficient', 'موجودی', 'balance')
    return any(token in message for token in tokens)
