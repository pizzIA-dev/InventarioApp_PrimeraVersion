"""
Middleware para identificar el tenant por el prefijo del path URL en vez de subdominio.

Rutas tenant-aware:  /t/{schema}/api/...
Rutas publicas:      /api/public/..., /admin/, /api/public/health/
"""
from django.db import connection
from django.http import HttpResponse, JsonResponse
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
        bloqueo = self._respuesta_si_suscripcion_inactiva(request)
        response = bloqueo or self.get_response(request)
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

    def _respuesta_si_suscripcion_inactiva(self, request):
        """
        Bloqueo inmediato: si el negocio está suspendido o vencido, ninguna ruta
        /t/{schema}/api/ responde (aunque el usuario tenga un token vigente).
        El frontend reconoce el código SUSCRIPCION_INACTIVA y cierra la sesión.
        """
        tenant = getattr(request, 'tenant', None)
        if tenant is None or tenant.schema_name == get_public_schema_name():
            return None
        if '/api/' not in request.path_info:
            return None
        try:
            from apps.suscripciones import estado as estado_sus
            from apps.suscripciones.models import Suscripcion
            sus = Suscripcion.objects.filter(cliente_id=tenant.pk).first()
            if estado_sus.tiene_acceso(sus):
                return None
            return JsonResponse(
                {
                    'code': 'SUSCRIPCION_INACTIVA',
                    'estado': estado_sus.estado_de(sus),
                    'detail': estado_sus.mensaje_sin_acceso(sus),
                },
                status=402,
            )
        except Exception:
            # Ante un error inesperado no bloquear (mismo criterio que el login)
            return None
