from django_filters import rest_framework as filters
from django.utils.translation import gettext_lazy as _
from apps.products.models import Product


class AdminProductFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr='icontains', label=_('نام'))
    category = filters.NumberFilter(label=_('دسته‌بندی'))
    price_min = filters.NumberFilter(field_name='price', lookup_expr='gte', label=_('حداقل قیمت'))
    price_max = filters.NumberFilter(field_name='price', lookup_expr='lte', label=_('حداکثر قیمت'))
    is_active = filters.BooleanFilter(label=_('فعال'))
    is_in_stock = filters.BooleanFilter(label=_('موجود در انبار'))
    
    class Meta:
        model = Product
        fields = ['name', 'category', 'price_min', 'price_max', 'is_active', 'is_in_stock']

