from apps.core.exceptions.payment import PaymentException


class GatewayException(PaymentException):
    default_detail = 'Gateway error occurred.'
    default_code = 'gateway_error'


class GatewayConnectionException(PaymentException):
    default_detail = 'Failed to connect to payment gateway.'
    default_code = 'gateway_connection_error'


class GatewayTimeoutException(PaymentException):
    default_detail = 'Payment gateway request timeout.'
    default_code = 'gateway_timeout'


class InvalidGatewayResponseException(PaymentException):
    default_detail = 'Invalid response from payment gateway.'
    default_code = 'invalid_gateway_response'

