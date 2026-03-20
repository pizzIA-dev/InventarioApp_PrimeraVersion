from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from datetime import timedelta
from apps.inventario.models import MovimientoStock
from .models import Venta, DetalleVenta
from .serializers import (
    VentaSerializer, VentaCreateSerializer, VentaUpdateSerializer,
    DetalleVentaSerializer
)


class VentaViewSet(viewsets.ModelViewSet):
    queryset = Venta.objects.all().select_related('cliente')
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['estado', 'cliente']
    ordering_fields = ['-creado_en']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return VentaCreateSerializer
        elif self.action == 'partial_update':
            return VentaUpdateSerializer
        return VentaSerializer
    
    @action(detail=True, methods=['post'])
    def confirmar(self, request, pk=None):
        """Confirma una venta y registra la salida de stock"""
        venta = self.get_object()
        venta.estado = 'CONFIRMADA'
        venta.save()
        venta.registrar_salida_stock()
        
        serializer = self.get_serializer(venta)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela una venta y revierte el stock si estaba confirmada"""
        venta = self.get_object()
        if venta.estado == 'CONFIRMADA':
            for detalle in venta.detalleventa_set.all():
                # Revertir stock (Entrada por devolución)
                MovimientoStock.objects.create(
                    producto=detalle.producto,
                    tipo='ENTRADA',
                    origen='DEVOLUCION',
                    cantidad=detalle.cantidad,
                    stock_anterior=detalle.producto.stock_actual,
                    precio_unitario=detalle.precio_venta,
                    referencia=f"Cancelación Venta {venta.numero_comprobante or venta.id}"
                )
        venta.estado = 'CANCELADA'
        venta.save()
        
        serializer = self.get_serializer(venta)
        return Response(serializer.data)
        
    def perform_destroy(self, instance):
        """Si la venta estaba confirmada, reveritimos el stock antes de eliminar"""
        if instance.estado == 'CONFIRMADA':
            for detalle in instance.detalleventa_set.all():
                # Revertir stock (Entrada por devolución/eliminación)
                MovimientoStock.objects.create(
                    producto=detalle.producto,
                    tipo='ENTRADA',
                    origen='DEVOLUCION',
                    cantidad=detalle.cantidad,
                    stock_anterior=detalle.producto.stock_actual,
                    precio_unitario=detalle.precio_venta,
                    referencia=f"Eliminación Venta {instance.numero_comprobante or instance.id}"
                )
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Obtiene resumen de ventas"""
        ventas_confirmadas = self.queryset.filter(estado='CONFIRMADA')
        
        total_ventas = ventas_confirmadas.count()
        monto_total = sum(v.total for v in ventas_confirmadas)
        
        # Ventas por cliente
        ventas_por_cliente = ventas_confirmadas.filter(
            cliente__isnull=False
        ).values('cliente__nombre').annotate(
            total=Sum('total'),
            cantidad=Count('id')
        ).order_by('-total')[:5]
        
        # Ventas de hoy
        hoy = timezone.now().date()
        ventas_hoy = ventas_confirmadas.filter(creado_en__date=hoy)
        monto_hoy = sum(v.total for v in ventas_hoy)
        
        # Ventas de los últimos 7 días
        hace_7_dias = hoy - timedelta(days=7)
        ventas_7_dias = ventas_confirmadas.filter(creado_en__date__gte=hace_7_dias)
        monto_7_dias = sum(v.total for v in ventas_7_dias)
        
        return Response({
            'total_ventas': total_ventas,
            'monto_total': monto_total,
            'ventas_por_cliente': list(ventas_por_cliente),
            'ventas_hoy': ventas_hoy.count(),
            'monto_hoy': monto_hoy,
            'ventas_7_dias': ventas_7_dias.count(),
            'monto_7_dias': monto_7_dias
        })
    
    @action(detail=False, methods=['get'])
    def productos_mas_vendidos(self, request):
        """Obtiene los productos más vendidos"""
        productos_stats = DetalleVenta.objects.filter(
            venta__estado='CONFIRMADA'
        ).values(
            'producto__id',
            'producto__nombre',
            'producto__codigo'
        ).annotate(
            total_cantidad=Sum('cantidad'),
            total_ingresos=Sum('subtotal')
        ).order_by('-total_cantidad')[:10]
        
        return Response(list(productos_stats))


class DetalleVentaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DetalleVenta.objects.all().select_related('producto', 'venta')
    serializer_class = DetalleVentaSerializer
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['venta', 'producto']
    ordering_fields = ['producto__nombre']
