from django.urls import path, include

app_name = 'api'

urlpatterns = [
    path('products/', include('apps.products.api.urls')),
    path('orders/', include('apps.orders.api.urls')),
    path('payment/', include('apps.payment.api.urls')),
    path('admin/', include('apps.admin_panel.api.urls')),
    path('settings/', include('apps.core.api.settings.urls')),
    path('accounts/', include('apps.accounts.api.urls')),
    path('bale/', include('apps.bale_bot.api.urls')),
]

