from django.urls import path
from .views import (
    RegistroSaaSAPIView, BuscarTenantPorEmailAPIView,
    tenant_token_view, PlatformLoginAPIView,
)

urlpatterns = [
    path('registro/',       RegistroSaaSAPIView.as_view(),        name='saas-registro'),
    path('buscar-tenant/',  BuscarTenantPorEmailAPIView.as_view(), name='saas-buscar-tenant'),
    path('tenant-token/',   tenant_token_view,                     name='saas-tenant-token'),
    path('platform-login/', PlatformLoginAPIView.as_view(),        name='saas-platform-login'),
]