from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.products.models import Category


class AdminCategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.name', read_only=True, label=_('نام دسته والد'))
    children_count = serializers.IntegerField(source='children.count', read_only=True, label=_('تعداد زیردسته'))
    image = serializers.ImageField(required=False, allow_null=True, label=_('تصویر'))

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'parent', 'parent_name', 'display_order', 'image',
            'is_active', 'children_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'children_count', 'created_at', 'updated_at']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.image:
            request = self.context.get('request')
            if request:
                representation['image'] = request.build_absolute_uri(instance.image.url)
            else:
                representation['image'] = instance.image.url
        else:
            representation['image'] = None
        return representation


class AdminCategoryListSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'display_order', 'is_active', 'image']
        read_only_fields = ['id']

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url
