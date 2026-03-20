from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProveedorViewSet, HistoricoPrecioViewSet

router = DefaultRouter()
router.register(r'', ProveedorViewSet)
router.register(r'historico-precios', HistoricoPrecioViewSet, basename='historico-precios')

urlpatterns = [
    path('', include(router.urls)),
]
