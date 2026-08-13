from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.products.models import Category


class CategorySerializer(serializers.ModelSerializer):
    children_count = serializers.IntegerField(
        source='children.count',
        read_only=True,
        label=_('تعداد زیردسته')
    )
    image = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'parent', 'display_order', 'image',
            'is_active', 'children_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'children_count', 'created_at', 'updated_at']

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url
