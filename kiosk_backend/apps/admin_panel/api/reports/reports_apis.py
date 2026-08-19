from rest_framework import generics, status
from rest_framework.response import Response
from apps.admin_panel.api.reports.reports_serializers import (
    DateRangeSerializer,
    DailyReportSerializer,
    HourlyReportSerializer,
    ExceptionReportSerializer,
    SalesReportResponseSerializer,
    ProductReportResponseSerializer,
    StockReportResponseSerializer,
    DailyReportResponseSerializer,
    HourlyReportResponseSerializer,
)
from apps.admin_panel.utils.report_constants import get_business_day_start
from apps.admin_panel.api.reports.reports_pagination import ReportPagination
from apps.admin_panel.api.permissions import IsAdminUser, HasAppPermission
from apps.admin_panel.services.report_service import ReportService
from apps.admin_panel.utils.excel_export import ExcelExporter
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


def _resolve_business_start(params: dict) -> tuple[int, int]:
    hour = params.get('business_day_start_hour')
    minute = params.get('business_day_start_minute')
    if hour is None and minute is None:
        return get_business_day_start()
    default_hour, default_minute = get_business_day_start()
    resolved_hour = default_hour if hour is None else max(0, min(23, int(hour)))
    resolved_minute = default_minute if minute is None else max(0, min(59, int(minute)))
    return resolved_hour, resolved_minute


def _business_start_kwargs(params: dict) -> dict:
    hour, minute = _resolve_business_start(params)
    return {
        'business_day_start_hour': hour,
        'business_day_start_minute': minute,
    }


def _list_summary(report: dict, *, exclude: set[str]) -> dict:
    return {key: value for key, value in report.items() if key not in exclude}


