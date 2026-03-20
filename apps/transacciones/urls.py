from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoriaTransaccionViewSet, TransaccionViewSet

router = DefaultRouter()
router.register(r'categorias', CategoriaTransaccionViewSet)
router.register(r'', TransaccionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
