from rest_framework import status
from .base import BaseAPIException


class OrderException(BaseAPIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Order error occurred.'
    default_code = 'order_error'


class OrderNotFoundException(OrderException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Order not found.'
    default_code = 'order_not_found'


class InsufficientStockException(OrderException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Insufficient stock available.'
    default_code = 'insufficient_stock'

