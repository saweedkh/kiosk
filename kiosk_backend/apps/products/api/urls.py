from django.urls import path, include

app_name = 'products'

urlpatterns = [
    path('products/', include('apps.products.api.products.urls')),
    path('categories/', include('apps.products.api.categories.urls')),
]

