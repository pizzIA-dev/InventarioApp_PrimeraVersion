from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoriaViewSet, ProductoViewSet, MovimientoStockViewSet

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet)
router.register(r'', ProductoViewSet)
router.register(r'movimientos', MovimientoStockViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
