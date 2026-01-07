from django.urls import path
from apps.orders.api.invoices.invoices_apis import (
    InvoiceRetrieveAPIView,
    InvoiceDownloadPDFAPIView,
    InvoiceDownloadJSONAPIView,
    InvoiceCreateAPIView
)

urlpatterns = [
    path('<int:pk>/', InvoiceRetrieveAPIView.as_view(), name='invoice-retrieve'),
    path('<int:pk>/download-pdf/', InvoiceDownloadPDFAPIView.as_view(), name='invoice-download-pdf'),
    path('<int:pk>/download-json/', InvoiceDownloadJSONAPIView.as_view(), name='invoice-download-json'),
    path('order/<int:order_id>/create/', InvoiceCreateAPIView.as_view(), name='invoice-create'),
]

