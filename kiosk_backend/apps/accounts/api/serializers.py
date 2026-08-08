from rest_framework import serializers
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model

from apps.accounts.permissions_catalog import ALL_PERMISSION_CODES
from apps.accounts.services.user_service import GroupService, UserService

User = get_user_model()


class GroupSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=150)
    permissions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    permission_labels = serializers.ListField(read_only=True, required=False)
    user_count = serializers.IntegerField(read_only=True, required=False)

    def validate_permissions(self, value):
        invalid = [c for c in value if c not in ALL_PERMISSION_CODES]
        if invalid:
            raise serializers.ValidationError(f'دسترسی نامعتبر: {", ".join(invalid)}')
        return value

    def to_representation(self, instance):
        if isinstance(instance, Group):
            return GroupService.serialize_group(instance)
        return instance


class AdminUserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    first_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name = serializers.CharField(required=False, allow_blank=True, default='')
    is_staff = serializers.BooleanField(default=True)
    is_active = serializers.BooleanField(default=True)
    is_superuser = serializers.BooleanField(default=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    group_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
    )
    groups = serializers.ListField(read_only=True, required=False)
    permissions = serializers.ListField(read_only=True, required=False)
    bale_chat_id = serializers.CharField(required=False, allow_blank=True, default='')
    bale_enabled = serializers.BooleanField(default=False)

    def to_representation(self, instance):
        if isinstance(instance, User):
            return UserService.serialize_user(instance)
        return instance


class PermissionCatalogItemSerializer(serializers.Serializer):
    codename = serializers.CharField()
    name = serializers.CharField()
    full_code = serializers.CharField()
