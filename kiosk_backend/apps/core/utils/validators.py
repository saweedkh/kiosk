from django.core.exceptions import ValidationError


def validate_positive_number(value):
    if value < 0:
        raise ValidationError('Value must be positive.')

