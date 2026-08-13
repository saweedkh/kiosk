from typing import Any, Optional

from apps.core.exceptions.payment import PaymentException


class GatewayException(PaymentException):
    default_detail = 'Gateway error occurred.'
    default_code = 'gateway_error'

    def __init__(
        self,
        detail: Any = None,
        code: Optional[str] = None,
        *,
        order: Any = None,
    ):
        # Keep order on the exception — create_order_from_items raises before the
        # view can assign the Order instance, so the API layer must recover it here.
        self.order = order
        super().__init__(detail=detail, code=code)


class GatewayConnectionException(PaymentException):
    default_detail = 'Failed to connect to payment gateway.'
    default_code = 'gateway_connection_error'


class GatewayTimeoutException(PaymentException):
    default_detail = 'Payment gateway request timeout.'
    default_code = 'gateway_timeout'


class InvalidGatewayResponseException(PaymentException):
    default_detail = 'Invalid response from payment gateway.'
    default_code = 'invalid_gateway_response'
