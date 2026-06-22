"""
Middleware para identificar el tenant por el prefijo del path URL en vez de subdominio.

Rutas tenant-aware:  /t/{schema}/api/...
Rutas publicas:      /api/public/..., /admin/, /api/public/health/
"""
from django.db import connection
from django.http import HttpResponse
from django_tenants.utils import get_public_schema_name


class TenantFromPathMiddleware:
    """
    Identifica el tenant por el slug en la URL: /t/{schema}/...
    Las rutas sin prefijo /t/ usan el schema publico.

    Seguridad:
    - El slug solo activa el schema correcto en PostgreSQL
    - La autenticacion real se hace via JWT (un JWT de schema-A no funciona en schema-B)
    - Cross-tenant access es imposible porque los users estan en schemas aislados
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        self._set_tenant_from_path(request)
        response = self.get_response(request)
        # Resetear al schema publico al terminar el request
        try:
            connection.set_schema_to_public()
        except Exception:
            pass
        return response

    def _set_tenant_from_path(self, request):
        from apps.clientes_saas.models import Cliente

        path = request.path_info
        public_schema = get_public_schema_name()  # 'public'
        schema_name = public_schema

        if path.startswith('/t/'):
            # /t/mi-empresa/api/auth/login/ -> parts = ['', 't', 'mi-empresa', 'api', ...]
            parts = path.split('/')
            if len(parts) >= 3 and parts[2]:
                schema_name = parts[2]

        try:
            tenant = Cliente.objects.get(schema_name=schema_name)
            connection.set_tenant(tenant)
            request.tenant = tenant
        except Cliente.DoesNotExist:
            if schema_name != public_schema:
                # Tenant no encontrado -> dejar que Django devuelva 404
                request.tenant = None
        except Exception:
            pass