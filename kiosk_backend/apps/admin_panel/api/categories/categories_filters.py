from django_filters import rest_framework as filters
from django.utils.translation import gettext_lazy as _
from apps.products.models import Category


class AdminCategoryFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr='icontains', label=_('نام'))
    parent = filters.NumberFilter(label=_('دسته والد'))
    is_active = filters.BooleanFilter(label=_('فعال'))
    
    class Meta:
        model = Category
        fields = ['name', 'parent', 'is_active']

