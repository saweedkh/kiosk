from django.urls import path
from apps.payment.api.transactions.transactions_apis import (
    TransactionListAPIView,
    TransactionRetrieveAPIView
)

urlpatterns = [
    path('', TransactionListAPIView.as_view(), name='transaction-list'),
    path('<int:pk>/', TransactionRetrieveAPIView.as_view(), name='transaction-retrieve'),
]

