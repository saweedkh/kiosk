from django.core.exceptions import ValidationError


def validate_price(value):
    if value < 0:
        raise ValidationError('Price cannot be negative.')
    if value == 0:
        raise ValidationError('Price must be greater than zero.')

