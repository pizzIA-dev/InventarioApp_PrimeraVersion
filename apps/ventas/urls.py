from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VentaViewSet, DetalleVentaViewSet

router = DefaultRouter()
router.register(r'', VentaViewSet)
router.register(r'detalle', DetalleVentaViewSet, basename='detalle-venta')

urlpatterns = [
    path('', include(router.urls)),
]
