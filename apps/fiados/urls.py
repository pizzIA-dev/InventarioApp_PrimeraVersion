from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FiadoViewSet

router = DefaultRouter()
router.register(r'fiados', FiadoViewSet, basename='fiado')

urlpatterns = [
    path('', include(router.urls)),
]
