"""
Official PNA DLL client (Intek.PcPosLibrary.PCPOS via pythonnet).

Loads pna.pcpos.dll in-process — no HTTP bridge, no raw TCP protocol.
Requires Windows + Python 32-bit (PE32 DLL) + .NET Framework.
"""

from __future__ import annotations

import logging
import os
import re
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger('payment.pos_dll')

CANCEL_CODES = {'81', '99'}
INSUFFICIENT_FUNDS_CODES = {'02', '51'}
WRONG_PIN_CODES = {'03', '55'}
_RS_RE = re.compile(r'RS(\d{2,5})')

# PNA LAN sessions often die after ~30s idle — keep under that.
_DEFAULT_KEEPALIVE_S = float(os.environ.get('POS_KEEPALIVE_SECONDS', '20') or 20)

_ERROR_MESSAGES = {
    '02': 'تراکنش ناموفق - موجودی کافی نیست',
    '03': 'تراکنش ناموفق - رمز اشتباه',
    '51': 'تراکنش ناموفق - موجودی کافی نیست',
    '55': 'تراکنش ناموفق - رمز اشتباه',
    '81': 'تراکنش توسط کاربر لغو شد',
    '99': 'تراکنش توسط کاربر لغو شد',
}


@dataclass
class PayResult:
    success: bool
    status: str
    response_code: str
    response_message: str
    reference_number: str = ''
    card_number: str = ''
    transaction_id: str = ''
    raw: str = ''
    parsed: str = ''

    def as_dict(self) -> Dict[str, Any]:
        return {
            'success': self.success,
            'status': self.status,
            'response_code': self.response_code,
            'response_message': self.response_message,
            'reference_number': self.reference_number,
            'card_number': self.card_number,
            'transaction_id': self.transaction_id,
            'raw': self.raw,
            'parsed': self.parsed,
        }


