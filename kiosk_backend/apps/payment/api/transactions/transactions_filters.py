from django_filters import rest_framework as filters
from django.utils.translation import gettext_lazy as _
from apps.payment.models import Transaction


class TransactionFilter(filters.FilterSet):
    status = filters.ChoiceFilter(
        choices=Transaction.STATUS_CHOICES,
        label=_('وضعیت')
    )
    gateway_name = filters.CharFilter(
        lookup_expr='icontains',
        label=_('نام Gateway')
    )
    order_id = filters.NumberFilter(
        label=_('شناسه سفارش')
    )
    amount_min = filters.NumberFilter(
        field_name='amount',
        lookup_expr='gte',
        label=_('حداقل مبلغ')
    )
    amount_max = filters.NumberFilter(
        field_name='amount',
        lookup_expr='lte',
        label=_('حداکثر مبلغ')
    )
    
    class Meta:
        model = Transaction
        fields = ['status', 'gateway_name', 'order_id', 'amount_min', 'amount_max']

