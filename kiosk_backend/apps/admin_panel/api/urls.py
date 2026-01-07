from django.urls import path, include

app_name = 'admin_panel'

urlpatterns = [
    path('auth/', include('apps.admin_panel.api.auth.urls')),
    path('products/', include('apps.admin_panel.api.products.urls')),
    path('categories/', include('apps.admin_panel.api.categories.urls')),
    path('orders/', include('apps.admin_panel.api.orders.urls')),
    path('reports/', include('apps.admin_panel.api.reports.urls')),
]

