from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.products.models import Category


class CategorySerializer(serializers.ModelSerializer):
    children_count = serializers.IntegerField(
        source='children.count',
        read_only=True,
        label=_('تعداد زیردسته')
    )
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'parent', 'display_order',
            'is_active', 'children_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'children_count', 'created_at', 'updated_at']

