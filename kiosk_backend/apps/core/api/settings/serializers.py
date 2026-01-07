from rest_framework import serializers
from apps.core.models.settings import SiteSettings


class SiteSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer برای تنظیمات کامل سایت (برای Admin)
    """
    logo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = SiteSettings
        fields = [
            'id',
            'site_name',
            'logo',
            'logo_url',
            'copyright_text',
            'contact_phone',
            'contact_email',
            'contact_address',
            'description',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'logo_url']
    
    def get_logo_url(self, obj):
        """
        برگرداندن URL کامل لوگو
        """
        if obj.logo and hasattr(obj.logo, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class SiteSettingsPublicSerializer(serializers.ModelSerializer):
    """
    Serializer عمومی برای تنظیمات سایت (بدون اطلاعات حساس)
    برای استفاده در frontend
    """
    logo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = SiteSettings
        fields = [
            'site_name',
            'logo_url',
            'copyright_text',
            'contact_phone',
            'contact_email',
            'contact_address',
            'description',
        ]
    
    def get_logo_url(self, obj):
        """
        برگرداندن URL کامل لوگو
        """
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None

