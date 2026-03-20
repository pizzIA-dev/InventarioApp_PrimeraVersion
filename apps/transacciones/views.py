from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from .models import CategoriaTransaccion, Transaccion
from .serializers import (
    CategoriaTransaccionSerializer,
    TransaccionSerializer, TransaccionCreateSerializer
)


class CategoriaTransaccionViewSet(viewsets.ModelViewSet):
    queryset = CategoriaTransaccion.objects.filter(activo=True)
    serializer_class = CategoriaTransaccionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()


class TransaccionViewSet(viewsets.ModelViewSet):
    queryset = Transaccion.objects.all().select_related('categoria')
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['tipo', 'categoria', 'metodo_pago']
    ordering_fields = ['-fecha']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TransaccionCreateSerializer
        return TransaccionSerializer
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Obtiene resumen de ingresos y egresos"""
        # Totales
        total_ingresos = sum(
            t.monto for t in self.queryset.filter(tipo='INGRESO')
        )
        total_egresos = sum(
            t.monto for t in self.queryset.filter(tipo='EGRESO')
        )
        balance = total_ingresos - total_egresos
        
        # Este mes
        hoy = timezone.now().date()
        inicio_mes = hoy.replace(day=1)
        
        ingresos_mes = sum(
            t.monto for t in self.queryset.filter(
                tipo='INGRESO', fecha__date__gte=inicio_mes
            )
        )
        egresos_mes = sum(
            t.monto for t in self.queryset.filter(
                tipo='EGRESO', fecha__date__gte=inicio_mes
            )
        )
        balance_mes = ingresos_mes - egresos_mes
        
        return Response({
            'total_ingresos': total_ingresos,
            'total_egresos': total_egresos,
            'balance': balance,
            'ingresos_mes': ingresos_mes,
            'egresos_mes': egresos_mes,
            'balance_mes': balance_mes
        })
    
    @action(detail=False, methods=['get'])
    def por_categoria(self, request):
        """Obtiene transacciones agrupadas por categoría"""
        categorias = CategoriaTransaccion.objects.filter(activo=True)
        data = []
        
        for cat in categorias:
            total = sum(
                t.monto for t in cat.transacciones.all()
            )
            data.append({
                'categoria': cat.nombre,
                'tipo': cat.tipo,
                'total': total,
                'cantidad': cat.transacciones.count()
            })
        
        return Response(data)
