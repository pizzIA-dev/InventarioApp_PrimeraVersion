from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoriaViewSet, ProductoViewSet, MovimientoStockViewSet,
    AlmacenViewSet, StockAlmacenViewSet, TrasladoStockViewSet
)

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'movimientos', MovimientoStockViewSet, basename='movimientostock')
router.register(r'almacenes', AlmacenViewSet, basename='almacen')
router.register(r'stock-almacen', StockAlmacenViewSet, basename='stockalmacen')
router.register(r'traslados', TrasladoStockViewSet, basename='traslado')
router.register(r'', ProductoViewSet, basename='producto')

urlpatterns = [
    path('', include(router.urls)),
]
