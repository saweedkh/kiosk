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
        ('اطلاعات تماس', {
            'fields': ('contact_phone', 'contact_email', 'contact_address')
        }),
        ('متادیتا', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']
    
    def has_add_permission(self, request):
        # فقط یک رکورد مجاز است
        if SiteSettings.objects.exists():
            return False
        return super().has_add_permission(request)
    
    def has_delete_permission(self, request, obj=None):
        # حذف مجاز نیست
        return False
