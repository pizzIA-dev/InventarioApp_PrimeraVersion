from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProveedorViewSet, HistoricoPrecioViewSet, MovimientoProveedorViewSet

router = DefaultRouter()
router.register(r'movimientos', MovimientoProveedorViewSet, basename='proveedor-movimientos')
router.register(r'historico-precios', HistoricoPrecioViewSet, basename='historico-precios')
router.register(r'', ProveedorViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
