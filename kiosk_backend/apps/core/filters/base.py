import django_filters


class BaseFilterSet(django_filters.FilterSet):
    class Meta:
        abstract = True

