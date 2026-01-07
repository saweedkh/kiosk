"""
Standard API Response serializer.

With StandardResponseRenderer, all responses are automatically normalized
to the standard format. This file only contains the serializer for Swagger documentation.
"""
from rest_framework import serializers
from apps.core.api.swagger_serializers import BaseOutputSwaggerSerializer


class StandardResponseSerializer(BaseOutputSwaggerSerializer):
    """
    Standard API response structure serializer.
    
    All API responses follow this structure (automatically applied by StandardResponseRenderer):
    {
        "result": {
            // Actual data here
        },
        "status": <HTTP status code>,
        "success": <boolean>,
        "messages": {
            // Dictionary of message types mapped to lists of messages
        }
    }
    """
    pass
