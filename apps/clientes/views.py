from django.http import HttpResponse
from apps.core.export_utils import (
    get_period_range, get_period_label, create_excel_response
)
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Sum
from django.utils import timezone
from .models import Cliente, SegmentoCliente, MovimientoEstadoCliente
from .serializers import (
    ClienteSerializer, ClienteCreateSerializer, SegmentoClienteSerializer,
    MovimientoEstadoClienteSerializer
)
from apps.ventas.models import DetalleVenta
from apps.ventas.serializers import VentaKardexSerializer
from apps.core.export_utils import (
    get_period_range, get_period_label, create_excel_response,
    create_multi_sheet_excel_response
)


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['nombre', 'numero_documento', 'email', 'telefono']
    filterset_fields = ['tipo_cliente', 'tipo_documento', 'activo']
    ordering_fields = ['nombre', 'creado_en']
    pagination_class = None
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ClienteCreateSerializer
        return ClienteSerializer
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()
    
    @action(detail=True, methods=['get'])
    def historial_estados(self, request, pk=None):
        """Obtiene el historial de estados del cliente paginado"""
        cliente = self.get_object()
        qs = cliente.movimientos_estado.all().order_by('-fecha')
        
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_desde:
            qs = qs.filter(fecha__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha__date__lte=fecha_hasta)
            
        page = request.query_params.get('page', 1)
        try:
            page = int(page)
        except ValueError:
            page = 1
            
        page_size = request.query_params.get('page_size', 15)
        try:
            page_size = int(page_size)
        except ValueError:
            page_size = 15
            
        total = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        movimientos = qs[start:end]

        serializer = MovimientoEstadoClienteSerializer(movimientos, many=True)
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if page_size > 0 else 1,
            'results': serializer.data
        })

    @action(detail=True, methods=['get'])
    def kardex_productos(self, request, pk=None):
        """Obtiene el detalle de productos comprados (Kardex)"""
        cliente = self.get_object()
        detalles = DetalleVenta.objects.filter(
            venta__cliente=cliente
        ).select_related('producto', 'venta', 'venta__cliente').order_by('-venta__creado_en')
        
        # Filtrado por fecha si se requiere
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_desde:
            detalles = detalles.filter(venta__creado_en__date__gte=fecha_desde)
        if fecha_hasta:
            detalles = detalles.filter(venta__creado_en__date__lte=fecha_hasta)

        page = request.query_params.get('page', 1)
        try:
            page = int(page)
        except ValueError:
            page = 1
            
        page_size = request.query_params.get('page_size', 15)
        try:
            page_size = int(page_size)
        except ValueError:
            page_size = 15
            
        total = detalles.count()
        start = (page - 1) * page_size
        end = start + page_size
        detalles_paginados = detalles[start:end]

        serializer = VentaKardexSerializer(detalles_paginados, many=True)
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if page_size > 0 else 1,
            'results': serializer.data
        })
    
    @action(detail=True, methods=['get'])
    def ventas(self, request, pk=None):
        """Obtiene el histórico de ventas del cliente"""
        cliente = self.get_object()
        ventas = cliente.ventas.all().order_by('-creado_en')[:50]
        from apps.ventas.serializers import VentaSerializer
        serializer = VentaSerializer(ventas, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def estadisticas(self, request, pk=None):
        """Obtiene estadísticas del cliente"""
        cliente = self.get_object()
        
        # Total comprado
        total_comprado = sum(venta.total for venta in cliente.ventas.all())
        
        # Cantidad de compras
        cantidad_compras = cliente.ventas.count()
        
        # Producto más comprado
        from apps.ventas.models import DetalleVenta
        from django.db.models import Sum
        producto_stats = DetalleVenta.objects.filter(
            venta__cliente=cliente
        ).values('producto__nombre').annotate(
            total_cantidad=Sum('cantidad')
        ).order_by('-total_cantidad').first()
        
        # Ticket promedio
        ticket_promedio = total_comprado / cantidad_compras if cantidad_compras > 0 else 0
        
        return Response({
            'total_comprado': total_comprado,
            'cantidad_compras': cantidad_compras,
            'ticket_promedio': ticket_promedio,
            'producto_mas_comprado': producto_stats['producto__nombre'] if producto_stats else None,
            'recurrencia': cantidad_compras
        })
    
    @action(detail=False, methods=['get'])
    def top_clientes(self, request):
        """Obtiene los top clientes por compras"""
        clientes = Cliente.objects.all().annotate(
            total_compras=Sum('ventas__total'),
            cantidad_compras=Count('ventas')
        ).order_by('-total_compras')[:10]
        
        data = []
        for cliente in clientes:
            data.append({
                'id': cliente.id,
                'nombre': cliente.nombre,
                'numero_documento': cliente.numero_documento,
                'total_comprado': cliente.total_compras or 0,
                'cantidad_compras': cliente.cantidad_compras or 0,
            })
        
        return Response(data)

    @action(detail=False, methods=['get'])
    def exportar(self, request):
        """Exportar clientes a Excel (Multi-hoja)"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.filter_queryset(self.get_queryset())

        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(creado_en__date__gte=date_from, creado_en__date__lte=date_to)

        # Hoja 1: Clientes
        headers_clientes = ['ID', 'Nombre', 'Tipo Cliente', 'Documento', 'Contacto', 'Teléfono', 'Email', 'Total Comprado (S/.)', 'Activo', 'Fecha Registro']
        rows_clientes = []
        for obj in queryset:
            rows_clientes.append([
                obj.id,
                obj.nombre,
                dict(Cliente.TIPO_CLIENTE_CHOICES).get(obj.tipo_cliente, obj.tipo_cliente),
                f"{obj.tipo_documento}: {obj.numero_documento}",
                obj.contacto or '',
                obj.telefono or '',
                obj.email or '',
                float(obj.total_comprado) if obj.total_comprado else 0.0,
                'Sí' if obj.activo else 'No',
                timezone.localtime(obj.creado_en).strftime("%d/%m/%Y %H:%M:%S")
            ])

        # Hoja 2: Historial Global de Estados
        cliente_ids = queryset.values_list('id', flat=True)
        estados_qs = MovimientoEstadoCliente.objects.filter(cliente_id__in=cliente_ids).select_related('cliente').order_by('-fecha')
        
        headers_estados = ['Fecha', 'Cliente', 'Estado Anterior', 'Estado Nuevo', 'Notas']
        rows_estados = []
        for e in estados_qs:
            rows_estados.append([
                timezone.localtime(e.fecha).strftime("%d/%m/%Y %H:%M:%S"),
                e.cliente.nombre,
                e.estado_anterior,
                e.estado_nuevo,
                e.notas
            ])

        period_label = get_period_label(periodo, anio)
        sheets_data = [
            {
                'sheet_name': 'Clientes',
                'headers': headers_clientes,
                'rows': rows_clientes,
                'title': 'Registro de Clientes',
                'period_label': period_label
            },
            {
                'sheet_name': 'Historial de Estados',
                'headers': headers_estados,
                'rows': rows_estados,
                'title': 'Historial de Estados de Clientes',
                'period_label': period_label
            }
        ]

        return create_multi_sheet_excel_response(
            filename=f'clientes_{periodo}{"_" + str(anio) if anio else ""}.xlsx',
            sheets_data=sheets_data
        )

    @action(detail=True, methods=['get'])
    def exportar_historial(self, request, pk=None):
        """Exporta el historial completo de un cliente (Kardex) en Excel multi-hoja"""
        cliente = self.get_object()
        
        # Datos de filtros
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')

        # Hoja 1: Historial de Estados
        estados = cliente.movimientos_estado.all().order_by('-fecha')
        headers_estados = ['Fecha', 'Estado Anterior', 'Estado Nuevo', 'Notas']
        rows_estados = [
            [
                timezone.localtime(e.fecha).strftime("%d/%m/%Y %H:%M:%S"),
                e.estado_anterior,
                e.estado_nuevo,
                e.notas
            ] for e in estados
        ]

        # Hoja 2: Detalle de Venta de Productos (Kardex)
        detalles = DetalleVenta.objects.filter(venta__cliente=cliente).select_related('producto', 'venta').order_by('-venta__creado_en')
        if fecha_desde:
            detalles = detalles.filter(venta__creado_en__date__gte=fecha_desde)
        if fecha_hasta:
            detalles = detalles.filter(venta__creado_en__date__lte=fecha_hasta)

        headers_productos = [
            'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente', 'Producto',
            'Código', 'Cant.', 'P. Unit.', 'Desc.', 'Total'
        ]
        rows_productos = []
        for d in detalles:
            v = d.venta
            tipo_c = v.tipo_comprobante
            l_tipo = tipo_c if tipo_c and tipo_c != 'SIMPLE' else ""
            l_num = v.numero_comprobante if l_tipo else ""
            
            # Obtener nombre del cliente (aunque sea el mismo para todos en este reporte individual, 
            # se solicita por consistencia con el reporte global/ventas)
            cliente_nombre = v.cliente_nombre or (v.cliente.nombre if v.cliente else "Cliente General")
            
            rows_productos.append([
                timezone.localtime(v.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE",
                v.numero_comprobante_simple or "",
                l_tipo,
                l_num,
                cliente_nombre,
                d.producto.nombre,
                d.producto.codigo,
                float(d.cantidad),
                float(d.precio_venta),
                float(d.descuento),
                float(d.subtotal)
            ])

        sheets_data = [
            {
                'sheet_name': 'Historial de Estados',
                'headers': headers_estados,
                'rows': rows_estados,
                'title': f'Historial de Estados - Cliente: {cliente.nombre}',
                'period_label': 'Historial Completo'
            },
            {
                'sheet_name': 'Detalle de Venta de Productos',
                'headers': headers_productos,
                'rows': rows_productos,
                'title': f'Detalle de Venta de Productos - Cliente: {cliente.nombre}',
                'period_label': f"{fecha_desde or 'Inicio'} al {fecha_hasta or 'Hoy'}" if (fecha_desde or fecha_hasta) else "Historial Completo"
            }
        ]

        return create_multi_sheet_excel_response(
            filename=f'historial_cliente_{cliente.id}.xlsx',
            sheets_data=sheets_data
        )


class SegmentoClienteViewSet(viewsets.ModelViewSet):
    queryset = SegmentoCliente.objects.all()
    serializer_class = SegmentoClienteSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']
    pagination_class = None
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()
