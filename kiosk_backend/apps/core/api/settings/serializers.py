from rest_framework import serializers
from apps.core.models.settings import SiteSettings


class SiteSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer برای تنظیمات کامل سایت (برای Admin)
    """
    logo_url = serializers.SerializerMethodField()
    next_receipt_number = serializers.SerializerMethodField()
    active_receipt_template = serializers.SerializerMethodField()
    
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
            'receipt_header',
            'receipt_footer',
            'receipt_template',
            'receipt_template_mode',
            'active_receipt_template',
            'receipt_copy_mode',
            'service_enabled',
            'service_fee',
            'service_fee_dine_in',
            'service_fee_takeaway',
            'receipt_number_mode',
            'last_receipt_number',
            'next_receipt_number',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'logo_url',
            'last_receipt_number',
            'next_receipt_number',
            'active_receipt_template',
        ]
    
    def get_logo_url(self, obj):
        """
        Same-origin relative /media URL (works behind nginx on customer installs).
        """
        if obj.logo and hasattr(obj.logo, 'url'):
            url = obj.logo.url
            if url.startswith('http://') or url.startswith('https://'):
                return url
            if not url.startswith('/'):
                url = f'/{url}'
            return url
        return None

    def get_next_receipt_number(self, obj):
        return obj.effective_next_receipt_number()

    def get_active_receipt_template(self, obj):
        return obj.resolve_receipt_template()


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
            'receipt_header',
            'receipt_footer',
            'receipt_template',
            'service_enabled',
            'service_fee',
            'service_fee_dine_in',
            'service_fee_takeaway',
        ]
    
    def get_logo_url(self, obj):
        """
        Prefer same-origin relative /media URL so SSR metadata and browser
        both work behind nginx (avoids backend:8000 absolute hosts).
        """
        if obj.logo and hasattr(obj.logo, 'url'):
            url = obj.logo.url
            if url.startswith('http://') or url.startswith('https://'):
                return url
            if not url.startswith('/'):
                url = f'/{url}'
            return url
        return None