class PosDllClient:
    """Thread-safe wrapper: one POS transaction at a time."""

    def __init__(
        self,
        dll_path: Path,
        pos_ip: str,
        pos_port: int = 1362,
        timeout_seconds: int = 120,
        keepalive_seconds: float = _DEFAULT_KEEPALIVE_S,
    ):
        self.dll_path = Path(dll_path)
        self.pos_ip = pos_ip
        self.pos_port = int(pos_port)
        self.timeout_seconds = int(timeout_seconds)
        self.keepalive_seconds = max(5.0, float(keepalive_seconds))
        self._lock = threading.Lock()
        self._clr_ready = False
        self._PCPOS = None
        self._cn_lan = None
        self._last_probe_ok_at = 0.0
        self._keepalive_stop = threading.Event()
        self._keepalive_thread: Optional[threading.Thread] = None

    def ensure_loaded(self) -> None:
        if self._clr_ready:
            return
        if not self.dll_path.is_file():
            raise FileNotFoundError(
                f'PNA DLL not found: {self.dll_path}. '
                'Place pna.pcpos.dll next to kiosk.exe.'
            )
        try:
            import clr  # pythonnet
            from System.Reflection import Assembly  # type: ignore
        except Exception as e:  # pragma: no cover
            raise RuntimeError(
                'pythonnet is unavailable. Desktop backend must be built with '
                'Windows Python 3.11 32-bit and pythonnet installed.'
            ) from e

        Assembly.LoadFrom(str(self.dll_path))
        clr.AddReference(str(self.dll_path))
        from Intek.PcPosLibrary import PCPOS  # type: ignore

        self._PCPOS = PCPOS
        self._cn_lan = PCPOS.cnType.LAN
        self._clr_ready = True
        logger.info('Loaded POS DLL %s (Intek.PcPosLibrary.PCPOS)', self.dll_path)

    def start_keepalive(self) -> None:
        """Background TestConnection so LAN session does not die after ~30s idle."""
        if self._keepalive_thread and self._keepalive_thread.is_alive():
            return
        self._keepalive_stop.clear()

        def _loop() -> None:
            # First tick soon after start so splash/warmup stay hot.
            interval = self.keepalive_seconds
            while not self._keepalive_stop.wait(interval):
                if not self._lock.acquire(blocking=False):
                    # Pay in progress — try again next interval.
                    continue
                try:
                    if not self._clr_ready:
                        continue
                    ok = self._test_connection_locked().get('success')
                    logger.debug(
                        'POS keepalive %s (%s:%s)',
                        'ok' if ok else 'fail',
                        self.pos_ip,
                        self.pos_port,
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.warning('POS keepalive error: %s', exc)
                finally:
                    self._lock.release()

        self._keepalive_thread = threading.Thread(
            target=_loop,
            name='pos-dll-keepalive',
            daemon=True,
        )
        self._keepalive_thread.start()
        logger.info(
            'POS keepalive started every %.0fs (under typical 30s LAN idle drop)',
            self.keepalive_seconds,
        )

    def stop_keepalive(self) -> None:
        self._keepalive_stop.set()

    def _new_pcpos(self):
        self.ensure_loaded()
        pos = self._PCPOS()
        pos.ConnectionType = self._cn_lan
        pos.Ip = str(self.pos_ip)
        pos.Port = int(self.pos_port)
        return pos

    def test_connection(self) -> Dict[str, Any]:
        with self._lock:
            return self._test_connection_locked()

    def _test_connection_locked(self) -> Dict[str, Any]:
        pos = self._new_pcpos()
        ok = bool(pos.TestConnection())
        if ok:
            self._last_probe_ok_at = time.monotonic()
        else:
            self._last_probe_ok_at = 0.0
        return {
            'success': ok,
            'message': (
                f'TestConnection OK ({self.pos_ip}:{self.pos_port})'
                if ok
                else f'TestConnection failed ({self.pos_ip}:{self.pos_port})'
            ),
            'connection_type': 'dll',
            'pos_ip': self.pos_ip,
            'pos_port': self.pos_port,
            'dll': str(self.dll_path),
        }

    def pay(
        self,
        amount: int,
        order_number: str = '',
        payment_id: str = '',
        bill_id: str = '',
    ) -> PayResult:
        if amount <= 0:
            return PayResult(
                success=False,
                status='failed',
                response_code='96',
                response_message='مبلغ نامعتبر است',
            )

        with self._lock:
            return self._pay_locked(amount, order_number, payment_id, bill_id)

    def _pay_locked(
        self,
        amount: int,
        order_number: str,
        payment_id: str,
        bill_id: str,
    ) -> PayResult:
        # Always probe on the same PCPOS instance we will pay with.
        # Skipping this after idle (~30s) is why packets stopped reaching the device.
        pos = self._new_pcpos()
        pos.Amount = str(int(amount))
        if payment_id:
            try:
                pos.PaymentID = str(payment_id)[:11]
            except Exception:
                pass
        if bill_id:
            try:
                pos.BIllID = str(bill_id)[:20]
            except Exception:
                pass

        done = threading.Event()
        box: Dict[str, Any] = {'raw': '', 'error': None, 'timed_out': False}

        def on_response(*args):
            if box.get('timed_out'):
                # Late callback after we already returned — ignore safely.
                done.set()
                return
            try:
                raw_response = args[0] if len(args) == 1 else (args[1] if len(args) > 1 else '')
                box['raw'] = str(raw_response) if raw_response is not None else ''
            except Exception as e:
                box['error'] = str(e)
            finally:
                done.set()

        pos.GetResponse += on_response
        # Keep strong refs so a late native callback after timeout cannot crash
        # on a collected delegate (typical pythonnet + POS DLL hard crash).
        box['pos'] = pos
        box['handler'] = on_response

        try:
            if not self._ensure_link_locked(pos):
                return PayResult(
                    success=False,
                    status='failed',
                    response_code='91',
                    response_message='اتصال به پوز برقرار نشد (TestConnection)',
                )

            logger.info(
                'DLL send_transaction amount=%s order=%s ip=%s:%s',
                amount,
                order_number,
                self.pos_ip,
                self.pos_port,
            )
            pos.send_transaction()

            if not done.wait(timeout=self.timeout_seconds):
                logger.warning(
                    'POS DLL timeout after %ss — abandoning PCPOS (no unsubscribe)',
                    self.timeout_seconds,
                )
                box['timed_out'] = True
                self._invalidate_link()
                self._abandon(pos, on_response, box)
                # Do NOT GetResponse -= handler here: that race kills the process.
                return PayResult(
                    success=False,
                    status='failed',
                    response_code='68',
                    response_message=(
                        f'پاسخ پوز در {self.timeout_seconds} ثانیه نیامد '
                        '(کاربر کارت نکشید یا timeout)'
                    ),
                )

            if box['error']:
                self._invalidate_link()
                return PayResult(
                    success=False,
                    status='failed',
                    response_code='96',
                    response_message=f'خطای رویداد DLL: {box["error"]}',
                )

            raw = box['raw'] or ''
            if not raw:
                try:
                    raw = str(pos.Response.RawResponse or '')
                except Exception:
                    raw = ''

            result = self._parse_raw(raw, pos, amount, order_number)
            if result.success:
                self._last_probe_ok_at = time.monotonic()
            else:
                self._invalidate_link()
            return result
        except Exception as e:
            logger.exception('DLL pay failed')
            self._invalidate_link()
            return PayResult(
                success=False,
                status='failed',
                response_code='96',
                response_message=f'خطای DLL: {e}',
            )
        finally:
            if not box.get('timed_out'):
                try:
                    pos.GetResponse -= on_response
                except Exception:
                    pass
            time.sleep(0.2)

    def _ensure_link_locked(self, pos) -> bool:
        """TestConnection (+ one retry) before send — recovers after LAN idle drop."""
        for attempt in range(2):
            try:
                if bool(pos.TestConnection()):
                    self._last_probe_ok_at = time.monotonic()
                    return True
            except Exception as exc:  # noqa: BLE001
                logger.warning('TestConnection attempt %s raised: %s', attempt + 1, exc)
            if attempt == 0:
                time.sleep(0.5)
                try:
                    pos.Ip = str(self.pos_ip)
                    pos.Port = int(self.pos_port)
                    pos.ConnectionType = self._cn_lan
                except Exception:
                    pass
        self._last_probe_ok_at = 0.0
        return False

    def _invalidate_link(self) -> None:
        self._last_probe_ok_at = 0.0

    # Timed-out PCPOS instances + handlers must stay alive until native callback
    # finishes; unsubscribing/GC during that window hard-crashes the process.
    _abandoned: list = []
    _abandoned_lock = threading.Lock()

    def _abandon(self, pos, handler, box: Dict[str, Any]) -> None:
        with PosDllClient._abandoned_lock:
            PosDllClient._abandoned.append(
                {'pos': pos, 'handler': handler, 'box': box, 'at': time.monotonic()}
            )
            # Bound memory if many timeouts occur.
            if len(PosDllClient._abandoned) > 8:
                PosDllClient._abandoned = PosDllClient._abandoned[-8:]

    def _parse_raw(self, raw: str, pos, amount: int, order_number: str) -> PayResult:
        parsed = ''
        pan = ''
        rrn = ''
        try:
            resp = pos.Response
            if resp is not None:
                try:
                    parsed = str(resp.GetParsedResp() or '')
                except Exception:
                    parsed = ''
                try:
                    pan = str(resp.GetPANID() or '')
                except Exception:
                    pan = ''
                try:
                    rrn = str(resp.GetTrxnRRN() or '')
                except Exception:
                    rrn = ''
                if not rrn:
                    try:
                        rrn = str(resp.GetTraceNo() or '')
                    except Exception:
                        pass
        except Exception:
            pass

        code = self._extract_rs_code(raw) or self._extract_rs_code(parsed) or '96'
        if code == '00':
            return PayResult(
                success=True,
                status='success',
                response_code='00',
                response_message='تراکنش موفق',
                reference_number=rrn,
                card_number=self._mask_pan(pan),
                transaction_id=rrn or f'DLL-{order_number or amount}',
                raw=raw,
                parsed=parsed,
            )
        if code in CANCEL_CODES:
            return PayResult(
                success=False,
                status='cancelled',
                response_code=code,
                response_message='تراکنش توسط کاربر لغو شد',
                reference_number=rrn,
                card_number=self._mask_pan(pan),
                raw=raw,
                parsed=parsed,
            )
        return PayResult(
            success=False,
            status='failed',
            response_code=code,
            response_message=_ERROR_MESSAGES.get(
                code, f'تراکنش ناموفق (کد {code})'
            ),
            reference_number=rrn,
            card_number=self._mask_pan(pan),
            raw=raw,
            parsed=parsed,
        )

    @staticmethod
    def _extract_rs_code(text: str) -> Optional[str]:
        if not text:
            return None
        codes = _RS_RE.findall(text)
        if not codes:
            return None
        for c in reversed(codes):
            if c.startswith('00') and len(c) >= 4:
                return c[-2:]
            if len(c) == 2:
                return c
            if len(c) >= 2:
                return c[-2:]
        return codes[-1][-2:] if codes else None

    @staticmethod
    def _mask_pan(pan: str) -> str:
        digits = re.sub(r'\D', '', pan or '')
        if len(digits) < 4:
            return pan or ''
        return f'****{digits[-4:]}'
