from django.urls import path, include

app_name = 'payment'

urlpatterns = [
    path('transactions/', include('apps.payment.api.transactions.urls')),
]

