from django.urls import path

from apps.bale_bot.api.views import BaleBotSettingsAPIView

urlpatterns = [
    path('settings/', BaleBotSettingsAPIView.as_view(), name='bale-bot-settings'),
]
