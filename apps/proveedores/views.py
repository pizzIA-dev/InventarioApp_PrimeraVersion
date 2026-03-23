from django.http import HttpResponse
from apps.core.export_utils import (
    get_period_range, get_period_label, create_excel_response
)
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import Proveedor, HistoricoPrecio, MovimientoProveedor
from .serializers import (
    ProveedorSerializer, ProveedorCreateSerializer,
    HistoricoPrecioSerializer, MovimientoProveedorSerializer
)


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['nombre', 'identificador', 'email', 'telefono']
    filterset_fields = ['categoria', 'activo', 'tiene_contrato']
    ordering_fields = ['nombre', 'creado_en']
    pagination_class = None
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProveedorCreateSerializer
        return ProveedorSerializer
    
    def perform_create(self, serializer):
        from apps.core.models import Empresa
        empresa = Empresa.objects.first() # Temporal until full auth logic is implemented
        serializer.save(empresa=empresa)
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()
    
    @action(detail=True, methods=['get'])
    def historico_precios(self, request, pk=None):
        """Obtiene el histórico de precios de un proveedor"""
        proveedor = self.get_object()
        historico = proveedor.historico_precios.all()[:100]
        serializer = HistoricoPrecioSerializer(historico, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def productos(self, request, pk=None):
        """Obtiene los productos que ha suministrado este proveedor"""
        proveedor = self.get_object()
        productos = proveedor.productos_suministrados
        from apps.inventario.serializers import ProductoSerializer
        serializer = ProductoSerializer(productos, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        """Obtiene el historial de cambios del proveedor paginado"""
        proveedor = self.get_object()
        qs = proveedor.movimientos.all().order_by('-fecha')
        
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

        serializer = MovimientoProveedorSerializer(movimientos, many=True)
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if page_size > 0 else 1,
            'results': serializer.data
        })
        
    @action(detail=True, methods=['get'])
    def exportar_historial(self, request, pk=None):
        """Exportar el historial de un proveedor específico a Excel"""
        proveedor = self.get_object()
        movimientos = proveedor.movimientos.all().order_by('-fecha')
        
        headers = ['Fecha', 'Acción', 'Detalle', 'Estado', 'Contrato']
        rows = []
        for mov in movimientos:
            fecha_str = mov.fecha.strftime('%d/%m/%Y %H:%M:%S') if mov.fecha else ''
            rows.append([
                fecha_str,
                mov.tipo,
                mov.descripcion,
                'Activo' if mov.activo_nuevo else 'Inactivo',
                'Sí' if mov.contrato_nuevo else 'No'
            ])

        return create_excel_response(
            filename=f'historial_{proveedor.identificador}.xlsx',
            sheet_name='Historial',
            headers=headers,
            rows=rows,
            title=f'Historial de Modificaciones: {proveedor.nombre}',
            period_label='Todos los registros'
        )

    @action(detail=True, methods=['get'])
    def estadisticas(self, request, pk=None):
        """Obtiene estadísticas del proveedor"""
        proveedor = self.get_object()
        
        # Total comprado
        total_compras = sum(compra.total for compra in proveedor.compras.all())
        
        # Cantidad de compras
        cantidad_compras = proveedor.compras.count()
        
        # Producto más comprado
        from django.db.models import Sum
        producto_stats = HistoricoPrecio.objects.filter(
            proveedor=proveedor
        ).values('producto__nombre').annotate(
            total_cantidad=Sum('cantidad')
        ).order_by('-total_cantidad').first()
        
        return Response({
            'total_compras': total_compras,
            'cantidad_compras': cantidad_compras,
            'producto_mas_comprado': producto_stats['producto__nombre'] if producto_stats else None,
            'productos_diferentes': proveedor.historico_precios.values('producto').distinct().count()
        })

    @action(detail=False, methods=['get'])
    def exportar(self, request):
        """Exportar proveedores a Excel con filtro de período"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.filter_queryset(self.get_queryset())

        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(creado_en__date__gte=date_from, creado_en__date__lte=date_to)

        headers = ['ID', 'Nombre', 'Documento', 'Categoría', 'Contacto', 'Email', 'Teléfono', 'Límite Crédito (S/.)', 'Activo']
        rows = []
        for obj in queryset:
            rows.append([
                obj.id,
                obj.nombre,
                obj.identificador or '',
                obj.categoria or '',
                obj.contacto or '',
                obj.email or '',
                obj.telefono or '',
                float(obj.limite_credito) if obj.limite_credito else 0.0,
                'Sí' if obj.activo else 'No'
            ])

        period_label = get_period_label(periodo, anio)
        return create_excel_response(
            filename='proveedores.xlsx',
            sheet_name='Proveedores',
            headers=headers,
            rows=rows,
            title='Registro de Proveedores',
            period_label=period_label
        )


class HistoricoPrecioViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistoricoPrecio.objects.all().select_related('producto', 'proveedor')
    serializer_class = HistoricoPrecioSerializer
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['proveedor', 'producto']
    ordering_fields = ['fecha']

class MovimientoProveedorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MovimientoProveedor.objects.all().select_related('proveedor')
    serializer_class = MovimientoProveedorSerializer
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    ordering_fields = ['fecha']
    
    @action(detail=False, methods=['get'])
    def exportar(self, request):
        """Exportar reporte de diario de movimientos a Excel"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.filter_queryset(self.get_queryset())

        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(fecha__date__gte=date_from, fecha__date__lte=date_to)

        headers = ['Fecha', 'Documento', 'Proveedor', 'Acción', 'Detalle', 'Estado', 'Contrato']
        rows = []
        for mov in queryset:
            fecha_str = mov.fecha.strftime('%d/%m/%Y %H:%M:%S') if mov.fecha else ''
            rows.append([
                fecha_str,
                mov.proveedor.identificador,
                mov.proveedor.nombre,
                mov.tipo,
                mov.descripcion,
                'Activo' if mov.activo_nuevo else 'Inactivo',
                'Sí' if mov.contrato_nuevo else 'No'
            ])

        period_label = get_period_label(periodo, anio)
        return create_excel_response(
            filename=f'diario_historial_proveedores.xlsx',
            sheet_name='Historial Global',
            headers=headers,
            rows=rows,
            title='Diario de Modificaciones de Proveedores',
            period_label=period_label
        )
