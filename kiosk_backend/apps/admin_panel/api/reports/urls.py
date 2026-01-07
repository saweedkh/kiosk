from django.urls import path
from apps.admin_panel.api.reports.reports_apis import (
    SalesReportAPIView,
    ProductReportAPIView,
    StockReportAPIView,
    DailyReportAPIView,
    SalesReportExportAPIView,
    ProductReportExportAPIView,
    StockReportExportAPIView,
    DailyReportExportAPIView
)

urlpatterns = [
    path('sales/', SalesReportAPIView.as_view(), name='report-sales'),
    path('sales/export/', SalesReportExportAPIView.as_view(), name='report-sales-export'),
    path('products/', ProductReportAPIView.as_view(), name='report-products'),
    path('products/export/', ProductReportExportAPIView.as_view(), name='report-products-export'),
    path('stock/', StockReportAPIView.as_view(), name='report-stock'),
    path('stock/export/', StockReportExportAPIView.as_view(), name='report-stock-export'),
    path('daily/', DailyReportAPIView.as_view(), name='report-daily'),
    path('daily/export/', DailyReportExportAPIView.as_view(), name='report-daily-export'),
]

