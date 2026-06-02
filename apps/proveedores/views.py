from apps.core.renderers import PassthroughRenderer
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
        if instance.identificador == '00000000':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                'El Proveedor General no puede ser eliminado ni desactivado. '
                'Es un registro del sistema necesario para compras sin proveedor registrado.'
            )
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
        
    @action(detail=True, methods=['get'], renderer_classes=[PassthroughRenderer])
    def exportar_historial(self, request, pk=None):
        """Exportar el historial de un proveedor específico a Excel con multi-hoja"""
        proveedor = self.get_object()
        
        # Hoja 1: Modificaciones de Estado
        movimientos = proveedor.movimientos.all().order_by('-fecha')
        headers_mod = ['Fecha', 'Acción', 'Detalle', 'Estado', 'Contrato', 'Responsable']
        rows_mod = []
        for mov in movimientos:
            fecha_str = timezone.localtime(mov.fecha).strftime('%d/%m/%Y %H:%M:%S') if mov.fecha else ''
            rows_mod.append([
                fecha_str,
                mov.tipo,
                mov.descripcion,
                'Activo' if mov.activo_nuevo else 'Inactivo',
                'Sí' if mov.contrato_nuevo else 'No',
                f"{mov.usuario.get_full_name() or mov.usuario.username} ({mov.usuario.perfil.get_rol_display() if hasattr(mov.usuario, 'perfil') else '-'})" if hasattr(mov, 'usuario') and mov.usuario else "Sistema"
            ])

        # Hoja 2: Detalle de Productos (Compras)
        from apps.compras.models import DetalleCompra
        detalles_qs = DetalleCompra.objects.filter(compra__proveedor=proveedor).select_related('producto', 'compra').order_by('-compra__creado_en')
        
        headers_prod = ['Fecha', 'Tipo de comprobante', 'Comprobante', 'Producto', 'Código de Producto', 'Cantidad', 'Precio de compra (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable']
        rows_prod = []
        for d in detalles_qs:
            c = d.compra
            comp_num = c.numero_comprobante or f"#{c.id}"
            # El total es el subtotal (neto) + impuesto del comprobante
            total_fila = float(d.subtotal) + float(c.impuesto)
            rows_prod.append([
                timezone.localtime(c.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                c.tipo_comprobante or '',
                comp_num,
                d.producto.nombre,
                d.producto.codigo,
                float(d.cantidad),
                float(d.precio_compra),
                float(d.descuento),
                float(c.impuesto),
                total_fila,
                f"{c.usuario.get_full_name() or c.usuario.username} ({c.usuario.perfil.get_rol_display() if hasattr(c.usuario, 'perfil') else '-'})" if hasattr(c, 'usuario') and c.usuario else "Sistema"
            ])

        sheets_data = [
            {
                'sheet_name': 'Modificaciones de Estado',
                'headers': headers_mod,
                'rows': rows_mod,
                'title': f'Historial de Modificaciones: {proveedor.nombre}',
                'period_label': 'Historial Completo'
            },
            {
                'sheet_name': 'Detalle de Productos',
                'headers': headers_prod,
                'rows': rows_prod,
                'title': f'Detalle de Compras: {proveedor.nombre}',
                'period_label': 'Historial Completo'
            }
        ]

        return create_multi_sheet_excel_response(
            filename=f'historial_{proveedor.identificador}.xlsx',
            sheets_data=sheets_data
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

    @action(detail=False, methods=['get'], renderer_classes=[PassthroughRenderer])
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

        from django.db.models import Sum
        headers = ['ID', 'Nombre', 'Documento (RUC/DNI)', 'Categoría', 'Contrato', 'Contacto', 'Email', 'Teléfono', 'Días de Crédito', 'Límite Crédito (S/.)', 'Estado', 'Recurrencia', 'Total Comprado (S/.)', 'Última Modificación', 'Responsable']
        rows = []
        for obj in queryset:
            # Calcular métricas adicionales
            recurrencia = obj.compras.count()
            total_comprado = obj.compras.aggregate(total_sum=Sum('total'))['total_sum'] or 0.0

            # Get latest movement to find the responsible user
            last_mov = obj.movimientos.order_by('-fecha').first()
            usuario_str = f"{last_mov.usuario.get_full_name() or last_mov.usuario.username} ({last_mov.usuario.perfil.get_rol_display() if hasattr(last_mov.usuario, 'perfil') else '-'})" if last_mov and last_mov.usuario else "Sistema"

            rows.append([
                obj.id,
                obj.nombre,
                obj.identificador or '',
                obj.categoria or '',
                'Sí' if obj.tiene_contrato else 'No',
                obj.contacto or '',
                obj.email or '',
                obj.telefono or '',
                obj.dias_credito or 0,
                float(obj.limite_credito) if obj.limite_credito else 0.0,
                'Activo' if obj.activo else 'Inactivo',
                recurrencia,
                float(total_comprado),
                timezone.localtime(obj.actualizado_en).strftime('%d/%m/%Y %H:%M:%S') if obj.actualizado_en else '',
                usuario_str
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
    
    @action(detail=False, methods=['get'], renderer_classes=[PassthroughRenderer])
    def exportar(self, request):
        """Exportar reporte de diario de movimientos a Excel con multi-hoja"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        # Hoja 1: Modificaciones de Estado
        movimientos_qs = self.filter_queryset(self.get_queryset())
        
        # Hoja 2: Detalle de Productos (Global)
        from apps.compras.models import DetalleCompra
        detalles_qs = DetalleCompra.objects.all().select_related('producto', 'compra', 'compra__proveedor').order_by('-compra__creado_en')

        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            movimientos_qs = movimientos_qs.filter(fecha__date__gte=date_from, fecha__date__lte=date_to)
            detalles_qs = detalles_qs.filter(compra__creado_en__date__gte=date_from, compra__creado_en__date__lte=date_to)

        # Preparar filas Hoja 1
        headers_mod = ['Fecha', 'ID Proveedor', 'Proveedor', 'Acción', 'Detalle', 'Estado', 'Contrato', 'Responsable']
        rows_mod = []
        for mov in movimientos_qs:
            fecha_str = timezone.localtime(mov.fecha).strftime('%d/%m/%Y %H:%M:%S') if mov.fecha else ''
            rows_mod.append([
                fecha_str,
                mov.proveedor.identificador,
                mov.proveedor.nombre,
                mov.tipo,
                mov.descripcion,
                'Activo' if mov.activo_nuevo else 'Inactivo',
                'Sí' if mov.contrato_nuevo else 'No',
                f"{mov.usuario.get_full_name() or mov.usuario.username} ({mov.usuario.perfil.get_rol_display() if hasattr(mov.usuario, 'perfil') else '-'})" if hasattr(mov, 'usuario') and mov.usuario else "Sistema"
            ])

        # Preparar filas Hoja 2
        headers_prod = ['Fecha', 'Tipo de comprobante', 'Comprobante', 'Proveedor', 'Producto', 'Código de Producto', 'Cantidad', 'Precio de compra (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable']
        rows_prod = []
        for d in detalles_qs:
            c = d.compra
            prov_nombre = c.proveedor_nombre or (c.proveedor.nombre if c.proveedor else 'N/A')
            comp_num = c.numero_comprobante or f"#{c.id}"
            # El total es el subtotal (neto) + impuesto del comprobante
            total_fila = float(d.subtotal) + float(c.impuesto)
            rows_prod.append([
                timezone.localtime(c.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                c.tipo_comprobante or '',
                comp_num,
                prov_nombre,
                d.producto.nombre,
                d.producto.codigo,
                float(d.cantidad),
                float(d.precio_compra),
                float(d.descuento),
                float(c.impuesto),
                total_fila,
                f"{c.usuario.get_full_name() or c.usuario.username} ({c.usuario.perfil.get_rol_display() if hasattr(c.usuario, 'perfil') else '-'})" if hasattr(c, 'usuario') and c.usuario else "Sistema"
            ])

        period_label = get_period_label(periodo, anio)
        
        sheets_data = [
            {
                'sheet_name': 'Diario de Modificaciones',
                'headers': headers_mod,
                'rows': rows_mod,
                'title': 'Diario de Modificaciones de Proveedores',
                'period_label': period_label
            },
            {
                'sheet_name': 'Detalle de Productos',
                'headers': headers_prod,
                'rows': rows_prod,
                'title': 'Detalle de Compra de Productos (Global)',
                'period_label': period_label
            }
        ]

        return create_multi_sheet_excel_response(
            filename=f'diario_historial_proveedores_{periodo}.xlsx',
            sheets_data=sheets_data
        )
