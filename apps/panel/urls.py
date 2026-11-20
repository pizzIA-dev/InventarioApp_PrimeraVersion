"""Rutas del Panel de Control: /api/panel/... (registradas SOLO en config/urls.py)."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EmpresaViewSet, GastoViewSet, MetricasView, MovimientoViewSet, PagoViewSet,
    PanelLoginView, PanelMeView, PanelRefreshView, PlanesView,
)

router = DefaultRouter()
router.include_root_view = False
router.register('empresas', EmpresaViewSet, basename='panel-empresas')
router.register('pagos', PagoViewSet, basename='panel-pagos')
router.register('gastos', GastoViewSet, basename='panel-gastos')
router.register('movimientos', MovimientoViewSet, basename='panel-movimientos')

urlpatterns = [
    path('auth/login/', PanelLoginView.as_view(), name='panel-login'),
    path('auth/refresh/', PanelRefreshView.as_view(), name='panel-refresh'),
    path('auth/me/', PanelMeView.as_view(), name='panel-me'),
    path('metricas/', MetricasView.as_view(), name='panel-metricas'),
    path('planes/', PlanesView.as_view(), name='panel-planes'),
    path('', include(router.urls)),
]
