from typing import Optional, Dict, Any
from django.utils import timezone
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from apps.admin_panel.selectors.report_selector import ReportSelector
from apps.logs.services.log_service import LogService

User = get_user_model()


class ReportService:
    """
    Report generation service for admin panel.
    
    This class provides methods for generating various reports
    including sales, transactions, products, stock, and daily reports.
    """
    
    @staticmethod
    def get_sales_report(
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user: Optional[User] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive sales and transaction report for specified date range.
        
        Args:
            start_date: Start date for report (optional)
            end_date: End date for report (optional)
            user: Admin user requesting the report (optional)
            
        Returns:
            Dict[str, Any]: Sales and transaction report data including:
                - total_sales: Total sales amount
                - total_orders: Total number of orders
                - average_order_value: Average order value
                - total_transactions: Total number of transactions
                - successful_transactions: Number of successful transactions
                - failed_transactions: Number of failed transactions
                - successful_amount: Total successful transaction amount
                - orders: List of orders in date range
        """
        report = ReportSelector.get_sales_report(start_date, end_date)
        
        LogService.log_info(
            'admin',
            'sales_report_generated',
            user=user,
            details={
                'start_date': str(start_date) if start_date else None,
                'end_date': str(end_date) if end_date else None
            }
        )
        
        return report
    
    
    @staticmethod
    def get_product_report(user: Optional[User] = None) -> Dict[str, Any]:
        """
        Get product report with statistics.
        
        Args:
            user: Admin user requesting the report (optional)
            
        Returns:
            Dict[str, Any]: Product report data including:
                - products: List of products with statistics
                - total_products: Total number of products
                - active_products: Number of active products
        """
        report = ReportSelector.get_product_report()
        
        LogService.log_info(
            'admin',
            'product_report_generated',
            user=user
        )
        
        return report
    
    @staticmethod
    def get_stock_report(user: Optional[User] = None) -> Dict[str, Any]:
        """
        Get stock report with inventory statistics.
        
        Args:
            user: Admin user requesting the report (optional)
            
        Returns:
            Dict[str, Any]: Stock report data including:
                - total_products: Total number of products
                - out_of_stock_count: Number of products out of stock
        """
        report = ReportSelector.get_stock_report()
        
        LogService.log_info(
            'admin',
            'stock_report_generated',
            user=user
        )
        
        return report
    
    @staticmethod
    def get_daily_report(date: Optional[datetime] = None, user: Optional[User] = None) -> Dict[str, Any]:
        """
        Get daily report for a specific date.
        
        Args:
            date: Date for report (defaults to today if not provided)
            user: Admin user requesting the report (optional)
            
        Returns:
            Dict[str, Any]: Daily report data including:
                - date: Report date
                - total_sales: Total sales for the day
                - total_orders: Number of orders for the day
                - total_transactions: Number of transactions for the day
                - orders: List of orders for the day
        """
        report = ReportSelector.get_daily_report(date)
        
        LogService.log_info(
            'admin',
            'daily_report_generated',
            user=user,
            details={'date': str(date) if date else None}
        )
        
        return report

