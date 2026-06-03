"""
URLs para el espacio privado de cada tenant.
Se accede via: /t/{schema}/api/<path>
El middleware TenantFromPathMiddleware activa el schema correcto antes de resolver estas URLs.
"""
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter

from apps.core.auth_views import (
    CustomTokenObtainPairView, logout_view,
    forgot_password, reset_password_confirm,
)
from apps.core.user_views import (
    listar_usuarios, crear_usuario, toggle_usuario,
    cambiar_password, RolPersonalizadoViewSet,
    my_profile, actualizar_empresa, ensure_defaults_view,
    seed_compras_servicios_view,
)
from apps.core.backup_views import manage_backup_config, list_backups, restore_backup

router = DefaultRouter()
router.register(r'roles', RolPersonalizadoViewSet, basename='roles_custom')

urlpatterns = [
    # Auth
    path('auth/login/',                                  CustomTokenObtainPairView.as_view(), name='t_login'),
    path('auth/refresh/',                                TokenRefreshView.as_view(),           name='t_refresh'),
    path('auth/logout/',                                 logout_view,                          name='t_logout'),
    path('auth/forgot-password/',                        forgot_password,                      name='t_forgot'),
    path('auth/reset-password/<str:uid>/<str:token>/',   reset_password_confirm,               name='t_reset'),
    path('auth/me/',                                     my_profile,                           name='t_me'),

    # Usuarios y roles
    path('auth/usuarios/',                               listar_usuarios,    name='t_list_users'),
    path('auth/usuarios/crear/',                         crear_usuario,      name='t_create_user'),
    path('auth/usuarios/<int:user_id>/toggle/',          toggle_usuario,     name='t_toggle_user'),
    path('auth/usuarios/<int:user_id>/password/',        cambiar_password,   name='t_change_pass'),
    path('core/',                                        include(router.urls)),
    path('core/empresa/update/',                         actualizar_empresa, name='t_empresa'),
    path('core/ensure-defaults/',                          ensure_defaults_view, name='t_ensure_defaults'),
    path('core/seed-compras-servicios/',                   seed_compras_servicios_view, name='t_seed_cs'),

    # Backups
    path('core/backup-config/',   manage_backup_config, name='t_backup_config'),
    path('core/backups/',         list_backups,         name='t_backups'),
    path('core/backups/restore/', restore_backup,       name='t_restore'),

    # Apps del negocio
    path('productos/',     include('apps.inventario.urls')),
    path('ventas/',        include('apps.ventas.urls')),
    path('compras/',       include('apps.compras.urls')),
    path('proveedores/',   include('apps.proveedores.urls')),
    path('clientes/',      include('apps.clientes.urls')),
    path('capital/',       include('apps.capital.urls')),
    path('servicios/',     include('apps.servicios.urls')),
    path('transacciones/', include('apps.transacciones.urls')),
    path('reportes/',      include('apps.reportes.urls')),
    path('fiados/',        include('apps.fiados.urls')),
]