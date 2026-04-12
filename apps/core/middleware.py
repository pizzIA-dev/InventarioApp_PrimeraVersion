import threading

_thread_locals = threading.local()

def get_current_user():
    request = getattr(_thread_locals, 'request', None)
    if request:
        return getattr(request, 'user', None)
    return getattr(_thread_locals, 'user', None)

class ThreadLocalMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.request = request
        _thread_locals.user = getattr(request, 'user', None)
        try:
            response = self.get_response(request)
        finally:
            if hasattr(_thread_locals, 'request'):
                del _thread_locals.request
            if hasattr(_thread_locals, 'user'):
                del _thread_locals.user
        return response
