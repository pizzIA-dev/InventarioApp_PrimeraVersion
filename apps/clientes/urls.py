from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClienteViewSet, SegmentoClienteViewSet

router = DefaultRouter()
router.register(r'', ClienteViewSet)
router.register(r'segmentos', SegmentoClienteViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
