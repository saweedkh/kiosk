from django.contrib import admin
from apps.core.models.settings import SiteSettings


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    """
    Admin panel برای تنظیمات سایت
    """
    list_display = ['site_name', 'contact_phone', 'contact_email', 'updated_at']
    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': ('site_name', 'logo', 'copyright_text', 'description')
        }),
        ('برند و رنگ‌بندی سایت', {
            'fields': (
                'landing_theme',
                'landing_cta_text',
                'landing_accent_color',
                'landing_bg_color',
                'landing_text_color',
                'landing_muted_color',
                'landing_background',
            )
        }),
        ('متن فیش چاپی', {
            'fields': (
                'receipt_header',
                'receipt_footer',
                'receipt_template_mode',
                'receipt_template',
                'receipt_copy_mode',
                'service_enabled',
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
                'receipt_number_mode',
                'last_receipt_number',
                'receipt_number_date',
            )
        }),
        ('اطلاعات تماس', {
            'fields': ('contact_phone', 'contact_email', 'contact_address')
        }),
        ('متادیتا', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at', 'last_receipt_number', 'receipt_number_date']
    
    def has_add_permission(self, request):
        # فقط یک رکورد مجاز است
        if SiteSettings.objects.exists():
            return False
        return super().has_add_permission(request)
    
    def has_delete_permission(self, request, obj=None):
        # حذف مجاز نیست
        return False
