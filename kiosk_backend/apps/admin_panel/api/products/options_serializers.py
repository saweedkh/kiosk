from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from apps.products.models import ProductOptionGroup, ProductOption


class ProductOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductOption
        fields = [
            'id', 'name', 'price_delta', 'display_order', 'is_active',
        ]


class ProductOptionGroupSerializer(serializers.ModelSerializer):
    options = ProductOptionSerializer(many=True, read_only=True)

    class Meta:
        model = ProductOptionGroup
        fields = [
            'id', 'name', 'min_select', 'max_select', 'is_required',
            'display_order', 'is_active', 'options',
        ]


class ProductOptionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductOption
        fields = [
            'id', 'group', 'name', 'price_delta', 'display_order', 'is_active',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'group': {'required': False},
        }


class ProductOptionGroupWriteSerializer(serializers.ModelSerializer):
    options = ProductOptionWriteSerializer(many=True, required=False)

    class Meta:
        model = ProductOptionGroup
        fields = [
            'id', 'product', 'name', 'min_select', 'max_select', 'is_required',
            'display_order', 'is_active', 'options',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'product': {'required': False},
        }

    def create(self, validated_data):
        options_data = validated_data.pop('options', [])
        group = ProductOptionGroup.objects.create(**validated_data)
        for opt in options_data:
            ProductOption.objects.create(group=group, **{k: v for k, v in opt.items() if k != 'group'})
        return group

    def update(self, instance, validated_data):
        options_data = validated_data.pop('options', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if options_data is not None:
            # Replace options for simplicity
            instance.options.all().delete()
            for opt in options_data:
                ProductOption.objects.create(
                    group=instance,
                    **{k: v for k, v in opt.items() if k not in ('group', 'id')},
                )
        return instance
