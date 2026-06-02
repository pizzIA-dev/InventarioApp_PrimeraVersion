"""
Custom DRF renderer that passes through raw HttpResponse bytes without serialization.
Used for @action views that return binary files (Excel, CSV, etc.)
"""
from rest_framework.renderers import BaseRenderer


class PassthroughRenderer(BaseRenderer):
    """
    Returns data as-is. Used for file download endpoints that return HttpResponse
    directly (e.g. Excel exports). This prevents DRF from trying to serialize
    binary content as JSON.
    """
    media_type = '*/*'
    format = 'binary'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        # data is the HttpResponse body (bytes or str) - return as-is
        if isinstance(data, bytes):
            return data
        if isinstance(data, str):
            return data.encode('utf-8')
        return data