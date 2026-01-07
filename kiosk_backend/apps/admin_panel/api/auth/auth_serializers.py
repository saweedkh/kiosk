from typing import Any


from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model

User = get_user_model()


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(label=_('نام کاربری'))
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
        label=_('رمز عبور')
    )
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError(_('نام کاربری یا رمز عبور اشتباه است.'))
            if not user.is_active:
                raise serializers.ValidationError(_('حساب کاربری غیرفعال است.'))
            if not user.is_staff:
                raise serializers.ValidationError(_('دسترسی ادمین ندارید.'))
            attrs['user'] = user
        else:
            raise serializers.ValidationError(_('نام کاربری و رمز عبور الزامی است.'))
        
        return attrs

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active']
        read_only_fields = ['id', 'username', 'email', 'is_staff', 'is_active']
    
class LoginResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField(help_text=_('توکن دسترسی'))
    refresh_token = serializers.CharField(help_text=_('توکن رفرش'))
    user_info = UserSerializer(help_text=_('اطلاعات کاربری'))


class LogoutResponseSerializer(serializers.Serializer):
    """Serializer for logout response."""
    message = serializers.CharField(help_text=_('پیام خروج با موفقیت'))


class UserInfoResponseSerializer(serializers.Serializer):
    """Serializer for user info response."""
    user = UserSerializer(help_text=_('اطلاعات کاربری'))

