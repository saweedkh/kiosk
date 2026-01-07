from django_filters import rest_framework as filters
from django.utils.translation import gettext_lazy as _
from apps.orders.models import Order


class AdminOrderFilter(filters.FilterSet):
    order_number = filters.CharFilter(lookup_expr='icontains', label=_('شماره سفارش'))
    status = filters.ChoiceFilter(choices=Order.STATUS_CHOICES, label=_('وضعیت'))
    payment_status = filters.CharFilter(label=_('وضعیت پرداخت'))
    amount_min = filters.NumberFilter(field_name='total_amount', lookup_expr='gte', label=_('حداقل مبلغ'))
    amount_max = filters.NumberFilter(field_name='total_amount', lookup_expr='lte', label=_('حداکثر مبلغ'))
    
    class Meta:
        model = Order
        fields = ['order_number', 'status', 'payment_status', 'amount_min', 'amount_max']

