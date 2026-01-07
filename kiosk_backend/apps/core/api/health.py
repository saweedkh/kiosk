from django.http import JsonResponse, HttpRequest
from django.db import connection
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def health_check(request: HttpRequest) -> JsonResponse:
    """
    Complete system health check including database connection.
    
    This endpoint is used for Docker health checks and verifies the overall
    system status including database connectivity.
    
    Args:
        request: HTTP request object (not used but required for Django URL pattern)
        
    Returns:
        JsonResponse: JSON response with system status
            - status: 'healthy' or 'unhealthy'
            - database: 'connected' or 'disconnected'
            - service: Service name
            - error: Error message (if unhealthy)
            
    Status Codes:
        200: System is healthy
        503: System is unhealthy (Service Unavailable)
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        
        return JsonResponse({
            'status': 'healthy',
            'database': 'connected',
            'service': 'kiosk_backend'
        }, status=200)
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JsonResponse({
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': str(e),
            'service': 'kiosk_backend'
        }, status=503)


def readiness_check(request: HttpRequest) -> JsonResponse:
    """
    Check if the service is ready to receive traffic.
    
    This endpoint verifies whether the service is ready to process requests.
    Used for Kubernetes readiness probe.
    
    Args:
        request: HTTP request object (not used but required for Django URL pattern)
        
    Returns:
        JsonResponse: JSON response with readiness status
            - status: 'ready' or 'not_ready'
            - checks: Dictionary containing status of each check
                - database: True/False
                - service: True
            - service: Service name
            
    Status Codes:
        200: Service is ready
        503: Service is not ready
    """
    checks = {
        'database': False,
        'service': True
    }
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        checks['database'] = True
    except Exception as e:
        logger.error(f"Readiness check failed - Database: {str(e)}")
    
    if all(checks.values()):
        return JsonResponse({
            'status': 'ready',
            'checks': checks,
            'service': 'kiosk_backend'
        }, status=200)
    else:
        return JsonResponse({
            'status': 'not_ready',
            'checks': checks,
            'service': 'kiosk_backend'
        }, status=503)


def liveness_check(request: HttpRequest) -> JsonResponse:
    """
    Check if the service is alive.
    
    This endpoint only verifies that the service is running.
    No database or dependency checks are performed.
    Used for Kubernetes liveness probe.
    
    Args:
        request: HTTP request object (not used but required for Django URL pattern)
        
    Returns:
        JsonResponse: JSON response with liveness status
            - status: 'alive'
            - service: Service name
            
    Status Codes:
        200: Service is alive
    """
    return JsonResponse({
        'status': 'alive',
        'service': 'kiosk_backend'
    }, status=200)

