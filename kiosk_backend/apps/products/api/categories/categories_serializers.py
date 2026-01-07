from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.products.models import Category


class CategoryListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'display_order', 'is_active']
