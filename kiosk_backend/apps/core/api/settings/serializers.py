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
            'payment_mode',
            'pos_host',
            'pos_port',
            'pos_timeout',
            'pos_merchant_id',
            'pos_terminal_id',
            'pos_message_format',
            'pos_use_simple_format',
            'pos_banner',
            'mock_payment_delay',
            'mock_payment_success',
            'printer_enabled',
            'printer_host',
            'printer_port',
            'cart_layout',
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

    def validate_pos_message_format(self, value):
        allowed = {c[0] for c in SiteSettings.POS_MESSAGE_FORMAT_CHOICES}
        cleaned = (value or '').strip() or SiteSettings.POS_MESSAGE_FORMAT_PARDAKHT
        if cleaned not in allowed:
            raise serializers.ValidationError('فرمت پیام پوز نامعتبر است.')
        return cleaned

    def validate_mock_payment_delay(self, value):
        try:
            delay = float(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError('تأخیر شبیه‌سازی باید عدد باشد.')
        if delay < 0 or delay > 120:
            raise serializers.ValidationError('تأخیر شبیه‌سازی باید بین ۰ تا ۱۲۰ ثانیه باشد.')
        return delay

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, 'instance', None)

        def resolved(key, default=None):
            if key in attrs:
                return attrs.get(key)
            if instance is not None:
                return getattr(instance, key, default)
            return default

        mode = str(resolved('payment_mode', 'mock') or 'mock').strip().lower()
        if mode == 'pos':
            host = (resolved('pos_host', '') or '').strip()
            if not host:
                raise serializers.ValidationError({
                    'pos_host': 'در حالت ارسال به پوز، آی‌پی کارتخوان الزامی است.',
                })
            port = resolved('pos_port', 1362)
            try:
                port_int = int(port)
            except (TypeError, ValueError):
                port_int = 0
            if port_int < 1 or port_int > 65535:
                raise serializers.ValidationError({
                    'pos_port': 'پورت پوز باید بین ۱ تا ۶۵۵۳۵ باشد.',
                })

        if bool(resolved('printer_enabled', False)):
            printer_host = (resolved('printer_host', '') or '').strip()
            if not printer_host:
                raise serializers.ValidationError({
                    'printer_host': 'با فعال بودن چاپ فیش، آی‌پی پرینتر الزامی است.',
                })

        return attrs

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
