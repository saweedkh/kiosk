from django.conf import settings
from typing import Dict, Any
from .base import BasePaymentGateway
from .mock import MockPaymentGateway
from .pos import POSPaymentGateway
from .exceptions import GatewayException


class PaymentGatewayAdapter:
    
    @staticmethod
    def get_gateway(config: Dict[str, Any] = None) -> BasePaymentGateway:
        cfg = config if config is not None else settings.PAYMENT_GATEWAY_CONFIG
        gateway_name = cfg.get('gateway_name', 'mock')
        
        if gateway_name == 'mock':
            return MockPaymentGateway(cfg)
        elif gateway_name == 'pos':
            # Use direct protocol implementation - 100% cross-platform
            # Works on Windows, macOS (ARM64/x86_64), Linux - no DLL needed!
            return POSPaymentGateway(cfg)
        
        raise GatewayException(f'Unknown gateway: {gateway_name}')
    

