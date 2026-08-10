from typing import Dict, Any
from .base import BasePaymentGateway
from .mock import MockPaymentGateway
from .pos import POSPaymentGateway
from .exceptions import GatewayException


class PaymentGatewayAdapter:
    
    @staticmethod
    def get_gateway() -> BasePaymentGateway:
        from apps.core.services.hardware_config import HardwareConfig

        config = HardwareConfig.payment_gateway_config()
        gateway_name = config.get('gateway_name', 'mock')
        
        if gateway_name == 'mock':
            return MockPaymentGateway(config)
        elif gateway_name == 'pos':
            HardwareConfig.require_pos_host(config)
            return POSPaymentGateway(config)
        
        raise GatewayException(f'Unknown gateway: {gateway_name}')
