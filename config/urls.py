"""
URL configuration for Inventario y Balance project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
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
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
