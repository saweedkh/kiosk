from rest_framework import status
from .base import BaseAPIException


class PaymentException(BaseAPIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Payment error occurred.'
    default_code = 'payment_error'


class PaymentFailedException(PaymentException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = 'Payment failed.'
    default_code = 'payment_failed'


class GatewayConnectionException(PaymentException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Payment gateway connection error.'
    default_code = 'gateway_connection_error'

