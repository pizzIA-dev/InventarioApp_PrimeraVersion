from django.http import HttpResponse
from apps.core.export_utils import (
    get_period_range, get_period_label, create_excel_response,
    create_multi_sheet_excel_response
)
from apps.core.constants import RAZON_CANCELACION_SET
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
    DetalleVentaSerializer, MovimientoEstadoVentaSerializer, VentaKardexSerializer
)
from apps.core.mixins import SoloGerenteDestroyMixin


class VentaViewSet(SoloGerenteDestroyMixin, viewsets.ModelViewSet):
    queryset = Venta.objects.all().select_related('cliente').prefetch_related('detalleventa_set', 'detalleventa_set__producto')
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['estado', 'cliente']
    ordering_fields = ['-creado_en']
    pagination_class = None
    
    def get_serializer_class(self):
        if self.action == 'create':
            return VentaCreateSerializer
        elif self.action == 'partial_update' or self.action == 'update':
            return VentaUpdateSerializer
        return VentaSerializer
    
    def create(self, request, *args, **kwargs):
        # Extraer el ID del fiado si viene en la petición
        data = request.data.copy()
        origen_fiado_id = data.pop('origen_fiado_id', None)
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Si la venta proviene de un fiado, vincular y liquidar el fiado
        if origen_fiado_id:
            try:
                from apps.fiados.models import Fiado
                # origen_fiado_id could be a list if from form data or a single value
                fiado_id = origen_fiado_id[0] if isinstance(origen_fiado_id, list) else origen_fiado_id
                fiado = Fiado.objects.get(id=fiado_id)
                fiado.estado = 'LIQUIDADO'
                fiado.venta_ref = serializer.instance
                fiado.save()
                
            except Exception as e:
                print(f"Error al vincular fiado: {e}")
                
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['get'])
    def proximo_numero(self, request):
        """Calcula el siguiente número correlativo basado en todas las ventas del sistema"""
        tipo = request.query_params.get('tipo', 'SIMPLE')
        prefix_map = {
            'SIMPLE': 'SMP',
            'BOLETA': 'BOL',
            'FACTURA': 'FAC'
        }
        prefix = prefix_map.get(tipo, 'DOC')
        
        from apps.servicios.models import VentaServicio
        from django.db.models import Q
        
        # Filtros base
        if tipo == 'SIMPLE':
            q_v = Q(numero_comprobante_simple__startswith=f"{prefix}-")
            q_vs = Q(numero_comprobante_simple__startswith=f"{prefix}-")
        else:
            q_v = Q(numero_comprobante__startswith=f"{prefix}-")
            q_vs = Q(numero_comprobante__startswith=f"{prefix}-")
            
        # Obtener valores
        vals_v = Venta.objects.filter(q_v).values_list(
            'numero_comprobante_simple' if tipo == 'SIMPLE' else 'numero_comprobante', flat=True
        )
        vals_vs = VentaServicio.objects.filter(q_vs).values_list(
            'numero_comprobante_simple' if tipo == 'SIMPLE' else 'numero_comprobante', flat=True
        )
        
        nums = []
        for val in list(vals_v) + list(vals_vs):
            if val and '-' in val:
                try:
                    nums.append(int(val.split('-')[1]))
                except (IndexError, ValueError):
                    pass
        
        max_num = max(nums) if nums else 0
        next_val = f"{prefix}-{(max_num + 1):06d}"
        
        return Response({'proximo_numero': next_val})

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
        """
        Confirma una venta y registra la salida de stock.
        - Si el colaborador tiene almacén asignado, valida y descuenta de ese almacén.
        - Si no, descuenta del stock global como antes.
        Bloquea si algún producto no tiene stock suficiente.
        """
        from apps.inventario.models import Almacen, StockAlmacen
        from django.db.models import F

        venta = self.get_object()

        if venta.estado == 'CONFIRMADA':
            return Response(
                {'error': 'Esta venta ya está confirmada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Determinar almacén del colaborador ─────────────────────────────
        almacen_colaborador = None
        try:
            almacen_colaborador = request.user.perfil.almacen
        except AttributeError:
            pass

        # Si no tiene asignado, usar almacén general de la empresa
        if almacen_colaborador is None:
            try:
                empresa = request.user.perfil.empresa
                almacen_colaborador = Almacen.objects.filter(
                    empresa=empresa, es_general=True, activo=True
                ).first()
            except AttributeError:
                almacen_colaborador = None

        # ── Verificar stock antes de proceder ──────────────────────────────
        sin_stock = []
        detalles  = list(venta.detalleventa_set.select_related('producto').all())

        for detalle in detalles:
            producto = detalle.producto

            if almacen_colaborador:
                # Verificar vs StockAlmacen del colaborador
                sa = StockAlmacen.objects.filter(
                    almacen=almacen_colaborador, producto=producto
                ).first()
                disponible = sa.cantidad if sa else 0
            else:
                # Fallback: stock global
                disponible = producto.stock_actual

            if disponible < detalle.cantidad:
                sin_stock.append({
                    'producto_id':        producto.id,
                    'producto':           producto.nombre,
                    'almacen':            almacen_colaborador.nombre if almacen_colaborador else 'Stock global',
                    'stock_disponible':   float(disponible),
                    'cantidad_requerida': float(detalle.cantidad),
                    'faltante':           float(detalle.cantidad - disponible),
                })

        if sin_stock:
            return Response(
                {
                    'error': 'No se puede confirmar la venta: stock insuficiente en los siguientes productos.',
                    'almacen': almacen_colaborador.nombre if almacen_colaborador else 'Stock global',
                    'productos_sin_stock': sin_stock,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        # ───────────────────────────────────────────────────────────────────

        # Guardar referencia al almacén en la venta para reversión posterior
        if almacen_colaborador and not venta.almacen_id if hasattr(venta, 'almacen_id') else False:
            venta.almacen = almacen_colaborador

        venta.estado = 'CONFIRMADA'
        venta._skip_auto_historial = True
        venta.save()

        # Solo descontar stock si NO proviene de un fiado
        if not venta.fiado_origen.exists():
            venta.registrar_salida_stock(almacen=almacen_colaborador)

        # Registrar historial de confirmación
        from .models import MovimientoEstadoVenta
        now_str = timezone.localtime().strftime("%d/%m/%Y a las %H:%M:%S")
        notas_extra = f" (Almacén: {almacen_colaborador.nombre})" if almacen_colaborador else ''
        MovimientoEstadoVenta.objects.create(
            venta=venta,
            estado_anterior='BORRADOR',
            estado_nuevo='CONFIRMADA',
            notas=f'Venta confirmada el {now_str} por {request.user.username}{notas_extra}',
        )

        serializer = self.get_serializer(venta)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela una venta y revierte el stock si estaba confirmada.
        Requiere: razon_tag (obligatorio), razon_detalle (opcional).
        """
        venta = self.get_object()

        if venta.estado == 'CANCELADA':
            return Response(
                {'error': 'Esta venta ya se encuentra cancelada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validar razón obligatoria
        razon_tag = request.data.get('razon_tag', '').strip()
        razon_detalle = request.data.get('razon_detalle', '').strip()

        RAZON_VALIDA = RAZON_CANCELACION_SET
        if not razon_tag or razon_tag not in RAZON_VALIDA:
            return Response(
                {
                    'error': 'Debes indicar una razón de cancelación.',
                    'opciones': list(RAZON_VALIDA),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Determinar almacén del colaborador para revertir correctamente
        from apps.inventario.models import Almacen
        almacen_colaborador = None
        try:
            almacen_colaborador = request.user.perfil.almacen
            if almacen_colaborador is None:
                empresa = request.user.perfil.empresa
                almacen_colaborador = Almacen.objects.filter(
                    empresa=empresa, es_general=True, activo=True
                ).first()
        except AttributeError:
            pass

        if venta.estado == 'CONFIRMADA':
            venta.revertir_stock(almacen=almacen_colaborador)

        estado_anterior = venta.estado
        venta.estado = 'CANCELADA'
        venta._skip_auto_historial = True
        venta.save()

        # Registrar el motivo en el historial (inmutable)
        from .models import MovimientoEstadoVenta
        notas_extra = f" (Almacén: {almacen_colaborador.nombre})" if almacen_colaborador else ''
        MovimientoEstadoVenta.objects.create(
            venta=venta,
            estado_anterior=estado_anterior,
            estado_nuevo='CANCELADA',
            notas=f"{razon_detalle or razon_tag}{notas_extra}",
            razon_tag=razon_tag,
            razon_detalle=razon_detalle,
        )

        serializer = self.get_serializer(venta)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        """Si la venta estaba confirmada, revertimos el stock antes de eliminar"""
        if instance.estado == 'CONFIRMADA':
            instance.revertir_stock()
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

    @action(detail=True, methods=['get'])
    def history_estados(self, request, pk=None):
        """Historial de cambios de estado de una venta específica"""
        venta = self.get_object()
        queryset = venta.movimientos_estado.all()
        
        # Filtros de fecha si se proporcionan
        desde = request.query_params.get('fecha_desde')
        hasta = request.query_params.get('fecha_hasta')
        if desde:
            queryset = queryset.filter(fecha__date__gte=desde)
        if hasta:
            queryset = queryset.filter(fecha__date__lte=hasta)
            
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
            
        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        movimientos = queryset[start:end]

        serializer = MovimientoEstadoVentaSerializer(movimientos, many=True)
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if page_size > 0 else 1,
            'results': serializer.data
        })

    @action(detail=True, methods=['get'])
    def kardex_productos(self, request, pk=None):
        """Detalle de productos de una venta específica (formato Kardex)"""
        venta = self.get_object()
        queryset = venta.detalleventa_set.all().select_related('producto', 'venta')
        
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
            
        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        detalles = queryset[start:end]

        serializer = VentaKardexSerializer(detalles, many=True)
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if page_size > 0 else 1,
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def kardex_global_productos(self, request):
        """Kardex global de todos los productos vendidos"""
        queryset = DetalleVenta.objects.all().select_related('producto', 'venta', 'venta__cliente').order_by('-venta__creado_en')
        
        # Filtros
        desde = request.query_params.get('fecha_desde')
        hasta = request.query_params.get('fecha_hasta')
        cliente = request.query_params.get('cliente')
        producto = request.query_params.get('producto')
        
        if desde:
            queryset = queryset.filter(venta__creado_en__date__gte=desde)
        if hasta:
            queryset = queryset.filter(venta__creado_en__date__lte=hasta)
        if cliente:
            queryset = queryset.filter(venta__cliente_id=cliente)
        if producto:
            queryset = queryset.filter(producto_id=producto)
            
        # Solo ventas confirmadas para el Kardex global
        queryset = queryset.filter(venta__estado='CONFIRMADA')
            
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
            
        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        detalles = queryset[start:end]

        serializer = VentaKardexSerializer(detalles, many=True)
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if page_size > 0 else 1,
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def exportar(self, request):
        """Exportar ventas a Excel con filtro de período"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.filter_queryset(self.get_queryset()).prefetch_related('detalleventa_set')

        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(creado_en__date__gte=date_from, creado_en__date__lte=date_to)

        headers = [
            'ID', 'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente', 'Estado',
            'Subtotal (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable'
        ]
        rows = []
        for obj in queryset.order_by('-creado_en'):
            tipo_comprobante = obj.tipo_comprobante
            legal_tipo = tipo_comprobante if tipo_comprobante and tipo_comprobante != 'SIMPLE' else ""
            legal_num = obj.numero_comprobante if legal_tipo else ""
            
            # Calcular Subtotal Bruto y Descuento Total (Línea + Global)
            detalles = obj.detalleventa_set.all()
            gross_subtotal = sum(float(d.cantidad) * float(d.precio_venta) for d in detalles)
            total_row_discounts = sum(float(d.descuento) for d in detalles)
            total_descuento = float(obj.descuento) + total_row_discounts

            usuario_str = f"{obj.usuario.get_full_name() or obj.usuario.username} ({obj.usuario.perfil.get_rol_display() if hasattr(obj.usuario, 'perfil') else '-'})" if obj.usuario else "Sistema"
            rows_ventas_item = [
                obj.id,
                timezone.localtime(obj.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE",
                obj.numero_comprobante_simple or "",
                legal_tipo,
                legal_num,
                obj.cliente_nombre or (obj.cliente.nombre if obj.cliente else 'Sin Cliente'),
                obj.get_estado_display(),
                gross_subtotal,
                total_descuento,
                float(obj.impuesto),
                float(obj.total),
                usuario_str
            ]
            rows.append(rows_ventas_item)

        period_label = get_period_label(periodo, anio)
        return create_excel_response(
            filename=f'ventas_{periodo}{"_" + str(anio) if anio else ""}.xlsx',
            sheet_name='Ventas',
            headers=headers,
            rows=rows,
            title='Historial de Ventas',
            period_label=period_label
        )

    @action(detail=True, methods=['get'])
    def exportar_historial(self, request, pk=None):
        """Exporta el historial de una venta en formato Excel multi-hoja"""
        venta = self.get_object()

        # Sheet 1: Estados
        estados = venta.movimientos_estado.all().order_by('-fecha')
        headers_estados = [
            'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente',
            'Estado Anterior', 'Estado Nuevo', 'Notas', 'Responsable'
        ]
        
        tipo_c = venta.tipo_comprobante
        l_tipo = tipo_c if tipo_c and tipo_c != 'SIMPLE' else ""
        l_num = venta.numero_comprobante if l_tipo else ""
        comp_cliente = venta.cliente_nombre or (venta.cliente.nombre if venta.cliente else 'Sin Cliente')

        rows_estados = [
            [
                timezone.localtime(e.fecha).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE",
                venta.numero_comprobante_simple or "",
                l_tipo,
                l_num,
                comp_cliente,
                e.estado_anterior,
                e.estado_nuevo,
                e.notas,
                f"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})" if e.usuario else "Sistema"
            ] for e in estados
        ]

        # Sheet 2: Productos
        detalles = venta.detalleventa_set.all().select_related('producto').order_by('id')
        headers_productos = [
            'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente',
            'Producto', 'Código', 'Cant.', 'P. Unit. (S/.)', 'Subtotal (S/.)', 'Desc. (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable'
        ]
        
        comp_fecha = timezone.localtime(venta.creado_en).strftime("%d/%m/%Y %H:%M:%S")
        comp_simple_tipo = "COMPROBANTE SIMPLE"
        comp_simple_num = venta.numero_comprobante_simple or ""
        
        # Logic for legal voucher
        tipo_comprobante = venta.tipo_comprobante
        legal_tipo = tipo_comprobante if tipo_comprobante and tipo_comprobante != 'SIMPLE' else ""
        legal_num = venta.numero_comprobante if legal_tipo else ""
        
        comp_cliente = venta.cliente_nombre or (venta.cliente.nombre if venta.cliente else 'Cliente General')

        rows_productos = [
            [
                comp_fecha,
                comp_simple_tipo,
                comp_simple_num,
                legal_tipo,
                legal_num,
                comp_cliente,
                d.producto.nombre,
                d.producto.codigo,
                float(d.cantidad),
                float(d.precio_venta),
                float(d.cantidad) * float(d.precio_venta),
                float(d.descuento),
                float(venta.impuesto),
                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(venta.impuesto),
                f"{venta.usuario.get_full_name() or venta.usuario.username} ({venta.usuario.perfil.get_rol_display() if hasattr(venta.usuario, 'perfil') else '-'})" if venta.usuario else "Sistema"
            ] for d in detalles
        ]

        sheets_data = [
            {
                'sheet_name': 'Historial de Estados',
                'headers': headers_estados,
                'rows': rows_estados,
                'title': f'Historial de Estados - Venta {venta.numero_comprobante_simple or venta.id}',
                'period_label': 'Historial Completo'
            },
            {
                'sheet_name': 'Detalle de Venta de Productos',
                'headers': headers_productos,
                'rows': rows_productos,
                'title': f'Detalle de Venta de Productos - Venta {venta.numero_comprobante_simple or venta.id}',
                'period_label': 'Historial Completo'
            }
        ]

        return create_multi_sheet_excel_response(
            filename=f'historial_venta_{venta.numero_comprobante_simple or venta.id}.xlsx',
            sheets_data=sheets_data
        )

    @action(detail=False, methods=['get'])
    def exportar_historial_global(self, request):
        """Exporta el historial global de ventas de productos en formato Excel multi-hoja"""
        cliente = request.query_params.get('cliente')
        producto = request.query_params.get('producto')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        # Filter sales by confirmed status and period
        ventas_qs = Venta.objects.filter(estado='CONFIRMADA')
        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            ventas_qs = ventas_qs.filter(creado_en__date__gte=date_from, creado_en__date__lte=date_to)
        
        if fecha_desde:
            ventas_qs = ventas_qs.filter(creado_en__date__gte=fecha_desde)
        if fecha_hasta:
            ventas_qs = ventas_qs.filter(creado_en__date__lte=fecha_hasta)
        if cliente:
            ventas_qs = ventas_qs.filter(cliente_id=cliente)

        # Get relevant movimientos through filtered sales
        venta_ids = ventas_qs.values_list('id', flat=True)
        
        # Sheet 1: Estados
        from .models import MovimientoEstadoVenta
        estados_qs = MovimientoEstadoVenta.objects.filter(venta_id__in=venta_ids).select_related('venta', 'venta__cliente').order_by('-fecha')
        
        headers_estados = [
            'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente',
            'Estado Anterior', 'Estado Nuevo', 'Notas', 'Responsable'
        ]
        rows_estados = []
        for e in estados_qs:
            v = e.venta
            comp_cliente = v.cliente_nombre or (v.cliente.nombre if v.cliente else 'Cliente General')
            tipo_c = v.tipo_comprobante
            l_tipo = tipo_c if tipo_c and tipo_c != 'SIMPLE' else ""
            l_num = v.numero_comprobante if l_tipo else ""
            
            rows_estados.append([
                timezone.localtime(e.fecha).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE",
                v.numero_comprobante_simple or "",
                l_tipo,
                l_num,
                comp_cliente,
                e.estado_anterior,
                e.estado_nuevo,
                e.notas,
                f"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})" if e.usuario else "Sistema"
            ])

        # Sheet 2: Productos
        detalles_qs = DetalleVenta.objects.filter(venta_id__in=venta_ids).select_related('producto', 'venta', 'venta__cliente').order_by('-venta__creado_en')
        if producto:
            detalles_qs = detalles_qs.filter(producto_id=producto)

        headers_productos = [
            'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente',
            'Producto', 'Código', 'Cant.', 'P. Unit. (S/.)', 'Subtotal (S/.)', 'Desc. (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable'
        ]
        rows_productos = []
        for d in detalles_qs:
            v = d.venta
            comp_simple_num = v.numero_comprobante_simple or ""
            tipo_comprobante = v.tipo_comprobante
            legal_tipo = tipo_comprobante if tipo_comprobante and tipo_comprobante != 'SIMPLE' else ""
            legal_num = v.numero_comprobante if legal_tipo else ""
            comp_cliente = v.cliente_nombre or (v.cliente.nombre if v.cliente else 'Cliente General')

            rows_productos.append([
                timezone.localtime(v.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE",
                comp_simple_num,
                legal_tipo,
                legal_num,
                comp_cliente,
                d.producto.nombre,
                d.producto.codigo,
                float(d.cantidad),
                float(d.precio_venta),
                float(d.cantidad) * float(d.precio_venta),
                float(d.descuento),
                float(v.impuesto),
                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto),
                f"{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})" if v.usuario else "Sistema"
            ])

        period_label = get_period_label(periodo, anio)
        if fecha_desde or fecha_hasta:
            period_label = f"{fecha_desde or 'Inicio'} al {fecha_hasta or 'Hoy'}"

        sheets_data = [
            {
                'sheet_name': 'Historial de Estados',
                'headers': headers_estados,
                'rows': rows_estados,
                'title': 'Historial Global de Estados de Ventas',
                'period_label': period_label
            },
            {
                'sheet_name': 'Detalle de Venta de Productos',
                'headers': headers_productos,
                'rows': rows_productos,
                'title': 'Detalle Global de Venta de Productos (Kardex)',
                'period_label': period_label
            }
        ]

        return create_multi_sheet_excel_response(
            filename=f'historial_global_ventas_{periodo}{"_" + str(anio) if anio else ""}.xlsx',
            sheets_data=sheets_data
        )


class DetalleVentaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DetalleVenta.objects.all().select_related('producto', 'venta')
    serializer_class = DetalleVentaSerializer
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['venta', 'producto']
    ordering_fields = ['producto__nombre']
