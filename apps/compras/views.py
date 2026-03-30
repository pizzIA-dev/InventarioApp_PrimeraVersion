from django.http import HttpResponse
from django.utils import timezone
from apps.core.export_utils import (
    get_period_range, get_period_label, create_excel_response,
    create_multi_sheet_excel_response
)
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count
from apps.inventario.models import MovimientoStock
from .models import Compra, DetalleCompra, MovimientoEstadoCompra
from .serializers import (
    CompraSerializer, CompraCreateSerializer, CompraUpdateSerializer,
    DetalleCompraSerializer, MovimientoEstadoCompraSerializer,
    KardexProductoCompraSerializer
)


class CompraViewSet(viewsets.ModelViewSet):
    queryset = Compra.objects.all().select_related('proveedor')
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['estado', 'tipo_compra', 'proveedor']
    ordering_fields = ['-creado_en']
    pagination_class = None
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CompraCreateSerializer
        elif self.action == 'partial_update' or self.action == 'update':
            return CompraUpdateSerializer
        return CompraSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
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

        # Configuración de cabeceras
        headers = ['ID', 'Fecha', 'Comprobante', 'Proveedor', 'Tipo', 'Estado', 'Subtotal (S/.)', 'Impuesto (S/.)', 'Descuento (S/.)', 'Total (S/.)']
        rows = []
        
        for obj in queryset:
            # Calcular descuento total de la compra (suma de descuentos de sus detalles)
            total_descuento = obj.detallecompra_set.aggregate(Sum('descuento'))['descuento__sum'] or 0
            # Subtotal Bruto recalculado para coherencia del reporte (Subtotal Neto + Descuento)
            subtotal_bruto = float(obj.subtotal) + float(total_descuento)
            
            rows.append([
                obj.id,
                timezone.localtime(obj.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                f"{obj.tipo_comprobante or ''} {obj.numero_comprobante or ''}".strip(),
                obj.proveedor_nombre or (obj.proveedor.nombre if obj.proveedor else 'Sin Proveedor'),
                obj.get_tipo_compra_display(),
                obj.get_estado_display(),
                subtotal_bruto,
                float(obj.impuesto),
                float(total_descuento),
                float(obj.total)
            ])

        period_label = get_period_label(periodo, anio)
        
        return create_excel_response(
            filename=f'compras_{periodo}{"_" + str(anio) if anio else ""}.xlsx',
            headers=headers,
            rows=rows,
            title='Historial de Compras',
            period_label=period_label,
            sheet_name='Compras'
        )

    @action(detail=True, methods=['get'])
    def historial_estados(self, request, pk=None):
        """Obtiene el historial de estados de una compra con filtros y paginación"""
        compra = self.get_object()
        qs = compra.movimientos_estado.all().order_by('-fecha')

        # Filtros de fecha
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_desde:
            qs = qs.filter(fecha__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha__date__lte=fecha_hasta)

        # Paginación
        page_size = int(request.query_params.get('page_size', 15))
        page_num = int(request.query_params.get('page', 1))
        
        total = qs.count()
        start = (page_num - 1) * page_size
        end = start + page_size
        movimientos = qs[start:end]

        serializer = MovimientoEstadoCompraSerializer(movimientos, many=True)
        return Response({
            'count': total,
            'page': page_num,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if page_size > 0 else 1,
            'results': serializer.data
        })

    @action(detail=True, methods=['get'])
    def kardex_productos(self, request, pk=None):
        """Obtiene el detalle de productos de una compra con filtros y paginación"""
        compra = self.get_object()
        qs = compra.detallecompra_set.all().select_related('producto', 'compra').order_by('id')

        # Filtros de fecha (aunque usualmente es la misma de la compra)
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_desde:
            qs = qs.filter(compra__creado_en__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(compra__creado_en__date__lte=fecha_hasta)

        # Paginación
        page_size = int(request.query_params.get('page_size', 15))
        page_num = int(request.query_params.get('page', 1))
        
        total = qs.count()
        start = (page_num - 1) * page_size
        end = start + page_size
        detalles = qs[start:end]

        serializer = KardexProductoCompraSerializer(detalles, many=True)
        return Response({
            'count': total,
            'page': page_num,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if page_size > 0 else 1,
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def kardex_global_productos(self, request):
        """Obtiene el detalle de TODOS los productos comprados (Kardex Global) con filtros y paginación"""
        detalles = DetalleCompra.objects.filter(compra__estado='CONFIRMADA').select_related('producto', 'compra', 'compra__proveedor').order_by('-compra__creado_en')
        
        # Filtros
        proveedor = request.query_params.get('proveedor')
        if proveedor:
            detalles = detalles.filter(compra__proveedor_id=proveedor)
            
        producto = request.query_params.get('producto')
        if producto:
            detalles = detalles.filter(producto_id=producto)

        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_desde:
            detalles = detalles.filter(compra__creado_en__date__gte=fecha_desde)
        if fecha_hasta:
            detalles = detalles.filter(compra__creado_en__date__lte=fecha_hasta)

        # Paginación
        page_size = int(request.query_params.get('page_size', 15))
        page_num = int(request.query_params.get('page', 1))
        
        total = detalles.count()
        start = (page_num - 1) * page_size
        end = start + page_size
        results = detalles[start:end]

        serializer = KardexProductoCompraSerializer(results, many=True)
        return Response({
            'count': total,
            'page': page_num,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if page_size > 0 else 1,
            'results': serializer.data
        })

    @action(detail=True, methods=['get'])
    def exportar_historial(self, request, pk=None):
        """Exporta el historial de una compra en formato Excel multi-hoja"""
        compra = self.get_object()

        # Sheet 1: Estados
        estados = compra.movimientos_estado.all().order_by('-fecha')
        headers_estados = ['Fecha', 'Estado Anterior', 'Estado Nuevo', 'Notas']
        rows_estados = [
            [
                timezone.localtime(e.fecha).strftime("%d/%m/%Y %H:%M:%S"),
                e.estado_anterior,
                e.estado_nuevo,
                e.notas
            ] for e in estados
        ]

        # Sheet 2: Productos
        detalles = compra.detallecompra_set.all().select_related('producto').order_by('id')
        headers_productos = ['Fecha', 'Tipo de comprobante', 'Comprobante', 'Proveedor', 'Producto', 'Código de Producto', 'Cantidad', 'Precio de compra (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)']
        
        comp_fecha = timezone.localtime(compra.creado_en).strftime("%d/%m/%Y %H:%M:%S")
        comp_tipo = compra.tipo_comprobante or ''
        comp_num = compra.numero_comprobante or ''
        comp_prov = compra.proveedor_nombre or (compra.proveedor.nombre if compra.proveedor else 'Sin Proveedor')
        comp_impuesto = float(compra.impuesto or 0)

        rows_productos = [
            [
                comp_fecha,
                comp_tipo,
                comp_num,
                comp_prov,
                d.producto.nombre,
                d.producto.codigo,
                float(d.cantidad),
                float(d.precio_compra),
                float(d.descuento),
                comp_impuesto,
                (float(d.cantidad) * float(d.precio_compra)) - float(d.descuento) + comp_impuesto
            ] for d in detalles
        ]

        sheets_data = [
            {
                'sheet_name': 'Estados de Compra',
                'headers': headers_estados,
                'rows': rows_estados,
                'title': f'Historial de Estados - Compra {comp_num or compra.id}',
                'period_label': 'Historial Completo'
            },
            {
                'sheet_name': 'Detalle de Productos',
                'headers': headers_productos,
                'rows': rows_productos,
                'title': f'Detalle de Productos - Compra {comp_num or compra.id}',
                'period_label': 'Historial Completo'
            }
        ]

        return create_multi_sheet_excel_response(
            filename=f'historial_compra_{comp_num or compra.id}.xlsx',
            sheets_data=sheets_data
        )

    @action(detail=False, methods=['get'])
    def exportar_historial_global(self, request):
        """Exporta el historial global de compras en formato Excel multi-hoja con filtro de periodo"""
        proveedor = request.query_params.get('proveedor')
        producto = request.query_params.get('producto')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        estados_qs = MovimientoEstadoCompra.objects.filter(compra__estado='CONFIRMADA').select_related('compra', 'compra__proveedor').order_by('-fecha')
        detalles_qs = DetalleCompra.objects.filter(compra__estado='CONFIRMADA').select_related('producto', 'compra', 'compra__proveedor').order_by('-compra__creado_en')
        
        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            estados_qs = estados_qs.filter(fecha__date__gte=date_from, fecha__date__lte=date_to)
            detalles_qs = detalles_qs.filter(compra__creado_en__date__gte=date_from, compra__creado_en__date__lte=date_to)

        if proveedor:
            estados_qs = estados_qs.filter(compra__proveedor_id=proveedor)
            detalles_qs = detalles_qs.filter(compra__proveedor_id=proveedor)
        if producto:
            detalles_qs = detalles_qs.filter(producto_id=producto)
            estados_qs = estados_qs.filter(compra__detallecompra__producto_id=producto).distinct()
            
        if fecha_desde:
            estados_qs = estados_qs.filter(fecha__date__gte=fecha_desde)
            detalles_qs = detalles_qs.filter(compra__creado_en__date__gte=fecha_desde)
        if fecha_hasta:
            estados_qs = estados_qs.filter(fecha__date__lte=fecha_hasta)
            detalles_qs = detalles_qs.filter(compra__creado_en__date__lte=fecha_hasta)

        headers_estados = ['Fecha', 'Comprobante', 'Proveedor', 'Estado Anterior', 'Estado Nuevo', 'Notas']
        rows_estados = []
        for e in estados_qs:
            c = e.compra
            comp_prov = c.proveedor_nombre or (c.proveedor.nombre if c.proveedor else 'Sin Proveedor')
            comp_num = f"{c.tipo_comprobante or ''} {c.numero_comprobante or ''}".strip()
            rows_estados.append([
                timezone.localtime(e.fecha).strftime("%d/%m/%Y %H:%M:%S"),
                comp_num or f"#{c.id}",
                comp_prov,
                e.estado_anterior,
                e.estado_nuevo,
                e.notas
            ])

        headers_productos = ['Fecha', 'Tipo de comprobante', 'Comprobante', 'Proveedor', 'Producto', 'Código de Producto', 'Cantidad', 'Precio de compra (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)']
        rows_productos = []
        for d in detalles_qs:
            c = d.compra
            comp_prov = c.proveedor_nombre or (c.proveedor.nombre if c.proveedor else 'Sin Proveedor')
            comp_num = f"{c.numero_comprobante or ''}".strip()
            comp_impuesto = float(c.impuesto or 0)
            rows_productos.append([
                timezone.localtime(c.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                c.tipo_comprobante or '',
                comp_num or f"#{c.id}",
                comp_prov,
                d.producto.nombre,
                d.producto.codigo,
                float(d.cantidad),
                float(d.precio_compra),
                float(d.descuento),
                comp_impuesto,
                (float(d.cantidad) * float(d.precio_compra)) - float(d.descuento) + comp_impuesto
            ])

        period_label = get_period_label(periodo, anio)
        if fecha_desde or fecha_hasta:
            period_label = f"{fecha_desde or 'Inicio'} al {fecha_hasta or 'Hoy'}"

        sheets_data = [
            {
                'sheet_name': 'Estados de Compra',
                'headers': headers_estados,
                'rows': rows_estados,
                'title': 'Historial Global de Estados de Compra',
                'period_label': period_label
            },
            {
                'sheet_name': 'Detalle de Productos',
                'headers': headers_productos,
                'rows': rows_productos,
                'title': 'Detalle Global de Productos Comprados',
                'period_label': period_label
            }
        ]

        return create_multi_sheet_excel_response(
            filename=f'historial_global_compras_{periodo}{"_" + str(anio) if anio else ""}.xlsx',
            sheets_data=sheets_data
        )

class DetalleCompraViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DetalleCompra.objects.all().select_related('producto', 'compra')
    serializer_class = DetalleCompraSerializer
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['compra', 'producto']
    ordering_fields = ['producto__nombre']
