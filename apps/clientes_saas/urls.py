from django.urls import path
from .views import RegistroSaaSAPIView, BuscarTenantPorEmailAPIView

urlpatterns = [
    path('registro/', RegistroSaaSAPIView.as_view(), name='saas-registro'),
    path('buscar-tenant/', BuscarTenantPorEmailAPIView.as_view(), name='saas-buscar-tenant'),
]
