import django_filters
from django.utils.translation import gettext_lazy as _
from apps.products.models import Product


class ProductFilter(django_filters.FilterSet):
    category = django_filters.NumberFilter(
        field_name='category_id',
        label=_('دسته‌بندی')
    )
    min_price = django_filters.NumberFilter(
        field_name='price',
        lookup_expr='gte',
        label=_('حداقل قیمت')
    )
    max_price = django_filters.NumberFilter(
        field_name='price',
        lookup_expr='lte',
        label=_('حداکثر قیمت')
    )
    in_stock = django_filters.BooleanFilter(
        method='filter_in_stock',
        label=_('موجود در انبار')
    )
    
    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock_quantity__gt=0)
        return queryset
    
    class Meta:
        model = Product
        fields = ['category', 'is_active']
