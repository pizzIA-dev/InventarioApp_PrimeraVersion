from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count
from apps.inventario.models import MovimientoStock
from .models import Compra, DetalleCompra
from .serializers import (
    CompraSerializer, CompraCreateSerializer, CompraUpdateSerializer,
    DetalleCompraSerializer
)


class CompraViewSet(viewsets.ModelViewSet):
    queryset = Compra.objects.all().select_related('proveedor')
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['estado', 'tipo_compra', 'proveedor']
    ordering_fields = ['-creado_en']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CompraCreateSerializer
        elif self.action == 'partial_update':
            return CompraUpdateSerializer
        return CompraSerializer
    
    @action(detail=True, methods=['post'])
    def confirmar(self, request, pk=None):
        """Confirma una compra y registra el stock"""
        compra = self.get_object()
        compra.estado = 'CONFIRMADA'
        compra.save()
        compra.registrar_stock()
        
        serializer = self.get_serializer(compra)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela una compra y revierte el stock si estaba confirmada"""
        compra = self.get_object()
        if compra.estado == 'CONFIRMADA':
            for detalle in compra.detallecompra_set.all():
                # Revertir stock (Salida por devolución)
                MovimientoStock.objects.create(
                    producto=detalle.producto,
                    tipo='SALIDA',
                    origen='DEVOLUCION',
                    cantidad=detalle.cantidad,
                    stock_anterior=detalle.producto.stock_actual,
                    precio_unitario=detalle.precio_compra,
                    referencia=f"Cancelación Compra {compra.numero_comprobante or compra.id}"
                )
        compra.estado = 'CANCELADA'
        compra.save()
        
        serializer = self.get_serializer(compra)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        """Si la compra estaba confirmada, revertimos el stock antes de eliminar"""
        if instance.estado == 'CONFIRMADA':
            for detalle in instance.detallecompra_set.all():
                # Revertir stock (Salida por devolución/eliminación)
                MovimientoStock.objects.create(
                    producto=detalle.producto,
                    tipo='SALIDA',
                    origen='DEVOLUCION',
                    cantidad=detalle.cantidad,
                    stock_anterior=detalle.producto.stock_actual,
                    precio_unitario=detalle.precio_compra,
                    referencia=f"Eliminación Compra {instance.numero_comprobante or instance.id}"
                )
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Obtiene resumen de compras"""
        total_compras = self.queryset.filter(estado='CONFIRMADA').count()
        monto_total = sum(
            c.total for c in self.queryset.filter(estado='CONFIRMADA')
        )
        
        # Compras por proveedor
        compras_por_proveedor = self.queryset.filter(
            estado='CONFIRMADA', proveedor__isnull=False
        ).values('proveedor__nombre').annotate(
            total=Sum('total'),
            cantidad=Count('id')
        ).order_by('-total')[:5]
        
        return Response({
            'total_compras': total_compras,
            'monto_total': monto_total,
            'compras_por_proveedor': list(compras_por_proveedor)
        })


class DetalleCompraViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DetalleCompra.objects.all().select_related('producto', 'compra')
    serializer_class = DetalleCompraSerializer
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['compra', 'producto']
    ordering_fields = ['producto__nombre']
