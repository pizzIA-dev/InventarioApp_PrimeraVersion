from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TipoCapitalViewSet, CapitalViewSet

router = DefaultRouter()
router.register(r'tipos', TipoCapitalViewSet)
router.register(r'', CapitalViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
