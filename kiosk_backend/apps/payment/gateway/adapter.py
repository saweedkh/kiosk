from typing import Any, Dict

from .base import BasePaymentGateway
from .bridge import BridgePaymentGateway
from .exceptions import GatewayException
from .mock import MockPaymentGateway
from .pos import POSPaymentGateway
from apps.core.hardware_config import merge_payment_gateway_config


class PaymentGatewayAdapter:

    @staticmethod
    def get_gateway(config: Dict[str, Any] = None) -> BasePaymentGateway:
        cfg = merge_payment_gateway_config(config)
        gateway_name = str(cfg.get('gateway_name') or 'mock').strip().lower()

        # Aliases: POS_USE_BRIDGE=True in env sets gateway via settings
        if gateway_name in ('bridge', 'pos_bridge', 'dll_bridge'):
            return BridgePaymentGateway(cfg)
        if gateway_name == 'mock':
            return MockPaymentGateway(cfg)
        if gateway_name == 'pos':
            return POSPaymentGateway(cfg)

        raise GatewayException(f'Unknown gateway: {gateway_name}')
