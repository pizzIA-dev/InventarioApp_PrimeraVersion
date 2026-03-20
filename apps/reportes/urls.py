from django.urls import path
from .views import BalanceGeneralView, DashboardView, ReporteMensualView

urlpatterns = [
    path('balance/', BalanceGeneralView.as_view(), name='balance-general'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('reporte-mensual/', ReporteMensualView.as_view(), name='reporte-mensual'),
]
