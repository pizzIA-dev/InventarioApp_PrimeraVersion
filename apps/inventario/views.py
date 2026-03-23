from django.http import HttpResponse
from apps.core.export_utils import (
    get_period_range, get_period_label, create_excel_response
)
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import Categoria, Producto, MovimientoStock
from .serializers import (
    CategoriaSerializer,
    ProductoSerializer, ProductoCreateSerializer,
    MovimientoStockSerializer, MovimientoStockCreateSerializer
)


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre', 'creado_en']
    pagination_class = None
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['codigo', 'nombre', 'descripcion']
    filterset_fields = ['categoria', 'activo', 'unidad_medida']
    ordering_fields = ['nombre', 'precio_venta', 'stock_actual', 'creado_en']
    pagination_class = None
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProductoCreateSerializer
        return ProductoSerializer
    
    def perform_create(self, serializer):
        # Save the product
        instance = serializer.save()
        
        # Create the initial movement, recording the initial activo state too
        MovimientoStock.objects.create(
            producto=instance,
            tipo='ENTRADA',
            origen='AJUSTE',
            cantidad=instance.stock_actual,
            stock_anterior=0,
            stock_nuevo=instance.stock_actual,
            precio_compra_anterior=0,
            precio_compra_nuevo=instance.precio_compra,
            precio_venta_anterior=0,
            precio_venta_nuevo=instance.precio_venta,
            activo_nuevo=instance.activo,
            notas="Inventario inicial."
        )

    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()
        
    def perform_update(self, serializer):
        producto = self.get_object()
        old_stock = producto.stock_actual
        old_precio_compra = producto.precio_compra
        old_precio_venta = producto.precio_venta
        old_activo = producto.activo
        
        # The serializer validates and extracts the incoming data
        data = serializer.validated_data
        
        # Save the product first
        instance = serializer.save()
        
        new_stock = instance.stock_actual
        new_precio_compra = instance.precio_compra
        new_precio_venta = instance.precio_venta
        
        # Check if stock or prices changed
        if old_stock != new_stock or old_precio_compra != new_precio_compra or old_precio_venta != new_precio_venta:
            if old_stock != new_stock:
                tipo = 'ENTRADA' if new_stock > old_stock else 'SALIDA'
                cantidad = abs(new_stock - old_stock)
                notas = "Ajuste manual de stock."
            else:
                tipo = 'ENTRADA'
                cantidad = 0
                notas = "Ajuste manual de precios."
            
            # Create movement to keep Kardex history accurate
            MovimientoStock.objects.create(
                producto=instance,
                tipo=tipo,
                origen='AJUSTE',
                cantidad=cantidad,
                stock_anterior=old_stock,
                stock_nuevo=new_stock,
                precio_compra_anterior=old_precio_compra,
                precio_compra_nuevo=new_precio_compra,
                precio_venta_anterior=old_precio_venta,
                precio_venta_nuevo=new_precio_venta,
                notas=notas
            )

        # Check if activo state changed — record it as a separate Kardex event
        if old_activo != instance.activo:
            estado_label = "Activo" if instance.activo else "Inactivo"
            MovimientoStock.objects.create(
                producto=instance,
                tipo='ENTRADA' if instance.activo else 'SALIDA',
                origen='AJUSTE',
                cantidad=0,
                stock_anterior=instance.stock_actual,
                stock_nuevo=instance.stock_actual,
                precio_compra_anterior=instance.precio_compra,
                precio_compra_nuevo=instance.precio_compra,
                precio_venta_anterior=instance.precio_venta,
                precio_venta_nuevo=instance.precio_venta,
                activo_nuevo=instance.activo,
                notas=f"Cambio de estado: {estado_label}."
            )
    
    @action(detail=True, methods=['get'])
    def movimientos(self, request, pk=None):
        """Obtiene movimientos de un producto con filtros opcionales de fecha y paginación"""
        producto = self.get_object()
        qs = producto.movimientos.all().order_by('-fecha')

        # Date filters
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_desde:
            qs = qs.filter(fecha__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha__date__lte=fecha_hasta)

        # Pagination
        try:
            page_size = int(request.query_params.get('page_size', 20))
        except ValueError:
            page_size = 20
        try:
            page = int(request.query_params.get('page', 1))
        except ValueError:
            page = 1

        total = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        movimientos = qs[start:end]

        serializer = MovimientoStockSerializer(movimientos, many=True)
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if page_size > 0 else 1,
            'results': serializer.data
        })
        
    @action(detail=True, methods=['get'])
    def exportar_movimientos(self, request, pk=None):
        """Exportar el historial de movimientos de un producto a Excel"""
        from apps.core.export_utils import create_excel_response
        
        producto = self.get_object()
        movimientos = producto.movimientos.all().order_by('-fecha')
        
        headers = ['Fecha', 'Tipo', 'Origen', 'Cantidad', 'P. Compra Ant. (S/.)', 'P. Compra Nvo. (S/.)', 'P. Venta Ant. (S/.)', 'P. Venta Nvo. (S/.)', 'Stock Anterior', 'Stock Nuevo', 'Estado', 'Referencia']
        rows = []
        for mov in movimientos:
            fecha_str = mov.fecha.strftime('%d/%m/%Y %H:%M:%S') if mov.fecha else ''
            cantidad_str = f"+{float(mov.cantidad)}" if mov.tipo == 'ENTRADA' else f"-{float(mov.cantidad)}"
            
            # Build the estado string for this row
            if mov.activo_nuevo is True:
                estado_str = f"Activo desde {fecha_str}"
            elif mov.activo_nuevo is False:
                estado_str = f"Inactivo desde {fecha_str}"
            else:
                estado_str = '-'
            
            rows.append([
                fecha_str,
                mov.tipo,
                mov.origen,
                cantidad_str,
                float(mov.precio_compra_anterior) if mov.precio_compra_anterior else '',
                float(mov.precio_compra_nuevo) if mov.precio_compra_nuevo else '',
                float(mov.precio_venta_anterior) if mov.precio_venta_anterior else '',
                float(mov.precio_venta_nuevo) if mov.precio_venta_nuevo else '',
                float(mov.stock_anterior),
                float(mov.stock_nuevo),
                estado_str,
                mov.referencia or ''
            ])

        return create_excel_response(
            filename=f'historial_{producto.codigo}.xlsx',
            sheet_name='Kardex',
            headers=headers,
            rows=rows,
            title=f'Historial de Stock: {producto.nombre} ({producto.codigo})',
            period_label='Todos los registros'
        )
    
    @action(detail=False, methods=['get'])
    def stock_bajo(self, request):
        """Obtiene productos con stock bajo"""
        productos = Producto.objects.filter(activo=True)
        productos_stock_bajo = [p for p in productos if p.stock_bajo]
        serializer = self.get_serializer(productos_stock_bajo, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def exportar(self, request):
        """Exportar productos a Excel con filtro de período"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.filter_queryset(self.get_queryset())

        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(creado_en__date__gte=date_from, creado_en__date__lte=date_to)

        headers = ['ID', 'Código', 'Nombre', 'Categoría', 'Stock Actual', 'Precio Compra (S/.)', 'Precio Venta (S/.)', 'Activo', 'Fecha Creación', 'Última Modificación']
        rows = []
        for obj in queryset:
            categoria_nombre = obj.categoria.nombre if obj.categoria else 'Sin Categoría'
            fecha_creacion = obj.creado_en.strftime('%d/%m/%Y %H:%M') if obj.creado_en else ''
            fecha_modificacion = obj.actualizado_en.strftime('%d/%m/%Y %H:%M') if obj.actualizado_en else ''
            
            rows.append([
                obj.id,
                obj.codigo,
                obj.nombre,
                categoria_nombre,
                obj.stock_actual,
                float(obj.precio_compra),
                float(obj.precio_venta),
                'Sí' if obj.activo else 'No',
                fecha_creacion,
                fecha_modificacion
            ])

        period_label = get_period_label(periodo, anio)
        return create_excel_response(
            filename='productos.xlsx',
            sheet_name='Productos',
            headers=headers,
            rows=rows,
            title='Registro de Productos',
            period_label=period_label
        )

class MovimientoStockViewSet(viewsets.ModelViewSet):
    queryset = MovimientoStock.objects.all().select_related('producto')
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['tipo', 'origen', 'producto']
    ordering_fields = ['fecha']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MovimientoStockCreateSerializer
        return MovimientoStockSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        producto = serializer.validated_data['producto']
        tipo = serializer.validated_data['tipo']
        cantidad = serializer.validated_data['cantidad']
        
        # Guardar stock anterior
        stock_anterior = producto.stock_actual
        
        # Crear movimiento
        self.perform_create(serializer)
        
        # Recargar con datos calculados
        movimiento = MovimientoStock.objects.get(pk=serializer.instance.pk)
        output_serializer = MovimientoStockSerializer(movimiento)
        
        headers = self.get_success_headers(serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['get'])
    def exportar(self, request):
        """Exportar reporte de diario de movimientos a Excel"""
        from apps.core.export_utils import get_period_range, get_period_label, create_excel_response
        
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.filter_queryset(self.get_queryset())

        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(fecha__date__gte=date_from, fecha__date__lte=date_to)

        headers = ['Fecha', 'Código', 'Producto', 'Tipo', 'Origen', 'Cantidad', 'P. Compra Ant. (S/.)', 'P. Compra Nvo. (S/.)', 'P. Venta Ant. (S/.)', 'P. Venta Nvo. (S/.)', 'Stock Anterior', 'Stock Nuevo', 'Estado']
        rows = []
        for mov in queryset:
            fecha_str = mov.fecha.strftime('%d/%m/%Y %H:%M:%S') if mov.fecha else ''
            cantidad_str = f"+{float(mov.cantidad)}" if mov.tipo == 'ENTRADA' else f"-{float(mov.cantidad)}"
            
            # Build the estado string for this row
            if mov.activo_nuevo is True:
                estado_str = f"Activo desde {fecha_str}"
            elif mov.activo_nuevo is False:
                estado_str = f"Inactivo desde {fecha_str}"
            else:
                estado_str = '-'
            
            rows.append([
                fecha_str,
                mov.producto.codigo,
                mov.producto.nombre,
                mov.tipo,
                mov.origen,
                cantidad_str,
                float(mov.precio_compra_anterior) if mov.precio_compra_anterior else '',
                float(mov.precio_compra_nuevo) if mov.precio_compra_nuevo else '',
                float(mov.precio_venta_anterior) if mov.precio_venta_anterior else '',
                float(mov.precio_venta_nuevo) if mov.precio_venta_nuevo else '',
                float(mov.stock_anterior),
                float(mov.stock_nuevo),
                estado_str
            ])

        period_label = get_period_label(periodo, anio)
        return create_excel_response(
            filename='diario_movimientos.xlsx',
            sheet_name='Movimientos',
            headers=headers,
            rows=rows,
            title='Diario de Movimientos (Kardex Global)',
            period_label=period_label
        )
