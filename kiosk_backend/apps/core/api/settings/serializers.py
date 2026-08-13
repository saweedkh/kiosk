import re

from rest_framework import serializers
from apps.core.models.settings import SiteSettings


_HEX_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')


def _media_url(file_field):
    """Same-origin relative /media URL (works behind nginx)."""
    if file_field and hasattr(file_field, 'url'):
        url = file_field.url
        if url.startswith('http://') or url.startswith('https://'):
            return url
        if not url.startswith('/'):
            url = f'/{url}'
        return url
    return None


def _clean_hex_color(value):
    """Allow empty (theme default) or #RRGGBB."""
    if value is None:
        return ''
    cleaned = str(value).strip()
    if not cleaned:
        return ''
    if not _HEX_RE.match(cleaned):
        raise serializers.ValidationError('رنگ باید به صورت #RRGGBB باشد.')
    return cleaned.upper()


class SiteSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer برای تنظیمات کامل سایت (برای Admin)
    """
    logo_url = serializers.SerializerMethodField()
    landing_background_url = serializers.SerializerMethodField()
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
            'landing_theme',
            'landing_cta_text',
            'landing_accent_color',
            'landing_bg_color',
            'landing_text_color',
            'landing_muted_color',
            'landing_background',
            'landing_background_url',
            'receipt_header',
            'receipt_footer',
            'receipt_template',
            'receipt_template_mode',
            'active_receipt_template',
            'receipt_copy_mode',
            'service_enabled',
            'coupons_enabled',
            'service_fee',
            'service_fee_dine_in',
            'service_fee_takeaway',
            'fulfillment_choice_enabled',
            'dine_in_enabled',
            'takeaway_enabled',
            'cart_layout',
            'pos_payment_mode',
            'mock_payment_delay',
            'mock_payment_success_rate',
            'pos_ip',
            'pos_port',
            'printer_enabled',
            'printer_ip',
            'printer_port',
            'catalog_revision',
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
            'landing_background_url',
            'last_receipt_number',
            'next_receipt_number',
            'active_receipt_template',
            'catalog_revision',
        ]

    def validate_landing_accent_color(self, value):
        return _clean_hex_color(value)

    def validate_landing_bg_color(self, value):
        return _clean_hex_color(value)

    def validate_landing_text_color(self, value):
        return _clean_hex_color(value)

    def validate_landing_muted_color(self, value):
        return _clean_hex_color(value)

    def validate_pos_port(self, value):
        port = int(value)
        if port < 1 or port > 65535:
            raise serializers.ValidationError('پورت باید بین ۱ تا ۶۵۵۳۵ باشد.')
        return port

    def validate_printer_port(self, value):
        port = int(value)
        if port < 1 or port > 65535:
            raise serializers.ValidationError('پورت باید بین ۱ تا ۶۵۵۳۵ باشد.')
        return port

    def validate_mock_payment_delay(self, value):
        delay = int(value)
        if delay < 1 or delay > 60:
            raise serializers.ValidationError('تأخیر Mock باید بین ۱ تا ۶۰ ثانیه باشد.')
        return delay

    def validate_mock_payment_success_rate(self, value):
        rate = int(value)
        if rate < 0 or rate > 100:
            raise serializers.ValidationError('نرخ موفقیت باید بین ۰ تا ۱۰۰ باشد.')
        return rate

    def get_logo_url(self, obj):
        return _media_url(obj.logo)

    def get_landing_background_url(self, obj):
        return _media_url(obj.landing_background)

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
    landing_background_url = serializers.SerializerMethodField()

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
            'landing_theme',
            'landing_cta_text',
            'landing_accent_color',
            'landing_bg_color',
            'landing_text_color',
            'landing_muted_color',
            'landing_background_url',
            'landing_ab_enabled',
            'landing_theme_b',
            'landing_ab_split',
            'receipt_header',
            'receipt_footer',
            'receipt_template',
            'service_enabled',
            'coupons_enabled',
            'service_fee',
            'service_fee_dine_in',
            'service_fee_takeaway',
            'fulfillment_choice_enabled',
            'dine_in_enabled',
            'takeaway_enabled',
            'cart_layout',
            'catalog_revision',
        ]

    def get_logo_url(self, obj):
        return _media_url(obj.logo)

    def get_landing_background_url(self, obj):
        return _media_url(obj.landing_background)
