#!/usr/bin/env python3
"""
Print the real kiosk receipt (same renderer as reprint / paid order).

    cd kiosk_backend
    .venv/bin/python scripts/test_thermal_printer.py
    .venv/bin/python scripts/test_thermal_printer.py --host 192.168.0.114 --order ORD123
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.desktop")
os.environ.setdefault("PAYMENT_GATEWAY_NAME", "mock")
os.environ.setdefault("SEED_DEMO_DATA", "0")


def main() -> int:
    parser = argparse.ArgumentParser(description="Print a real kiosk receipt to a thermal printer")
    parser.add_argument("--host", default="192.168.0.114")
    parser.add_argument("--port", type=int, default=9100)
    parser.add_argument("--order", default="", help="order_number; default = latest paid")
    args = parser.parse_args()

    import django

    django.setup()

    from apps.orders.models import Order
    from apps.orders.services.print_service import PrintService

    qs = Order.objects.prefetch_related("items__product")
    if args.order:
        order = qs.filter(order_number=args.order).first()
        if order is None:
            print(f"order not found: {args.order}", flush=True)
            return 1
    else:
        order = qs.filter(payment_status="paid").order_by("-id").first()
        if order is None:
            print("no paid order in DB — pay one in the kiosk first, or pass --order", flush=True)
            return 1

    if order.payment_status != "paid":
        print(
            f"order {order.order_number} is {order.payment_status}, not paid — refusing to print",
            flush=True,
        )
        return 1

    PrintService.get_printer_config = staticmethod(
        lambda: {"enabled": True, "ip": args.host, "port": args.port}
    )

    print(
        f"printing real receipt order={order.order_number} "
        f"receipt_no={order.receipt_number} total={order.total_amount} "
        f"-> {args.host}:{args.port}",
        flush=True,
    )
    ok = PrintService.print_receipt(order)
    print("print_receipt:", "OK" if ok else "FAILED", flush=True)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
