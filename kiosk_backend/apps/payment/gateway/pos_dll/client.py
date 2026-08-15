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
# Native TestConnection has no cancel; we wait this long then return.
_DEFAULT_PROBE_TIMEOUT_S = float(os.environ.get('POS_TEST_TIMEOUT_SECONDS', '2.5') or 2.5)

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
        timeout_seconds: int = 60,
        keepalive_seconds: float = _DEFAULT_KEEPALIVE_S,
    ):
        self.dll_path = Path(dll_path)
        self.pos_ip = pos_ip
        self.pos_port = int(pos_port)
        self.timeout_seconds = int(timeout_seconds)
        self.keepalive_seconds = min(25.0, max(8.0, float(keepalive_seconds)))
        self.probe_timeout_seconds = max(0.8, float(_DEFAULT_PROBE_TIMEOUT_S))
        self._lock = threading.Lock()
        self._load_lock = threading.Lock()
        self._clr_ready = False
        self._PCPOS = None
        self._cn_lan = None
        self._last_probe_ok_at = 0.0
        self._keepalive_stop = threading.Event()
        self._keepalive_thread: Optional[threading.Thread] = None
        self._cancel = threading.Event()
        self._in_pay = False
        self._late_lock_held = False
        self._pay_lock_token = None

    def adopt_runtime(self, other: 'PosDllClient') -> None:
        """Reuse already-loaded CLR types without Assembly.LoadFrom again."""
        if other._clr_ready:
            self._PCPOS = other._PCPOS
            self._cn_lan = other._cn_lan
            self._clr_ready = True

    def ensure_loaded(self) -> None:
        if self._clr_ready:
            return
        with self._load_lock:
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
            # Probe immediately, then every interval (must stay under ~30s idle).
            while not self._keepalive_stop.is_set():
                if not self._clr_ready:
                    if self._keepalive_stop.wait(1.0):
                        return
                    continue
                try:
                    result = self.test_connection(
                        timeout_seconds=min(2.0, self.probe_timeout_seconds)
                    )
                    if result.get('busy'):
                        logger.debug('POS keepalive skipped — POS busy')
                    elif result.get('success'):
                        logger.debug(
                            'POS keepalive ok (%s:%s)',
                            self.pos_ip,
                            self.pos_port,
                        )
                    else:
                        logger.warning(
                            'POS keepalive failed: %s',
                            result.get('message'),
                        )
                except Exception as exc:  # noqa: BLE001
                    logger.warning('POS keepalive error: %s', exc)
                if self._keepalive_stop.wait(self.keepalive_seconds):
                    return

        self._keepalive_thread = threading.Thread(
            target=_loop,
            name='pos-dll-keepalive',
            daemon=True,
        )
        self._keepalive_thread.start()
        logger.info(
            'POS keepalive started every %.0fs (TestConnection, under 30s LAN idle drop)',
            self.keepalive_seconds,
        )

    def stop_keepalive(self) -> None:
        self._keepalive_stop.set()

    def _new_pcpos(self, pos_ip: Optional[str] = None, pos_port: Optional[int] = None):
        self.ensure_loaded()
        pos = self._PCPOS()
        pos.ConnectionType = self._cn_lan
        pos.Ip = str(pos_ip or self.pos_ip)
        pos.Port = int(pos_port if pos_port is not None else self.pos_port)
        return pos

    def test_connection(
        self,
        pos_ip: Optional[str] = None,
        pos_port: Optional[int] = None,
        timeout_seconds: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Short-timeout DLL probe for admin/health. Never used by pay()."""
        host = str(pos_ip or self.pos_ip)
        port = int(pos_port if pos_port is not None else self.pos_port)
        timeout_s = float(
            timeout_seconds
            if timeout_seconds is not None
            else self.probe_timeout_seconds
        )
        timeout_s = max(0.8, timeout_s)
        base = {
            'connection_type': 'dll',
            'pos_ip': host,
            'pos_port': port,
            'dll': str(self.dll_path),
        }
        if not self._lock.acquire(blocking=False):
            return {
                **base,
                'success': False,
                'busy': True,
                'timed_out': False,
                'message': (
                    'کارتخوان در حال تراکنش است. بعد از اتمام سفارش دوباره تست کنید.'
                ),
            }

        box: Dict[str, Any] = {'result': None, 'error': None, 'pos': None}
        done = threading.Event()

        def _run() -> None:
            try:
                box['result'] = self._test_connection_locked(
                    pos_ip=host, pos_port=port, box=box
                )
            except Exception as exc:  # noqa: BLE001
                box['error'] = exc
                logger.warning('POS TestConnection error: %s', exc)
            finally:
                done.set()
                try:
                    self._lock.release()
                except RuntimeError:
                    pass

        try:
            threading.Thread(target=_run, name='pos-dll-test', daemon=True).start()
        except Exception as exc:  # noqa: BLE001
            try:
                self._lock.release()
            except RuntimeError:
                pass
            return {
                **base,
                'success': False,
                'busy': False,
                'timed_out': False,
                'message': f'خطای تست اتصال: {exc}',
            }
        if not done.wait(timeout_s):
            if box.get('pos') is not None:
                self._abandon(box['pos'], None, box)
            logger.warning(
                'POS TestConnection timed out after %.1fs (%s:%s)',
                timeout_s,
                host,
                port,
            )
            return {
                **base,
                'success': False,
                'busy': True,
                'timed_out': True,
                'message': (
                    f'تست اتصال در {timeout_s:g} ثانیه پاسخ نداد'
                ),
            }

        if box['error'] is not None:
            return {
                **base,
                'success': False,
                'busy': False,
                'timed_out': False,
                'message': f'خطای تست اتصال: {box["error"]}',
            }
        result = box.get('result') or {}
        result.setdefault('busy', False)
        result.setdefault('timed_out', False)
        return result

    def _test_connection_locked(
        self,
        pos_ip: Optional[str] = None,
        pos_port: Optional[int] = None,
        box: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        host = str(pos_ip or self.pos_ip)
        port = int(pos_port if pos_port is not None else self.pos_port)
        pos = self._new_pcpos(pos_ip=host, pos_port=port)
        if box is not None:
            box['pos'] = pos
        try:
            ok = bool(pos.TestConnection())
        except Exception as exc:  # noqa: BLE001
            self._last_probe_ok_at = 0.0
            logger.warning('POS TestConnection raised: %s', exc)
            return {
                'success': False,
                'busy': False,
                'timed_out': False,
                'message': f'خطای تست اتصال: {exc}',
                'connection_type': 'dll',
                'pos_ip': host,
                'pos_port': port,
                'dll': str(self.dll_path),
            }
        if ok:
            self._last_probe_ok_at = time.monotonic()
        else:
            self._last_probe_ok_at = 0.0
        return {
            'success': ok,
            'busy': False,
            'timed_out': False,
            'message': (
                f'TestConnection OK ({host}:{port})'
                if ok
                else f'TestConnection failed ({host}:{port})'
            ),
            'connection_type': 'dll',
            'pos_ip': host,
            'pos_port': port,
            'dll': str(self.dll_path),
        }

    def pay(
        self,
        amount: int,
        order_number: str = '',
        payment_id: str = '',
        bill_id: str = '',
        order_id: Optional[int] = None,
    ) -> PayResult:
        if amount <= 0:
            return PayResult(
                success=False,
                status='failed',
                response_code='96',
                response_message='مبلغ نامعتبر است',
            )

        # Never queue: kiosk "cancel" does not stop an in-flight DLL pay.
        # Queuing made cancelled amounts dump onto the device later.
        if not self._lock.acquire(blocking=False):
            return PayResult(
                success=False,
                status='failed',
                response_code='93',
                response_message='پوز مشغول تراکنش قبلی است',
            )
        self._cancel.clear()
        self._in_pay = True
        self._late_lock_held = False
        self._pay_lock_token = object()
        try:
            return self._pay_locked(
                amount,
                order_number,
                payment_id,
                bill_id,
                order_id=order_id,
            )
        finally:
            if not self._late_lock_held:
                self._in_pay = False
                self._lock.release()

    def request_cancel(self) -> bool:
        """Stop waiting on kiosk cancel. Does not talk to the device."""
        self._cancel.set()
        logger.info('POS wait aborted from kiosk (device Cancel is up to the customer)')
        return True

    def _pay_locked(
        self,
        amount: int,
        order_number: str,
        payment_id: str,
        bill_id: str,
        order_id: Optional[int] = None,
    ) -> PayResult:
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
        box: Dict[str, Any] = {
            'raw': '',
            'error': None,
            'timed_out': False,
            'abandoned': False,
            'late_handled': False,
            'order_id': order_id,
            'order_number': order_number,
            'amount': amount,
        }

        def on_response(*args):
            try:
                raw_response = args[0] if len(args) == 1 else (args[1] if len(args) > 1 else '')
                box['raw'] = str(raw_response) if raw_response is not None else ''
            except Exception as e:
                box['error'] = str(e)
            finally:
                done.set()
                if box.get('abandoned'):
                    threading.Thread(
                        target=self._handle_late_response,
                        args=(box,),
                        name='pos-late-response',
                        daemon=True,
                    ).start()

        pos.GetResponse += on_response
        # Keep strong refs so a late native callback after timeout cannot crash
        # on a collected delegate (typical pythonnet + POS DLL hard crash).
        box['pos'] = pos
        box['handler'] = on_response

        try:
            if self._cancel.is_set():
                return PayResult(
                    success=False,
                    status='cancelled',
                    response_code='81',
                    response_message='تراکنش از کیوسک لغو شد',
                )

            logger.info(
                'DLL send_transaction amount=%s order=%s ip=%s:%s',
                amount,
                order_number,
                self.pos_ip,
                self.pos_port,
            )
            pos.send_transaction()

            deadline = time.monotonic() + self.timeout_seconds
            while True:
                if done.wait(timeout=0.2):
                    break
                if self._cancel.is_set():
                    logger.info('POS pay aborted by kiosk cancel — device left for user Cancel')
                    self._abandon_in_flight(pos, on_response, box)
                    return PayResult(
                        success=False,
                        status='cancelled',
                        response_code='81',
                        response_message='تراکنش از کیوسک لغو شد',
                    )
                if time.monotonic() >= deadline:
                    logger.warning(
                        'POS DLL timeout after %ss — abandoning PCPOS (no unsubscribe)',
                        self.timeout_seconds,
                    )
                    self._abandon_in_flight(pos, on_response, box)
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
            if result.success or result.status == 'cancelled':
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

    def _invalidate_link(self) -> None:
        self._last_probe_ok_at = 0.0

    # Timed-out / kiosk-cancelled PCPOS instances must stay alive until a late
    # native callback finishes; unsubscribing/GC in that window hard-crashes.
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

    def _abandon_in_flight(self, pos, handler, box: Dict[str, Any]) -> None:
        """Return to the kiosk but keep PCPOS + lock until a late native callback."""
        box['timed_out'] = True
        box['abandoned'] = True
        self._invalidate_link()
        self._abandon(pos, handler, box)
        box['lock_token'] = self._pay_lock_token
        self._late_lock_held = True
        self._arm_late_grace(box)

    def _arm_late_grace(self, box: Dict[str, Any], grace_seconds: float = 90.0) -> None:
        def _wait() -> None:
            deadline = time.monotonic() + grace_seconds
            while time.monotonic() < deadline:
                if box.get('late_handled'):
                    return
                time.sleep(0.3)
            if box.get('late_handled'):
                return
            logger.info('POS late-response grace expired — releasing pay lock')
            self._release_after_late(box)

        threading.Thread(
            target=_wait,
            name='pos-late-grace',
            daemon=True,
        ).start()

    def _handle_late_response(self, box: Dict[str, Any]) -> None:
        with PosDllClient._abandoned_lock:
            if box.get('late_handled'):
                return
            box['late_handled'] = True
        try:
            raw = box.get('raw') or ''
            pos = box.get('pos')
            amount = int(box.get('amount') or 0)
            order_number = str(box.get('order_number') or '')
            result = self._parse_raw(raw, pos, amount, order_number)
            order_id = box.get('order_id')
            if result.success and order_id:
                from django.db import close_old_connections
                from apps.orders.services.order_service import OrderService

                close_old_connections()
                try:
                    OrderService.finalize_late_pos_success(
                        int(order_id),
                        result.as_dict(),
                        print_receipt=False,
                    )
                    logger.info(
                        'Late POS success recorded for order_id=%s (no receipt)',
                        order_id,
                    )
                finally:
                    close_old_connections()
            elif result.success:
                logger.warning('Late POS success with no order_id — cannot record order')
            else:
                logger.info(
                    'Late POS response after cancel/timeout: code=%s status=%s',
                    result.response_code,
                    result.status,
                )
        except Exception:
            logger.exception('Late POS response handling failed')
        finally:
            self._release_after_late(box)

    def _release_after_late(self, box: Dict[str, Any]) -> None:
        if box.get('lock_token') is not self._pay_lock_token:
            return
        self._pay_lock_token = None
        self._late_lock_held = False
        self._in_pay = False
        try:
            self._lock.release()
        except RuntimeError:
            pass

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
