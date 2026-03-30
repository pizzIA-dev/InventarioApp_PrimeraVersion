from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClienteFiadoViewSet, FiadoViewSet

router = DefaultRouter()
router.register(r'clientes-fiados', ClienteFiadoViewSet, basename='cliente_fiado')
router.register(r'fiados', FiadoViewSet, basename='fiado')

urlpatterns = [
    path('', include(router.urls)),
]
