from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.products.models import Category


def _absolute_image_url(obj, request):
    if not obj.image:
        return None
    if request:
        return request.build_absolute_uri(obj.image.url)
    return obj.image.url


class CategoryListSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'display_order', 'is_active', 'image']

    def get_image(self, obj):
        return _absolute_image_url(obj, self.context.get('request'))
