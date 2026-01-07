from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.products.models import Product


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source='category.name',
        read_only=True,
        label=_('نام دسته‌بندی')
    )
    image = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'category_name', 'category',
            'image', 'stock_quantity', 'is_in_stock'
        ]
    
    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
