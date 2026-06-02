"""
Custom DRF exception handler that logs detailed errors in production.
"""
import traceback
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger('django')


def custom_exception_handler(exc, context):
    """
    Custom exception handler that:
    1. Uses DRF's standard handler first
    2. For unhandled exceptions (500s), returns a JSON response with the error detail
       so the frontend can display meaningful messages instead of empty 500 responses.
    """
    # Call DRF's default exception handler first
    response = exception_handler(exc, context)
    
    if response is None:
        # Unhandled exception - would normally be a Django 500 HTML response
        # Log the error
        request = context.get('request')
        view = context.get('view')
        logger.error(
            f"Unhandled exception in {view.__class__.__name__}: {exc}",
            exc_info=True
        )
        # Return JSON 500 instead of HTML
        return Response(
            {
                'error': f'Error interno del servidor: {type(exc).__name__}',
                'detail': str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return response