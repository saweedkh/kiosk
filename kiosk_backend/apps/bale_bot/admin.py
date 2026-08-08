from django.contrib import admin
from apps.bale_bot.models import BotConversation, BaleBotSettings


@admin.register(BotConversation)
class BotConversationAdmin(admin.ModelAdmin):
    list_display = ['chat_id', 'state', 'updated_at']
    search_fields = ['chat_id', 'state']


@admin.register(BaleBotSettings)
class BaleBotSettingsAdmin(admin.ModelAdmin):
    list_display = ['is_enabled', 'api_base', 'updated_at']
    readonly_fields = ['updated_at', 'created_at']
