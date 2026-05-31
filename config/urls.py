
# Health check para Render / Railway
from django.http import JsonResponse
from django.views.decorators.http import require_GET

@require_GET
def health_check(request):
    return JsonResponse({'status': 'ok', 'service': 'NegocIA API'})
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter

from apps.core.auth_views import CustomTokenObtainPairView, logout_view, forgot_password, reset_password_confirm
from apps.core.user_views import (
    listar_usuarios, crear_usuario, toggle_usuario,
    cambiar_password, RolPersonalizadoViewSet, my_profile, actualizar_empresa
)
from apps.core.backup_views import manage_backup_config, list_backups, restore_backup
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r'roles', RolPersonalizadoViewSet, basename='roles_custom')

urlpatterns = [
    path('api/public/health/', health_check, name='health_check'),
    path('admin/', admin.site.urls),
    path('api/core/', include(router.urls)),
    path('api/auth/me/', my_profile, name='my_profile'),
    # Tenant-aware routes: /t/{schema}/api/
    path('t/<str:schema>/api/', include('config.tenant_urls')),
    path('api/public/', include('apps.clientes_saas.urls')),
    path('api/public/', include('apps.suscripciones.urls')),
    path('api/auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', logout_view, name='logout'),
    path('api/auth/forgot-password/', forgot_password, name='forgot_password'),
    path('api/auth/reset-password/<str:uid>/<str:token>/', reset_password_confirm, name='reset_password_confirm'),
    path('api/productos/', include('apps.inventario.urls')),
    path('api/ventas/', include('apps.ventas.urls')),
    path('api/compras/', include('apps.compras.urls')),
    path('api/proveedores/', include('apps.proveedores.urls')),
    path('api/clientes/', include('apps.clientes.urls')),
    path('api/capital/', include('apps.capital.urls')),
    path('api/servicios/', include('apps.servicios.urls')),
    path('api/transacciones/', include('apps.transacciones.urls')),
    path('api/reportes/', include('apps.reportes.urls')),
    path('api/fiados/', include('apps.fiados.urls')),
    
    # Gestión de usuarios (solo Gerente)
    path('api/auth/usuarios/', listar_usuarios, name='listar_usuarios'),
    path('api/auth/usuarios/crear/', crear_usuario, name='crear_usuario'),
    path('api/auth/usuarios/<int:user_id>/toggle/', toggle_usuario, name='toggle_usuario'),
    path('api/auth/usuarios/<int:user_id>/password/', cambiar_password, name='cambiar_password'),
    path('api/core/empresa/update/', actualizar_empresa, name='actualizar_empresa'),
    
    # Backups
    path('api/core/backup-config/', manage_backup_config, name='backup_config'),
    path('api/core/backups/', list_backups, name='list_backups'),
    path('api/core/backups/restore/', restore_backup, name='restore_backup'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
