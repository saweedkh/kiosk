"""
Custom pagination for report APIs.
This pagination class is used to paginate report data while keeping summary statistics.
"""
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class ReportPagination(PageNumberPagination):
    """
    Custom pagination for reports.
    
    This pagination class provides pagination for report data lists
    while maintaining summary statistics in the response.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500
    
    def get_paginated_response(self, data, summary_data=None):
        """
        Return a paginated response with summary statistics.
        
        Args:
            data: Paginated data list
            summary_data: Dictionary containing summary statistics
            
        Returns:
            Response: Paginated response with summary data
        """
        response_data = {
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'page_size': self.page_size,
            'current_page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'results': data
        }
        
        # Add summary data if provided
        if summary_data:
            response_data['summary'] = summary_data
        
        return Response(response_data)

