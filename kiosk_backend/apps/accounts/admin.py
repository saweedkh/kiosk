from django.contrib import admin
from apps.accounts.models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'bale_chat_id', 'bale_enabled', 'created_at']
    list_filter = ['bale_enabled']
    search_fields = ['user__username', 'bale_chat_id']
