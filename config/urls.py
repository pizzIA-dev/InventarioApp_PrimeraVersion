"""
URL configuration for Inventario y Balance project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from rest_framework_simplejwt.views import TokenRefreshView
from apps.core.auth_views import CustomTokenObtainPairView
from apps.core.user_views import listar_usuarios, crear_usuario, toggle_usuario, cambiar_password
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
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
    # Gestion de usuarios (solo Gerente)
    path('api/auth/usuarios/', listar_usuarios, name='listar_usuarios'),
    path('api/auth/usuarios/crear/', crear_usuario, name='crear_usuario'),
    path('api/auth/usuarios/<int:user_id>/toggle/', toggle_usuario, name='toggle_usuario'),
    path('api/auth/usuarios/<int:user_id>/password/', cambiar_password, name='cambiar_password'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
