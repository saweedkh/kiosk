from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.products.models import Category


class AdminCategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.name', read_only=True, label=_('نام دسته والد'))
    children_count = serializers.IntegerField(source='children.count', read_only=True, label=_('تعداد زیردسته'))
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'parent', 'parent_name', 'display_order',
            'is_active', 'children_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'children_count', 'created_at', 'updated_at']


class AdminCategoryListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'display_order', 'is_active']
        read_only_fields = ['id']

