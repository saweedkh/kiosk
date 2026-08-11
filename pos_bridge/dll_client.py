"""
Official PNA DLL client (Intek.PcPosLibrary.PCPOS via pythonnet).

DLL facts (from monodis of pna.pcpos.dll):
  - Assembly: pna.pcpos / Intek.PcPosLibrary.PCPOS
  - ConnectionType: LAN=0, SERIAL=1
  - Properties: Ip (str), Port (int), Amount (str), PaymentID, BIllID, ...
  - TestConnection() -> bool
  - send_transaction() -> void  (async: writes TCP then background ReadLANResponse,
    fires GetResponse event)
  - Response.RawResponse, Response.GetParsedResp(), GetPANID, GetTrxnRRN, GetTraceNo, GetAmount
"""

from __future__ import annotations

import logging
import re
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger('pos_bridge.dll')

CANCEL_CODES = {'81', '99'}
# DLL error stub when LAN connect/send throws (seen in IL):
# "0018RS013RS00281PD0011"
_RS_RE = re.compile(r'RS(\d{2,5})')


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
    ):
        self.dll_path = Path(dll_path)
        self.pos_ip = pos_ip
        self.pos_port = int(pos_port)
        self.timeout_seconds = int(timeout_seconds)
        self._lock = threading.Lock()
        self._clr_ready = False
        self._PCPOS = None
        self._cn_lan = None

    def ensure_loaded(self) -> None:
        if self._clr_ready:
            return
        if not self.dll_path.is_file():
            raise FileNotFoundError(
                f'PNA DLL not found: {self.dll_path}. '
                'Set POS_DLL_PATH in pos_bridge/.env'
            )
        try:
            import clr  # pythonnet
            from System.Reflection import Assembly  # type: ignore
        except Exception as e:  # pragma: no cover
            raise RuntimeError(
                'pythonnet failed to import. On Windows install '
                'Python 3.11 32-bit and: pip install pythonnet==3.0.3'
            ) from e

        Assembly.LoadFrom(str(self.dll_path))
        clr.AddReference(str(self.dll_path))
        from Intek.PcPosLibrary import PCPOS  # type: ignore

        self._PCPOS = PCPOS
        # Nested enum: PCPOS.cnType.LAN == 0
        self._cn_lan = PCPOS.cnType.LAN
        self._clr_ready = True
        logger.info('Loaded DLL %s (Intek.PcPosLibrary.PCPOS)', self.dll_path)

    def _new_pcpos(self):
        self.ensure_loaded()
        pos = self._PCPOS()
        pos.ConnectionType = self._cn_lan
        pos.Ip = str(self.pos_ip)
        pos.Port = int(self.pos_port)
        return pos

    def test_connection(self) -> Dict[str, Any]:
        with self._lock:
            pos = self._new_pcpos()
            ok = bool(pos.TestConnection())
            return {
                'success': ok,
                'message': (
                    f'TestConnection OK ({self.pos_ip}:{self.pos_port})'
                    if ok
                    else f'TestConnection failed ({self.pos_ip}:{self.pos_port})'
                ),
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
        box: Dict[str, Any] = {'raw': '', 'error': None}

        def on_response(*args):
            # DLL delegate: void Invoke(string response) — not (sender, args)
            try:
                raw_response = args[0] if len(args) == 1 else (args[1] if len(args) > 1 else '')
                box['raw'] = str(raw_response) if raw_response is not None else ''
            except Exception as e:
                box['error'] = str(e)
            finally:
                done.set()

        pos.GetResponse += on_response

        try:
            if not bool(pos.TestConnection()):
                return PayResult(
                    success=False,
                    status='failed',
                    response_code='91',
                    response_message='اتصال به پوز برقرار نشد (TestConnection)',
                )

            logger.info(
                'send_transaction amount=%s order=%s ip=%s:%s',
                amount,
                order_number,
                self.pos_ip,
                self.pos_port,
            )
            pos.send_transaction()

            if not done.wait(timeout=self.timeout_seconds):
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
                return PayResult(
                    success=False,
                    status='failed',
                    response_code='96',
                    response_message=f'خطای رویداد DLL: {box["error"]}',
                )

            raw = box['raw'] or ''
            # Fallback: sometimes Response is filled without event arg
            if not raw:
                try:
                    raw = str(pos.Response.RawResponse or '')
                except Exception:
                    raw = ''

            return self._parse_raw(raw, pos, amount, order_number)
        except Exception as e:
            logger.exception('DLL pay failed')
            return PayResult(
                success=False,
                status='failed',
                response_code='96',
                response_message=f'خطای DLL: {e}',
            )
        finally:
            try:
                pos.GetResponse -= on_response
            except Exception:
                pass
            # give reader thread a moment to exit
            time.sleep(0.2)

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
                transaction_id=rrn or f'BRIDGE-{order_number or amount}',
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
            response_message=f'تراکنش ناموفق (کد {code})',
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
        # Prefer last RS00xxx style → last 2 digits (RS00200 → 00)
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
