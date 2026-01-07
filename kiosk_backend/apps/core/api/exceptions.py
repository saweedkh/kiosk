from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """
    Custom exception handler that returns error data for the renderer to format.
    
    The renderer will wrap this data in the standard structure:
    {
        "result": [],
        "status": <status_code>,
        "success": false,
        "messages": {...}
    }
    """
    response = exception_handler(exc, context)
    
    if response is not None:
        # Just return the error data as-is
        # The CustomJSONRenderer will handle the formatting
        pass
    
    return response

