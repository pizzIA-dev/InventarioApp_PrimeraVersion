"""
Emergency 500 error middleware that catches unhandled exceptions and returns JSON.
This helps diagnose production errors when DEBUG=False.
"""
import traceback
import json
import logging
from django.http import JsonResponse

logger = logging.getLogger('django')


class Emergency500Middleware:
    """
    Wraps the entire request in a try/except to catch ANY exception
    and return a JSON response with the error details.
    Used ONLY for debugging production 500 errors.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
            return response
        except Exception as exc:
            tb = traceback.format_exc()
            logger.error(f"Emergency500Middleware caught exception: {exc}\n{tb}")
            return JsonResponse(
                {
                    'error': f'{type(exc).__name__}: {str(exc)}',
                    'traceback_last_3_lines': tb.strip().splitlines()[-3:],
                },
                status=500
            )