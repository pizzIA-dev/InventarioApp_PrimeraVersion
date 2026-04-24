from django.http import HttpResponse
from django.db.models import Sum
from apps.core.export_utils import (
    get_period_range, get_period_label, create_excel_response
)
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import ValidationError

# Importar Permisos RBAC
from apps.core.permissions import HasRBACScope, IsGerente

from .models import Categoria, Producto, MovimientoStock, Almacen, StockAlmacen, TrasladoStock
from .serializers import (
    CategoriaSerializer,
    ProductoSerializer, ProductoCreateSerializer,
    MovimientoStockSerializer, MovimientoStockCreateSerializer,
    AlmacenSerializer, AlmacenListSerializer,
    StockAlmacenSerializer, TrasladoStockSerializer
)
from apps.core.mixins import SoloGerenteDestroyMixin


class CategoriaViewSet(SoloGerenteDestroyMixin, viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre', 'creado_en']
    pagination_class = None
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()


class ProductoViewSet(SoloGerenteDestroyMixin, viewsets.ModelViewSet):
    # Proteger este ViewSet con el motor de roles Customizados
    permission_classes = [HasRBACScope]
    required_scope = 'inventario:escribir'
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
        
        # Create the initial movement
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
            notas="Registro inicial del producto"
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
        
        # Save the product first
        instance = serializer.save()
        
        new_stock = instance.stock_actual
        new_precio_compra = instance.precio_compra
        new_precio_venta = instance.precio_venta
        new_activo = instance.activo
        
        changes = []
        if old_stock != new_stock:
            changes.append(f"Stock: {float(old_stock)} -> {float(new_stock)}")
        if old_precio_compra != new_precio_compra:
            changes.append(f"P. Compra: {float(old_precio_compra)} -> {float(new_precio_compra)}")
        if old_precio_venta != new_precio_venta:
            changes.append(f"P. Venta: {float(old_precio_venta)} -> {float(new_precio_venta)}")
        if old_activo != new_activo:
            changes.append(f"Estado: {'Activo' if old_activo else 'Inactivo'} -> {'Activo' if new_activo else 'Inactivo'}")

        if changes:
            # Determine movement type (ENTRADA/SALIDA) based on stock change or default to ENTRADA
            tipo = 'SALIDA' if new_stock < old_stock else 'ENTRADA'
            cantidad = abs(new_stock - old_stock)
            
            # Use 'CAMBIO_ESTADO' concept (even though MovimientoStock doesn't have that specific TIPO)
            # We'll just use AJUSTE for everything from the ViewSet
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
                activo_nuevo=new_activo if old_activo != new_activo else None,
                notas=", ".join(changes)
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
        
        headers = ['Fecha', 'Almacén', 'Tipo', 'Origen', 'P. Unitario (S/.)', 'Cantidad', 'P. Compra Ant. (S/.)', 'P. Compra Nvo. (S/.)', 'P. Venta Ant. (S/.)', 'P. Venta Nvo. (S/.)', 'Stock Anterior', 'Stock Nuevo', 'Estado', 'Referencia', 'Notas', 'Responsable']
        rows = []
        for mov in movimientos:
            fecha_str = mov.fecha.strftime('%d/%m/%Y %H:%M:%S') if mov.fecha else ''
            cantidad_str = f"+{float(mov.cantidad)}" if mov.tipo == 'ENTRADA' else f"-{float(mov.cantidad)}"
            almacen_str = mov.almacen.nombre if mov.almacen else 'General'
            
            # Build the estado string for this row
            if mov.activo_nuevo is True:
                estado_str = f"Activo desde {fecha_str}"
            elif mov.activo_nuevo is False:
                estado_str = f"Inactivo desde {fecha_str}"
            else:
                estado_str = '-'
            
            usuario_str = f"{mov.usuario.get_full_name() or mov.usuario.username} ({mov.usuario.perfil.get_rol_display() if hasattr(mov.usuario, 'perfil') else '-'})" if hasattr(mov, 'usuario') and mov.usuario else "Sistema"
            
            rows.append([
                fecha_str,
                almacen_str,
                mov.tipo,
                mov.origen,
                float(mov.precio_unitario) if mov.precio_unitario else '',
                cantidad_str,
                float(mov.precio_compra_anterior) if mov.precio_compra_anterior else '',
                float(mov.precio_compra_nuevo) if mov.precio_compra_nuevo else '',
                float(mov.precio_venta_anterior) if mov.precio_venta_anterior else '',
                float(mov.precio_venta_nuevo) if mov.precio_venta_nuevo else '',
                float(mov.stock_anterior),
                float(mov.stock_nuevo),
                estado_str,
                mov.referencia or '',
                mov.notas or '',
                usuario_str
            ])

        return create_excel_response(
            filename=f'historial_{producto.codigo}.xlsx',
            sheet_name='Kardex',
            headers=headers,
            rows=rows,
            title=f'Historial de Stock: {producto.nombre} ({producto.codigo})',
            period_label='Todos los registros'
        )
    
    @action(detail=True, methods=['post'])
    def ajustar_stock(self, request, pk=None):
        """
        Ajuste de inventario (Merma, Extravío, Caducidad, etc.).
        """
        producto = self.get_object()
        user_perfil = request.user.perfil
        
        # Parámetros
        cantidad_ajuste = request.data.get('cantidad_ajuste')
        tipo = request.data.get('tipo', 'SALIDA')  # ENTRADA o SALIDA
        origen = request.data.get('origen')        # MERMA, CADUCIDAD, EXTRAVIO, ROTURA, etc.
        notas = request.data.get('notas', '')
        almacen_id = request.data.get('almacen_id')
        
        if not cantidad_ajuste or float(cantidad_ajuste) <= 0:
            return Response({'error': 'La cantidad de ajuste debe ser mayor a 0.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if origen not in dict(MovimientoStock.ORIGEN_MOVIMIENTO_CHOICES).keys():
            return Response({'error': 'Motivo de ajuste inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validación de almacén basada en rol
        from apps.inventario.models import Almacen
        almacen_obj = None
        if user_perfil.rol == 'GERENTE':
            # El Gerente debe mandar explicitamente a qué almacén ajusta
            if almacen_id:
                try:
                    almacen_obj = Almacen.objects.get(id=almacen_id, empresa=user_perfil.empresa)
                except Almacen.DoesNotExist:
                    return Response({'error': 'Almacén seleccionado es inválido o no te pertenece.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({'error': 'Debes especificar el almacén a afectar.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Si es Colaborador, el ajuste SOLO afecta al subalmacén donde está asignado
            if not user_perfil.almacen:
                # Fallback al almacén general
                almacen_obj = Almacen.objects.filter(empresa=user_perfil.empresa, es_general=True).first()
            else:
                almacen_obj = user_perfil.almacen
                
            if not almacen_obj:
                return Response({'error': 'No tienes un almacén asignado para ajustar.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validación que no deje saldo negativo el sub-almacén si es salida
        if tipo == 'SALIDA':
            from apps.inventario.models import StockAlmacen
            sa = StockAlmacen.objects.filter(almacen=almacen_obj, producto=producto).first()
            disp = sa.cantidad if sa else 0
            if disp < float(cantidad_ajuste):
                return Response({
                    'error': f"Stock insuficiente en {almacen_obj.nombre}. Necesitas descontar {cantidad_ajuste} pero solo hay {disp} disponibles."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Ejecutar Creación (MovimientoStock.save() se encarga de re-calcular todo atómicamente)
        MovimientoStock.objects.create(
            empresa=producto.empresa,
            producto=producto,
            tipo=tipo,
            origen=origen,
            almacen=almacen_obj,
            cantidad=cantidad_ajuste,
            notas=notas,
            usuario=request.user,
            referencia='Ajuste de Sistema',
        )
        
        # Refrescar y serializar
        producto.refresh_from_db()
        return Response(self.get_serializer(producto).data)

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

        headers = ['ID', 'Código', 'Nombre', 'Categoría', 'Stock Actual', 'Precio Compra (S/.)', 'Precio Venta (S/.)', 'Activo', 'Fecha Creación', 'Última Modificación', 'Responsable']
        rows = []
        for obj in queryset:
            categoria_nombre = obj.categoria.nombre if obj.categoria else 'Sin Categoría'
            fecha_creacion = obj.creado_en.strftime('%d/%m/%Y %H:%M') if obj.creado_en else ''
            fecha_modificacion = obj.actualizado_en.strftime('%d/%m/%Y %H:%M') if obj.actualizado_en else ''
            
            # Get latest movement to find the responsible user
            last_mov = obj.movimientos.order_by('-fecha').first()
            usuario_str = f"{last_mov.usuario.get_full_name() or last_mov.usuario.username} ({last_mov.usuario.perfil.get_rol_display() if hasattr(last_mov.usuario, 'perfil') else '-'})" if last_mov and last_mov.usuario else "Sistema"

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
                fecha_modificacion,
                usuario_str
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

        headers = ['Fecha', 'Almacén', 'Código', 'Producto', 'Tipo', 'Origen', 'P. Unitario (S/.)', 'Cantidad', 'P. Compra Ant. (S/.)', 'P. Compra Nvo. (S/.)', 'P. Venta Ant. (S/.)', 'P. Venta Nvo. (S/.)', 'Stock Anterior', 'Stock Nuevo', 'Estado', 'Notas', 'Responsable']
        rows = []
        for mov in queryset:
            fecha_str = mov.fecha.strftime('%d/%m/%Y %H:%M:%S') if mov.fecha else ''
            cantidad_str = f"+{float(mov.cantidad)}" if mov.tipo == 'ENTRADA' else f"-{float(mov.cantidad)}"
            almacen_str = mov.almacen.nombre if mov.almacen else 'General'
            
            # Build the estado string for this row
            if mov.activo_nuevo is True:
                estado_str = f"Activo desde {fecha_str}"
            elif mov.activo_nuevo is False:
                estado_str = f"Inactivo desde {fecha_str}"
            else:
                estado_str = '-'
            
            usuario_str = f"{mov.usuario.get_full_name() or mov.usuario.username} ({mov.usuario.perfil.get_rol_display() if hasattr(mov.usuario, 'perfil') else '-'})" if hasattr(mov, 'usuario') and mov.usuario else "Sistema"
            
            rows.append([
                fecha_str,
                almacen_str,
                mov.producto.codigo,
                mov.producto.nombre,
                mov.tipo,
                mov.origen,
                float(mov.precio_unitario) if mov.precio_unitario else '',
                cantidad_str,
                float(mov.precio_compra_anterior) if mov.precio_compra_anterior else '',
                float(mov.precio_compra_nuevo) if mov.precio_compra_nuevo else '',
                float(mov.precio_venta_anterior) if mov.precio_venta_anterior else '',
                float(mov.precio_venta_nuevo) if mov.precio_venta_nuevo else '',
                float(mov.stock_anterior),
                float(mov.stock_nuevo),
                estado_str,
                mov.notas or '',
                usuario_str
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


# ═══════════════════════════════════════════════════════════════════════════════
#  ALMACENES / CAJAS
# ═══════════════════════════════════════════════════════════════════════════════

class AlmacenViewSet(SoloGerenteDestroyMixin, viewsets.ModelViewSet):
    """
    CRUD de Almacenes. Escritura solo para Gerentes.
    Los colaboradores pueden leer para saber a qué almacén están asignados.
    """
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre', 'es_general', 'creado_en']

    def get_queryset(self):
        return Almacen.objects.filter(activo=True).prefetch_related('stocks__producto')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AlmacenSerializer  # Con stocks detallados
        return AlmacenListSerializer  # Ligero para lista

    def perform_create(self, serializer):
        # Asignar empresa del usuario autenticado
        empresa = None
        try:
            empresa = self.request.user.perfil.empresa
        except AttributeError:
            pass
        serializer.save(empresa=empresa)

    def perform_update(self, serializer):
        if not (
            self.request.user.is_superuser
            or getattr(self.request.user.perfil, 'rol', '') == 'GERENTE'
        ):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Solo el Gerente puede modificar almacenes.')
        serializer.save()

    @action(detail=False, methods=['get'], url_path='mi-almacen')
    def mi_almacen(self, request):
        """
        Devuelve el almacén asignado al colaborador autenticado.
        Si es Gerente, devuelve el almacén general.
        """
        try:
            perfil = request.user.perfil
        except AttributeError:
            return Response({'error': 'Perfil no encontrado.'}, status=status.HTTP_400_BAD_REQUEST)

        if perfil.almacen:
            almacen = perfil.almacen
        else:
            # Fallback: almacén general de la empresa
            empresa = perfil.empresa
            almacen = Almacen.objects.filter(empresa=empresa, es_general=True).first()

        if not almacen:
            return Response({'error': 'No hay almacén asignado.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(AlmacenSerializer(almacen).data)


class StockAlmacenViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Vista de solo lectura del stock por almacén.
    El frontend usa esto para mostrar el stock disponible en el almacén del colaborador.
    """
    serializer_class = StockAlmacenSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['almacen', 'producto']
    search_fields = ['producto__nombre', 'producto__codigo']

    def get_queryset(self):
        return StockAlmacen.objects.select_related(
            'almacen', 'producto'
        ).filter(almacen__activo=True)


class TrasladoStockViewSet(viewsets.ModelViewSet):
    """
    Traslados de stock entre almacenes.
    - Escritura (POST): solo Gerentes.
    - Lectura: todos los autenticados.
    - DELETE: bloqueado (registro inmutable).
    - PUT/PATCH: bloqueado (registro inmutable).
    """
    serializer_class = TrasladoStockSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['tipo', 'producto', 'almacen_origen', 'almacen_destino']
    ordering_fields = ['fecha']

    def get_queryset(self):
        return TrasladoStock.objects.select_related(
            'producto', 'almacen_origen', 'almacen_destino', 'usuario'
        ).all()

    def create(self, request, *args, **kwargs):
        """Ejecutar traslado de forma atómica via TrasladoStock.ejecutar()."""
        # Solo Gerentes pueden crear traslados
        try:
            perfil = request.user.perfil
        except AttributeError:
            return Response({'error': 'Perfil no encontrado.'}, status=status.HTTP_403_FORBIDDEN)

        if not (request.user.is_superuser or perfil.rol == 'GERENTE'):
            return Response(
                {'error': 'Solo el Gerente puede realizar traslados de stock.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            traslado = TrasladoStock.ejecutar(
                tipo=data['tipo'],
                producto=data['producto'],
                origen=data.get('almacen_origen'),
                destino=data.get('almacen_destino'),
                cantidad=data['cantidad'],
                usuario=request.user,
                notas=data.get('notas', ''),
            )
        except ValidationError as e:
            return Response(
                {'error': str(e.message) if hasattr(e, 'message') else str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            TrasladoStockSerializer(traslado).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        return Response(
            {'error': 'Los traslados son registros inmutables y no pueden modificarse.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'error': 'Los traslados son registros contables inmutables. No se pueden eliminar.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
