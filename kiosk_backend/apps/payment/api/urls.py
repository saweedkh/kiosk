from django.urls import path, include

from apps.payment.api.abort import PaymentAbortAPIView

app_name = 'payment'

urlpatterns = [
    path('abort/', PaymentAbortAPIView.as_view(), name='payment-abort'),
    path('transactions/', include('apps.payment.api.transactions.urls')),
]

