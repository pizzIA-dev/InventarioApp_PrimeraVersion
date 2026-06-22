"""
Custom DRF renderer that passes through raw HttpResponse bytes without serialization.
Used for @action views that return binary files (Excel, CSV, etc.)
"""
import json
from rest_framework.renderers import BaseRenderer


class PassthroughRenderer(BaseRenderer):
    """
    Returns data as-is. Used for file download endpoints that return HttpResponse
    directly (e.g. Excel exports). This prevents DRF from trying to serialize
    binary content as JSON.
    
    For non-binary data (dict/list errors from exception handlers), it falls back
    to JSON serialization so error responses are properly formatted.
    """
    media_type = '*/*'
    format = 'binary'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        # data is the HttpResponse body (bytes or str) - return as-is
        if isinstance(data, bytes):
            return data
        if isinstance(data, str):
            return data.encode('utf-8')
        if isinstance(data, (dict, list)):
            # Error responses from exception handlers - serialize as JSON
            return json.dumps(data, ensure_ascii=False).encode('utf-8')
        if data is None:
            return b''
        return str(data).encode('utf-8')