class SalesReportAPIView(generics.GenericAPIView):
    """
    API endpoint for generating sales report (Admin only).
    
    Query Parameters:
        start_date: Start date for report (optional)
        end_date: End date for report (optional)
        page: Page number (optional, default: 1)
        page_size: Items per page (optional, default: 50, max: 500)
        
    Returns comprehensive sales and transaction statistics including total sales, total orders, average order value, and transaction details (successful/failed transactions).
    Orders list is paginated.
    """
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'
    serializer_class = DateRangeSerializer
    pagination_class = ReportPagination
    
    @custom_extend_schema(
        resource_name="SalesReport",
        response_serializer=SalesReportResponseSerializer,
        status_codes=[
            ResponseStatusCodes.OK_PAGINATED,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Sales Report",
        description="Generate comprehensive sales and transaction report with statistics including total sales, total orders, average order value, and transaction details. Orders list is paginated.",
        tags=["Admin - Reports"],
        operation_id="admin_reports_sales",
    )
    def get(self, request):
        """
        Generate sales report with pagination.
        
        Args:
            request: HTTP request object with optional date range and pagination params
            
        Returns:
            Response: Sales report data with paginated orders list
        """
        params_serializer = DateRangeSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        params = params_serializer.validated_data
        
        report = ReportService.get_sales_report(
            start_date=params.get('start_date'),
            end_date=params.get('end_date'),
            preset=params.get('preset'),
            **_business_start_kwargs(params),
            user=request.user,
        )

        summary_data = _list_summary(report, exclude={'orders'})
        
        # Get orders list for pagination
        orders = report.get('orders', [])
        
        # Paginate orders
        paginator = self.pagination_class()
        paginated_orders = paginator.paginate_queryset(orders, request)
        
        # Return paginated response with summary
        return paginator.get_paginated_response(
            paginated_orders,
            summary_data=summary_data
        )


class ProductReportAPIView(generics.GenericAPIView):
    """
    API endpoint for generating product report (Admin only).
    
    Query Parameters:
        page: Page number (optional, default: 1)
        page_size: Items per page (optional, default: 50, max: 500)
        
    Returns product statistics including total products, active products, and low stock products.
    Products list is paginated.
    """
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'
    pagination_class = ReportPagination
    
    @custom_extend_schema(
        resource_name="ProductReport",
        response_serializer=ProductReportResponseSerializer,
        status_codes=[
            ResponseStatusCodes.OK_PAGINATED,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Product Report",
        description="Generate product report with statistics including total products, active products, and low stock products. Products list is paginated.",
        tags=["Admin - Reports"],
        operation_id="admin_reports_product",
    )
    def get(self, request):
        """
        Generate product report with pagination.
        
        Args:
            request: HTTP request object with optional pagination params
            
        Returns:
            Response: Product report data with paginated products list
        """
        report = ReportService.get_product_report(user=request.user)
        
        summary_data = _list_summary(report, exclude={'products'})
        products = report.get('products', [])
        
        paginator = self.pagination_class()
        paginated_products = paginator.paginate_queryset(products, request)
        
        # Return paginated response with summary
        return paginator.get_paginated_response(
            paginated_products,
            summary_data=summary_data
        )


class StockReportAPIView(generics.GenericAPIView):
    """
    API endpoint for generating stock report (Admin only).
    
    Query Parameters:
        page: Page number (optional, default: 1)
        page_size: Items per page (optional, default: 50, max: 500)
        
    Returns inventory statistics including stock levels and stock value.
    Stock details list is paginated.
    """
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'
    pagination_class = ReportPagination
    
    @custom_extend_schema(
        resource_name="StockReport",
        response_serializer=StockReportResponseSerializer,
        status_codes=[
            ResponseStatusCodes.OK_PAGINATED,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Stock Report",
        description="Generate stock report with inventory statistics including stock levels and stock value. Stock details list is paginated.",
        tags=["Admin - Reports"],
        operation_id="admin_reports_stock",
    )
    def get(self, request):
        """
        Generate stock report with pagination.
        
        Args:
            request: HTTP request object with optional pagination params
            
        Returns:
            Response: Stock report data with paginated stock details list
        """
        report = ReportService.get_stock_report(user=request.user)
        summary_data = _list_summary(report, exclude={'stock_details'})
        stock_details = report.get('stock_details', [])
        
        paginator = self.pagination_class()
        paginated_stock = paginator.paginate_queryset(stock_details, request)
        
        # Return paginated response with summary
        return paginator.get_paginated_response(
            paginated_stock,
            summary_data=summary_data
        )


class DailyReportAPIView(generics.GenericAPIView):
    """
    API endpoint for generating daily report (Admin only).
    
    Query Parameters:
        date: Date for report (optional, defaults to today)
        page: Page number (optional, default: 1)
        page_size: Items per page (optional, default: 50, max: 500)
        
    Returns daily statistics including sales, orders, and transactions for a specific date.
    Orders list is paginated.
    """
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'
    serializer_class = DailyReportSerializer
    pagination_class = ReportPagination
    
    @custom_extend_schema(
        resource_name="DailyReport",
        response_serializer=DailyReportResponseSerializer,
        status_codes=[
            ResponseStatusCodes.OK_PAGINATED,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Daily Report",
        description="Generate daily report with statistics including sales, orders, and transactions for a specific date. Orders list is paginated.",
        tags=["Admin - Reports"],
        operation_id="admin_reports_daily",
    )
    def get(self, request):
        """
        Generate daily report with pagination.
        
        Args:
            request: HTTP request object with optional date and pagination params
            
        Returns:
            Response: Daily report data with paginated orders list
        """
        params_serializer = DailyReportSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        params = params_serializer.validated_data
        
        report = ReportService.get_daily_report(
            date=params.get('date'),
            **_business_start_kwargs(params),
            user=request.user,
        )

        summary_data = _list_summary(report, exclude={'orders'})
        
        # Get orders list for pagination
        orders = report.get('orders', [])
        
        # Paginate orders
        paginator = self.pagination_class()
        paginated_orders = paginator.paginate_queryset(orders, request)
        
        # Return paginated response with summary
        return paginator.get_paginated_response(
            paginated_orders,
            summary_data=summary_data
        )


class HourlyReportAPIView(generics.GenericAPIView):
    """
    API endpoint for generating hourly report (Admin only).

    Query Parameters:
        date: Date for report (optional, defaults to today)
        business_day_start_hour: Business day start hour in 24h format
        page: Page number (optional, default: 1)
        page_size: Items per page (optional, default: 50, max: 500)

    Returns hourly statistics for a configurable 24-hour business-day window.
    Hour rows are paginated.
    """
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'
    serializer_class = HourlyReportSerializer
    pagination_class = ReportPagination

    @custom_extend_schema(
        resource_name="HourlyReport",
        response_serializer=HourlyReportResponseSerializer,
        status_codes=[
            ResponseStatusCodes.OK_PAGINATED,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Hourly Report",
        description="Generate hourly report with configurable business-day start hour. Sales totals include only successful transactions.",
        tags=["Admin - Reports"],
        operation_id="admin_reports_hourly",
    )
    def get(self, request):
        params_serializer = HourlyReportSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        params = params_serializer.validated_data

        report = ReportService.get_hourly_report(
            date=params.get('date'),
            **_business_start_kwargs(params),
            user=request.user,
        )

        summary_data = _list_summary(report, exclude={'hours'})

        hours = report.get('hours', [])

        paginator = self.pagination_class()
        paginated_hours = paginator.paginate_queryset(hours, request)

        return paginator.get_paginated_response(
            paginated_hours,
            summary_data=summary_data
        )


# Export Views
class SalesReportExportAPIView(generics.GenericAPIView):
    """
    API endpoint for exporting sales report to Excel (Admin only).
    
    Query Parameters:
        start_date: Start date for report (optional)
        end_date: End date for report (optional)
        
    Returns Excel file with sales report data.
    """
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'
    serializer_class = DateRangeSerializer
    
    @custom_extend_schema(
        resource_name="SalesReportExport",
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Export Sales Report to Excel",
        description="Export sales report to Excel format with statistics and order details.",
        tags=["Admin - Reports"],
        operation_id="admin_reports_sales_export",
    )
    def get(self, request):
        """Export sales report to Excel and return file URL."""
        params_serializer = DateRangeSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        params = params_serializer.validated_data
        
        report = ReportService.get_sales_report(
            start_date=params.get('start_date'),
            end_date=params.get('end_date'),
            preset=params.get('preset'),
            **_business_start_kwargs(params),
            user=request.user,
        )
        
        file_url = ExcelExporter.export_sales_report(report, request=request)
        
        return Response({
            'message': 'گزارش با موفقیت ایجاد شد',
            'file_url': file_url
        }, status=status.HTTP_200_OK)


class ProductReportExportAPIView(generics.GenericAPIView):
    """
    API endpoint for exporting product report to Excel (Admin only).
    
    Returns Excel file with product report data.
    """
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'
    
    @custom_extend_schema(
        resource_name="ProductReportExport",
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Export Product Report to Excel",
        description="Export product report to Excel format with product statistics and sales data.",
        tags=["Admin - Reports"],
        operation_id="admin_reports_product_export",
    )
    def get(self, request):
        """Export product report to Excel and return file URL."""
        report = ReportService.get_product_report(user=request.user)
        
        file_url = ExcelExporter.export_product_report(report, request=request)
        
        return Response({
            'message': 'گزارش با موفقیت ایجاد شد',
            'file_url': file_url
        }, status=status.HTTP_200_OK)


class StockReportExportAPIView(generics.GenericAPIView):
    """
    API endpoint for exporting stock report to Excel (Admin only).
    
    Returns Excel file with stock report data.
    """
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'
    
    @custom_extend_schema(
        resource_name="StockReportExport",
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Export Stock Report to Excel",
        description="Export stock report to Excel format with inventory statistics and stock details.",
        tags=["Admin - Reports"],
        operation_id="admin_reports_stock_export",
    )
    def get(self, request):
        """Export stock report to Excel and return file URL."""
        report = ReportService.get_stock_report(user=request.user)
        
        file_url = ExcelExporter.export_stock_report(report, request=request)
        
        return Response({
            'message': 'گزارش با موفقیت ایجاد شد',
            'file_url': file_url
        }, status=status.HTTP_200_OK)


class DailyReportExportAPIView(generics.GenericAPIView):
    """
    API endpoint for exporting daily report to Excel (Admin only).
    
    Query Parameters:
        date: Date for report (optional, defaults to today)
        
    Returns Excel file with daily report data.
    """
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'
    serializer_class = DailyReportSerializer
    
    @custom_extend_schema(
        resource_name="DailyReportExport",
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Export Daily Report to Excel",
        description="Export daily report to Excel format with daily statistics and order details.",
        tags=["Admin - Reports"],
        operation_id="admin_reports_daily_export",
    )
    def get(self, request):
        """Export daily report to Excel and return file URL."""
        params_serializer = DailyReportSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        params = params_serializer.validated_data
        
        report = ReportService.get_daily_report(
            date=params.get('date'),
            **_business_start_kwargs(params),
            user=request.user,
        )
        
        file_url = ExcelExporter.export_daily_report(report, request=request)
        
        return Response({
            'message': 'گزارش با موفقیت ایجاد شد',
            'file_url': file_url
        }, status=status.HTTP_200_OK)


class HourlyReportExportAPIView(generics.GenericAPIView):
    """Export hourly report to Excel."""

    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'
    serializer_class = HourlyReportSerializer

    @custom_extend_schema(
        resource_name="HourlyReportExport",
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Export Hourly Report to Excel",
        description="Export hourly report to Excel format.",
        tags=["Admin - Reports"],
        operation_id="admin_reports_hourly_export",
    )
    def get(self, request):
        params_serializer = HourlyReportSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        params = params_serializer.validated_data

        report = ReportService.get_hourly_report(
            date=params.get('date'),
            **_business_start_kwargs(params),
            user=request.user,
        )

        file_url = ExcelExporter.export_hourly_report(report, request=request)

        return Response({
            'message': 'گزارش با موفقیت ایجاد شد',
            'file_url': file_url,
        }, status=status.HTTP_200_OK)


class ExceptionReportAPIView(generics.GenericAPIView):
    """Exception / alert report for current business day."""

    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'view_reports'
    serializer_class = ExceptionReportSerializer

    @custom_extend_schema(
        resource_name="ExceptionReport",
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="Exception Report",
        description="Failed payments, stuck orders, and low stock for the current business day.",
        tags=["Admin - Reports"],
        operation_id="admin_reports_exceptions",
    )
    def get(self, request):
        params_serializer = ExceptionReportSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        params = params_serializer.validated_data

        report = ReportService.get_exception_report(
            **_business_start_kwargs(params),
            user=request.user,
        )

        return Response(report, status=status.HTTP_200_OK)

