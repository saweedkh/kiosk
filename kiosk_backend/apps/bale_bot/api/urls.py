from django.urls import path

from apps.bale_bot.api.views import BaleBotHealthAPIView, BaleBotSettingsAPIView

urlpatterns = [
    path('settings/', BaleBotSettingsAPIView.as_view(), name='bale-bot-settings'),
    path('health/', BaleBotHealthAPIView.as_view(), name='bale-bot-health'),
]
