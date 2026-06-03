from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoriaServicioViewSet, ServicioViewSet, VentaServicioViewSet, CompraServicioViewSet, ServicioContratadoViewSet

router = DefaultRouter()
router.register(r'categorias', CategoriaServicioViewSet)
router.register(r'ventas', VentaServicioViewSet, basename='venta-servicio')
router.register(r'compras', CompraServicioViewSet, basename='compra-servicio')
router.register(r'servicios-contratados', ServicioContratadoViewSet, basename='servicio-contratado')
router.register(r'', ServicioViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
