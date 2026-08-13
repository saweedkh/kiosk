from typing import Any, Dict

from .base import BasePaymentGateway
from .bridge import BridgePaymentGateway
from .exceptions import GatewayException
from .mock import MockPaymentGateway
from .pos import POSPaymentGateway
from .pos_dll import POSDllPaymentGateway
from apps.core.hardware_config import merge_payment_gateway_config


class PaymentGatewayAdapter:

    @staticmethod
    def get_gateway(config: Dict[str, Any] = None) -> BasePaymentGateway:
        cfg = merge_payment_gateway_config(config)
        gateway_name = str(cfg.get('gateway_name') or 'mock').strip().lower()

        # HTTP PosBridge (Docker / legacy Windows package)
        if gateway_name in ('bridge', 'pos_bridge', 'dll_bridge'):
            return BridgePaymentGateway(cfg)
        if gateway_name == 'mock':
            return MockPaymentGateway(cfg)
        # In-process official DLL (desktop kiosk — preferred on Windows)
        if gateway_name in ('dll', 'pos_dll', 'pcpos'):
            return POSDllPaymentGateway(cfg)
        # Raw TCP protocol (dev / fallback only)
        if gateway_name == 'pos':
            return POSPaymentGateway(cfg)

        raise GatewayException(f'Unknown gateway: {gateway_name}')
