"""
On-site POS readiness check — config, TCP probe, wire-format preview, optional live send.

Usage:
    python manage.py pos_preflight
    python manage.py pos_preflight --host 192.168.1.50 --port 1362
    python manage.py pos_preflight --amount 10000 --send
    python manage.py pos_preflight --save /app/logs/pos-preflight.txt
"""
from __future__ import annotations

import socket
from datetime import datetime
from typing import Any, Dict, List, Tuple

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.payment.gateway.adapter import PaymentGatewayAdapter
from apps.payment.gateway.exceptions import GatewayException
from apps.payment.gateway.pos.message_builder import POSMessageBuilder


class Command(BaseCommand):
    help = 'چک‌لیست آمادگی پوز قبل از راه‌اندازی کیوسک (تنظیمات، TCP، پیش‌نمایش پیام)'

    def add_arguments(self, parser):
        parser.add_argument('--host', type=str, help='IP پوز (override موقت)')
        parser.add_argument('--port', type=int, help='پورت TCP پوز (پیش‌فرض 1362)')
        parser.add_argument(
            '--amount',
            type=int,
            default=10000,
            help='مبلغ تست به ریال برای پیش‌نمایش/ارسال (پیش‌فرض 10000)',
        )
        parser.add_argument(
            '--send',
            action='store_true',
            help='ارسال واقعی مبلغ تست به پوز (نرم‌افزار شرکت را ببندید)',
        )
        parser.add_argument(
            '--save',
            type=str,
            default='',
            help='ذخیره خروجی در فایل (مثلاً /app/logs/pos-preflight.txt)',
        )

    def handle(self, *args, **options):
        lines: List[str] = []
        host_override = options.get('host')
        port_override = options.get('port')
        amount = options['amount']
        do_send = options['send']
        save_path = (options.get('save') or '').strip()

        def out(text: str = '', style=None):
            lines.append(text)
            if style:
                self.stdout.write(getattr(self.style, style)(text))
            else:
                self.stdout.write(text)

        def section(title: str):
            out('')
            out('=' * 60)
            out(title)
            out('=' * 60)

        config = self._build_config(host_override, port_override)
        host = config.get('tcp_host') or ''
        port = int(config.get('tcp_port') or 1362)

        section(f'POS Preflight — {datetime.now().isoformat(timespec="seconds")}')

        # 1) Gateway mode
        gateway_name = config.get('gateway_name', 'mock')
        out(f'Gateway: {gateway_name}')
        if gateway_name == 'mock':
            out('⚠️  حالت mock — هیچ بایتی به پوز ارسال نمی‌شود!', 'WARNING')
            out('   در .env: PAYMENT_GATEWAY_NAME=pos', 'WARNING')
        elif gateway_name == 'pos' and not host:
            out('❌ gateway=pos ولی IP پوز خالی است', 'ERROR')

        test_config = config.copy()
        if host_override or port_override:
            test_config['gateway_name'] = 'pos'

        out(f'Host: {host or "(خالی)"}')
        out(f'Port: {port}')
        out(f'Timeout: {config.get("timeout", 30)}s')
        out(f'Message format: {config.get("pos_message_format", "dll_exact")}')
        out(f'Simple format: {config.get("pos_use_simple_format", False)}')

        fmt = config.get('pos_message_format', 'dll_exact')
        simple = config.get('pos_use_simple_format', False)
        if gateway_name == 'pos' and (fmt != 'pardakht_novin_official' or not simple):
            out(
                '⚠️  برای PNA توصیه: POS_MESSAGE_FORMAT=pardakht_novin_official و '
                'POS_USE_SIMPLE_FORMAT=True',
                'WARNING',
            )

        # 2) TCP from this process (container or host)
        section('2) TCP probe (همین محیط اجرا)')
        ok, msg, latency = self._tcp_probe(host, port, timeout=5.0)
        if ok:
            out(f'✅ connect_ex({host}:{port}) OK — ~{latency:.0f}ms', 'SUCCESS')
        else:
            out(f'❌ connect_ex({host}:{port}) FAIL — {msg}', 'ERROR')
            out('   ping از میزبان ≠ TCP از داخل Docker. host-network یا IP درست را چک کن.', 'WARNING')

        # 3) Message preview
        section('3) پیش‌نمایش پیام wire (بدون ارسال)')
        try:
            builder = POSMessageBuilder(
                config,
                terminal_id=config.get('terminal_id', ''),
                merchant_id=config.get('merchant_id', ''),
            )
            payload = builder.build_payment_request(
                amount=amount,
                order_number='PREFLIGHT-TEST',
                additional_data=None,
            )
            preview = payload.decode('ascii', errors='replace')
            out(f'Amount (Rial): {amount:,}')
            out(f'Length: {len(payload)} bytes')
            out(f'ASCII: {preview}')
            out(f'HEX:   {payload.hex()}')
            if fmt == 'pardakht_novin_official' and not preview.startswith('00') and 'RQ' not in preview[:10]:
                out('⚠️  فریم pardakht_novin_official انتظار prefix طول + RQ دارد', 'WARNING')
        except Exception as e:
            out(f'❌ ساخت پیام ناموفق: {e}', 'ERROR')

        # 4) Gateway class
        section('4) Gateway instance')
        try:
            gateway = PaymentGatewayAdapter.get_gateway(test_config)
            out(f'Class: {gateway.__class__.__name__}')
            if not ok:
                out('⏭️  test_connection رد شد — TCP probe ناموفق بود', 'WARNING')
            elif hasattr(gateway, 'test_connection'):
                result = gateway.test_connection()
                if result.get('success'):
                    out(f'✅ test_connection: {result.get("message")}', 'SUCCESS')
                else:
                    out(f'❌ test_connection: {result.get("message")}', 'ERROR')
        except GatewayException as e:
            out(f'❌ Gateway: {e}', 'ERROR')

        # 5) Optional live send
        if do_send:
            section('5) ارسال واقعی (بستن نرم‌افزار شرکت!)')
            if gateway_name != 'pos' and not host_override:
                raise CommandError('برای --send باید PAYMENT_GATEWAY_NAME=pos باشد یا --host بدهید.')
            try:
                gw = PaymentGatewayAdapter.get_gateway(test_config)
                out(f'در حال ارسال {amount:,} ریال… (تا ۲ دقیقه)')
                result = gw.initiate_payment(
                    amount=amount,
                    order_details={'order_number': 'PREFLIGHT-SEND', 'customer_name': ''},
                )
                out(f"success={result.get('success')} status={result.get('status')}")
                out(f"message={result.get('response_message')}")
                raw = (result.get('gateway_response') or {}).get('raw_response')
                if raw:
                    out(f'raw_response: {raw[:200]}')
            except GatewayException as e:
                out(f'❌ send failed: {e}', 'ERROR')

        section('حکم (Verdict)')
        if gateway_name == 'mock' and not host_override:
            out('FAIL_MOCK — هنوز mock است؛ هیچ مبلغی به پوز نمی‌رود.', 'ERROR')
        elif not host:
            out('FAIL_NO_HOST — IP پوز خالی است.', 'ERROR')
        elif not ok:
            out('FAIL_TCP — از داخل همین فرایند به پورت پوز وصل نشد.', 'ERROR')
        elif fmt != 'pardakht_novin_official' or not simple:
            out(
                'WARN_FORMAT — TCP OK است ولی فریم PNA پیشنهادی نیست. '
                'اگر مبلغ روی پوز نیاید اول همین را درست کن.',
                'WARNING',
            )
        else:
            out('READY — TCP OK و فریم پیشنهادی PNA. مرحله بعد: send_pos_payment 10000', 'SUCCESS')

        section('چک‌لیست دستی روی کیوسک')
        out('□ نرم‌افزار شرکت پوز بسته است')
        out('□ PAYMENT_GATEWAY_NAME=pos (نه mock)')
        out('□ POS_MESSAGE_FORMAT=pardakht_novin_official')
        out('□ POS_USE_SIMPLE_FORMAT=True')
        out('□ docker exec … pos_preflight → TCP OK')
        out('□ send_pos_payment 10000 → مبلغ روی صفحه پوز')
        out('□ سفارش واقعی از UI → همان رفتار')

        if save_path:
            try:
                with open(save_path, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(lines))
                out(f'\nذخیره شد: {save_path}', 'SUCCESS')
            except OSError as e:
                out(f'⚠️  ذخیره فایل ناموفق: {e}', 'WARNING')

    @staticmethod
    def _build_config(host: str | None, port: int | None) -> Dict[str, Any]:
        config = settings.PAYMENT_GATEWAY_CONFIG.copy()
        if host:
            config['tcp_host'] = host.strip()
            config['gateway_name'] = 'pos'
        if port:
            config['tcp_port'] = port
            config['gateway_name'] = 'pos'
        return config

    @staticmethod
    def _tcp_probe(host: str, port: int, timeout: float = 5.0) -> Tuple[bool, str, float]:
        if not host:
            return False, 'host empty', 0.0
        import time

        start = time.monotonic()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        try:
            code = sock.connect_ex((host, port))
            elapsed = (time.monotonic() - start) * 1000
            if code == 0:
                return True, 'connected', elapsed
            return False, f'connect_ex code {code}', elapsed
        except OSError as e:
            return False, str(e), (time.monotonic() - start) * 1000
        finally:
            sock.close()
