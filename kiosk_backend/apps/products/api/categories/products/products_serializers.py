from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.products.models import Product
from apps.products.api.products.products_serializers import PublicProductOptionGroupSerializer


class CategoryProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source='category.name',
        read_only=True,
        label=_('نام دسته‌بندی')
    )
    image = serializers.SerializerMethodField()
    option_groups = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'category_name',
            'image', 'stock_quantity', 'is_in_stock', 'service_fee_applicable',
            'option_groups',
        ]
    
    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_option_groups(self, obj):
        groups = [g for g in obj.option_groups.all() if g.is_active]
        groups = sorted(groups, key=lambda g: (g.display_order, g.id))
        return PublicProductOptionGroupSerializer(groups, many=True).data

