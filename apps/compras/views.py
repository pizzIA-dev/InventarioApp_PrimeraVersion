from django.http import HttpResponse
from apps.core.export_utils import (
    get_period_range, get_period_label, create_excel_response
)
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
        elif self.action == 'partial_update' or self.action == 'update':
            return CompraUpdateSerializer
        return CompraSerializer
    
    def _parse_multipart_data(self, request):
        data = request.data.copy() if hasattr(request.data, 'copy') else request.data
        if hasattr(data, '_mutable'):
            data._mutable = True
        detalle = data.get('detalle')
        if isinstance(detalle, str):
            import json
            try:
                data['detalle'] = json.loads(detalle)
            except Exception:
                pass
        return data

    def create(self, request, *args, **kwargs):
        data = self._parse_multipart_data(request)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = self._parse_multipart_data(request)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        return Response(serializer.data)
    
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
                    precio_compra_anterior=detalle.producto.precio_compra,
                    precio_compra_nuevo=detalle.producto.precio_compra,
                    precio_venta_anterior=detalle.producto.precio_venta,
                    precio_venta_nuevo=detalle.producto.precio_venta,
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
                    precio_compra_anterior=detalle.producto.precio_compra,
                    precio_compra_nuevo=detalle.producto.precio_compra,
                    precio_venta_anterior=detalle.producto.precio_venta,
                    precio_venta_nuevo=detalle.producto.precio_venta,
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

    @action(detail=False, methods=['get'])
    def exportar(self, request):
        """Exportar compras a Excel con filtro de período"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.filter_queryset(self.get_queryset())

        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(creado_en__date__gte=date_from, creado_en__date__lte=date_to)

        headers = ['ID', 'Comprobante', 'Proveedor', 'Tipo', 'Estado', 'Fecha', 'Subtotal (S/.)', 'Impuesto (S/.)', 'Total (S/.)']
        rows = []
        for obj in queryset:
            rows.append([
                obj.id,
                f"{obj.tipo_comprobante or ''} {obj.numero_comprobante or ''}".strip(),
                obj.proveedor_nombre or (obj.proveedor.nombre if obj.proveedor else 'Sin Proveedor'),
                obj.get_tipo_compra_display(),
                obj.get_estado_display(),
                obj.creado_en.strftime("%Y-%m-%d %H:%M"),
                float(obj.subtotal),
                float(obj.impuesto),
                float(obj.total)
            ])

        period_label = get_period_label(periodo, anio)
        return create_excel_response(
            filename='compras.xlsx',
            sheet_name='Compras',
            headers=headers,
            rows=rows,
            title='Historial de Compras',
            period_label=period_label
        )


class DetalleCompraViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DetalleCompra.objects.all().select_related('producto', 'compra')
    serializer_class = DetalleCompraSerializer
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['compra', 'producto']
    ordering_fields = ['producto__nombre']
