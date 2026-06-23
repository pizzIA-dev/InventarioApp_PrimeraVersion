from apps.core.renderers import PassthroughRenderer
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
from django.db.models import Sum, Count
from django.utils import timezone
from .models import CategoriaServicio, Servicio, VentaServicio, MovimientoServicio, ServicioContratado
from .serializers import (ServicioContratadoSerializer,
    CategoriaServicioSerializer,
    ServicioSerializer, ServicioCreateSerializer,
    VentaServicioSerializer, VentaServicioCreateSerializer,
    MovimientoEstadoVentaServicioSerializer,
    MovimientoServicioSerializer
)
from apps.core.mixins import SoloGerenteDestroyMixin


class CategoriaServicioViewSet(SoloGerenteDestroyMixin, viewsets.ModelViewSet):
    queryset = CategoriaServicio.objects.all()
    serializer_class = CategoriaServicioSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()


class ServicioViewSet(SoloGerenteDestroyMixin, viewsets.ModelViewSet):
    queryset = Servicio.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['nombre', 'descripcion']
    filterset_fields = ['categoria', 'activo']
    ordering_fields = ['nombre', 'precio_base', 'creado_en']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ServicioCreateSerializer
        return ServicioSerializer
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Obtiene resumen de servicios"""
        servicios_activos = self.queryset
        
        total_servicios = servicios_activos.count()
        
        # Servicios más vendidos
        servicios_stats = VentaServicio.objects.filter(
            estado='TERMINADO'
        ).values('servicio__nombre').annotate(
            total_ventas=Count('id'),
            total_ingresos=Sum('total')
        ).order_by('-total_ventas')[:5]
        
        return Response({
            'total_servicios': total_servicios,
            'servicios_mas_vendidos': list(servicios_stats)
        })

    @action(detail=False, methods=['get'], renderer_classes=[PassthroughRenderer])
    def exportar(self, request):
        """Exportar catálogo de servicios a Excel"""
        queryset = self.filter_queryset(self.get_queryset())
        
        def translate_duration_python(total_minutes):
            if total_minutes is None:
                return 'No definida'
            if total_minutes == 0:
                return '0 min'
            
            parts = []
            remainder = total_minutes
            units = [
                ('mes', 'meses', 43200),
                ('sem', 'sem', 10080),
                ('día', 'días', 1440),
                ('h', 'h', 60),
                ('min', 'min', 1),
            ]
            
            for label, label_plural, multiplier in units:
                value = remainder // multiplier
                if value > 0:
                    parts.append(f"{value} {label if value == 1 else label_plural}")
                    remainder %= multiplier
            
            return ', '.join(parts) or '0 min'

        headers = ['ID', 'Nombre', 'Categoría', 'Descripción', 'Costo de Servicio (S/.)', 'Precio de Servicio (S/.)', 'Margen (S/.)', 'Duración', 'Estado', 'Fecha Creación', 'Última Modificación', 'Responsable']
        rows = []
        for obj in queryset:
            # Get latest movement to find the responsible user
            last_mov = obj.movimientos.order_by('-fecha').first()
            usuario_str = f"{last_mov.usuario.get_full_name() or last_mov.usuario.username} ({last_mov.usuario.perfil.get_rol_display() if hasattr(last_mov.usuario, 'perfil') else '-'})" if last_mov and last_mov.usuario else "Sistema"

            rows.append([
                obj.id,
                obj.nombre,
                obj.categoria.nombre if obj.categoria else 'Sin categoría',
                obj.descripcion or '',
                float(obj.costo),
                float(obj.precio_base),
                float(obj.margen_ganancia),
                translate_duration_python(obj.duracion_minutos),
                'Activo' if obj.activo else 'Inactivo',
                obj.creado_en.strftime("%d/%m/%Y %H:%M:%S"),
                obj.actualizado_en.strftime("%d/%m/%Y %H:%M:%S"),
                usuario_str
            ])

        return create_excel_response(
            filename='catalogo_servicios.xlsx',
            sheet_name='Catálogo de Servicios',
            headers=headers,
            rows=rows,
            title='Catálogo de Servicios de la Empresa',
            period_label='Historial Completo'
        )

    @action(detail=True, methods=['get'])
    def kardex(self, request, pk=None):
        """Historial de movimientos de un servicio específico"""
        servicio = self.get_object()
        queryset = servicio.movimientos.all()
        
        # Filtros de fecha si se proporcionan
        desde = request.query_params.get('fecha_desde')
        hasta = request.query_params.get('fecha_hasta')
        if desde:
            queryset = queryset.filter(fecha__date__gte=desde)
        if hasta:
            queryset = queryset.filter(fecha__date__lte=hasta)
            
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = MovimientoServicioSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = MovimientoServicioSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], renderer_classes=[PassthroughRenderer])
    def exportar_kardex(self, request, pk=None):
        """Exportar historial de movimientos de un servicio a Excel"""
        servicio = self.get_object()
        queryset = servicio.movimientos.all()
        
        # Filtros de fecha si se proporcionan
        desde = request.query_params.get('fecha_desde')
        hasta = request.query_params.get('fecha_hasta')
        if desde:
            queryset = queryset.filter(fecha__date__gte=desde)
        if hasta:
            queryset = queryset.filter(fecha__date__lte=hasta)

        headers = ['Fecha', 'Tipo', 'Costo de Servicio Anterior (S/.)', 'Costo de Servicio Nuevo (S/.)', 'Precio de Servicio Anterior (S/.)', 'Precio de Servicio Nuevo (S/.)', 'Estado', 'Notas', 'Responsable']
        rows = []
        for mv in queryset:
            fecha_str = mv.fecha.strftime("%d/%m/%Y %H:%M:%S")
            
            if mv.activo_nuevo is True:
                estado_str = f"Activo desde {fecha_str}"
            elif mv.activo_nuevo is False:
                estado_str = f"Inactivo desde {fecha_str}"
            else:
                estado_str = '-'
                
            usuario_str = f"{mv.usuario.get_full_name() or mv.usuario.username} ({mv.usuario.perfil.get_rol_display() if hasattr(mv.usuario, 'perfil') else '-'})" if hasattr(mv, 'usuario') and mv.usuario else "Sistema"

                
            rows.append([
                fecha_str,
                mv.get_tipo_display(),
                float(mv.costo_anterior) if mv.costo_anterior is not None else '-',
                float(mv.costo_nuevo),
                float(mv.precio_anterior) if mv.precio_anterior is not None else '-',
                float(mv.precio_nuevo),
                estado_str,
                mv.notas or '',
                usuario_str
            ])

        return create_excel_response(
            filename=f'kardex_{servicio.nombre.replace(" ", "_")}.xlsx',
            sheet_name='Kardex de Servicio',
            headers=headers,
            rows=rows,
            title=f'Historial de Movimientos: {servicio.nombre}',
            period_label=f'Desde: {desde or "Inicio"} Hasta: {hasta or "Hoy"}'
        )

    @action(detail=False, methods=['get'], renderer_classes=[PassthroughRenderer])
    def exportar_historial_global(self, request):
        """Exportar el diario de movimientos global de todos los servicios con filtro de período"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = MovimientoServicio.objects.all().select_related('servicio')
        
        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(fecha__date__gte=date_from, fecha__date__lte=date_to)

        headers = ['Fecha', 'Servicio', 'Descripción', 'Tipo', 'Costo Anterior (S/.)', 'Costo Nuevo (S/.)', 'Precio Anterior (S/.)', 'Precio Nuevo (S/.)', 'Estado', 'Notas', 'Responsable']
        rows = []
        for mv in queryset:
            fecha_str = mv.fecha.strftime("%d/%m/%Y %H:%M:%S")
            
            if mv.activo_nuevo is True:
                estado_str = f"Activo desde {fecha_str}"
            elif mv.activo_nuevo is False:
                estado_str = f"Inactivo desde {fecha_str}"
            else:
                estado_str = '-'
                
            usuario_str = f"{mv.usuario.get_full_name() or mv.usuario.username} ({mv.usuario.perfil.get_rol_display() if hasattr(mv.usuario, 'perfil') else '-'})" if hasattr(mv, 'usuario') and mv.usuario else "Sistema"


            rows.append([
                fecha_str,
                mv.servicio.nombre,
                mv.servicio.descripcion or '',
                mv.get_tipo_display(),
                float(mv.costo_anterior) if mv.costo_anterior is not None else '-',
                float(mv.costo_nuevo),
                float(mv.precio_anterior) if mv.precio_anterior is not None else '-',
                float(mv.precio_nuevo),
                estado_str,
                mv.notas or '',
                usuario_str
            ])

        period_label = get_period_label(periodo, anio)
        return create_excel_response(
            filename='diario_movimientos_servicios.xlsx',
            sheet_name='Diario de Movimientos',
            headers=headers,
            rows=rows,
            title='Diario Global de Movimientos de Servicios',
            period_label=period_label
        )


class VentaServicioViewSet(SoloGerenteDestroyMixin, viewsets.ModelViewSet):
    queryset = VentaServicio.objects.all().select_related('servicio', 'cliente')
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['estado', 'servicio', 'cliente']
    ordering_fields = ['-creado_en']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return VentaServicioCreateSerializer
        return VentaServicioSerializer
        
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        origen_fiado_id = data.pop('origen_fiado_id', None)
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        if origen_fiado_id:
            try:
                from apps.fiados.models import Fiado
                fiado_id = origen_fiado_id[0] if isinstance(origen_fiado_id, list) else origen_fiado_id
                fiado = Fiado.objects.get(id=fiado_id)
                fiado.estado = 'LIQUIDADO'
                fiado.venta_servicio_ref = serializer.instance
                fiado.save()
            except Exception as e:
                print(f"Error al vincular fiado: {e}")
                
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    
    @action(detail=True, methods=['post'])
    def completar(self, request, pk=None):
        """Completa un servicio"""
        venta_servicio = self.get_object()
        venta_servicio.terminar()
        
        serializer = self.get_serializer(venta_servicio)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def iniciar(self, request, pk=None):
        """Inicia un servicio"""
        venta_servicio = self.get_object()
        venta_servicio.iniciar()
        
        serializer = self.get_serializer(venta_servicio)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela un servicio. Requiere: razon_tag (obligatorio), razon_detalle (opcional)."""
        venta_servicio = self.get_object()

        if venta_servicio.estado == 'CANCELADO':
            return Response(
                {'error': 'Este servicio ya se encuentra cancelado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        razon_tag = request.data.get('razon_tag', '').strip()
        razon_detalle = request.data.get('razon_detalle', '').strip()
        RAZON_VALIDA = RAZON_CANCELACION_SET
        if not razon_tag or razon_tag not in RAZON_VALIDA:
            return Response(
                {'error': 'Debes indicar una razón de cancelación.', 'opciones': list(RAZON_VALIDA)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        estado_anterior = venta_servicio.estado
        venta_servicio.estado = 'CANCELADO'
        venta_servicio.save()

        # Registrar motivo en historial (inmutable)
        from apps.servicios.models import MovimientoEstadoVentaServicio
        MovimientoEstadoVentaServicio.objects.create(
            venta_servicio=venta_servicio,
            estado_anterior=estado_anterior,
            estado_nuevo='CANCELADO',
            notas=razon_detalle or razon_tag,
            razon_tag=razon_tag,
            razon_detalle=razon_detalle,
        )

        serializer = self.get_serializer(venta_servicio)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def history_estados(self, request, pk=None):
        """Historial de cambios de estado de un servicio específico"""
        venta_servicio = self.get_object()
        queryset = venta_servicio.movimientos_estado.all()
        
        # Filtros de fecha si se proporcionan
        desde = request.query_params.get('fecha_desde')
        hasta = request.query_params.get('fecha_hasta')
        if desde:
            queryset = queryset.filter(fecha__date__gte=desde)
        if hasta:
            queryset = queryset.filter(fecha__date__lte=hasta)
            
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = MovimientoEstadoVentaServicioSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = MovimientoEstadoVentaServicioSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def history_detalle(self, request, pk=None):
        """Detalle técnico de una venta de servicio específica para la tabla de historial"""
        venta = self.get_object()
        
        tipo_c = venta.tipo_comprobante
        l_tipo = tipo_c if tipo_c and tipo_c != 'SIMPLE' else ""
        l_num = venta.numero_comprobante if l_tipo else ""
        comp_cliente = venta.cliente_nombre or (venta.cliente.nombre if venta.cliente else 'Sin Cliente')
        
        data = [{
            'fecha': venta.creado_en,
            'tipo_comprobante_simple': 'COMPROBANTE SIMPLE',
            'numero_comprobante_simple': venta.numero_comprobante_simple or "",
            'tipo_comprobante': l_tipo,
            'comprobante': l_num,
            'cliente': comp_cliente,
            'servicio': venta.servicio_nombre or (venta.servicio.nombre if venta.servicio else 'Sin Servicio'),
            'precio': float(venta.precio),
            'descuento': float(venta.descuento),
            'impuesto': float(venta.impuesto),
            'total': float(venta.total)
        }]
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Obtiene resumen de ventas de servicios"""
        ventas_completadas = self.queryset.filter(estado='TERMINADO')
        
        total_ventas = ventas_completadas.count()
        monto_total = sum(v.total for v in ventas_completadas)
        
        # Servicios pendientes
        pendientes = self.queryset.filter(estado='PENDIENTE').count()
        en_progreso = self.queryset.filter(estado='EN_PROGRESO').count()
        
        return Response({
            'total_ventas': total_ventas,
            'monto_total': monto_total,
            'pendientes': pendientes,
            'en_progreso': en_progreso
        })

    @action(detail=False, methods=['get'], renderer_classes=[PassthroughRenderer])
    def exportar(self, request):
        """Exportar ventas de servicios a Excel con filtro de período"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.filter_queryset(self.get_queryset())

        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(creado_en__date__gte=date_from, creado_en__date__lte=date_to)

        headers = [
            'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente', 'F. Programada',
            'Servicio', 'Precio Serv. (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable'
        ]
        rows = []
        for obj in queryset.order_by('-creado_en'):
            tipo_c = obj.tipo_comprobante
            l_tipo = tipo_c if tipo_c and tipo_c != 'SIMPLE' else ""
            l_num = obj.numero_comprobante if l_tipo else ""
            comp_cliente = obj.cliente_nombre or (obj.cliente.nombre if obj.cliente else 'Sin Cliente')
            
            usuario_str = f"{obj.usuario.get_full_name() or obj.usuario.username} ({obj.usuario.perfil.get_rol_display() if hasattr(obj.usuario, 'perfil') else '-'})" if obj.usuario else "Sistema"

            rows.append([
                timezone.localtime(obj.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE",
                obj.numero_comprobante_simple or "",
                l_tipo,
                l_num,
                comp_cliente,
                timezone.localtime(obj.fecha_programada).strftime("%d/%m/%Y %H:%M:%S") if obj.fecha_programada else "-",
                obj.servicio_nombre or (obj.servicio.nombre if obj.servicio else 'Sin Servicio'),
                float(obj.precio),
                float(obj.descuento),
                float(obj.impuesto),
                float(obj.precio) - float(obj.descuento) + float(obj.impuesto),
                usuario_str
            ])

        period_label = get_period_label(periodo, anio)
        return create_excel_response(
            filename=f'ventas_servicios_{periodo}.xlsx',
            sheet_name='Ventas de Servicios',
            headers=headers,
            rows=rows,
            title='Historial de Ventas de Servicios',
            period_label=period_label
        )

    @action(detail=True, methods=['get'], renderer_classes=[PassthroughRenderer])
    def exportar_historial(self, request, pk=None):
        """Exporta el historial de una venta de servicio en formato Excel multi-hoja"""
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
                f"{getattr(e.usuario, 'get_full_name', lambda: '')() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})" if e.usuario else "Sistema"
            ] for e in estados
        ]

        # Sheet 2: Detalle de Venta de Servicio
        headers_detalle = [
            'Fecha/Hora', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente', 'F. Programada',
            'Servicio', 'Precio Serv. (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable'
        ]
        
        comp_fecha = timezone.localtime(venta.creado_en).strftime("%d/%m/%Y %H:%M:%S")
        
        rows_detalle = [
            [
                comp_fecha,
                "COMPROBANTE SIMPLE",
                venta.numero_comprobante_simple or "",
                l_tipo,
                l_num,
                comp_cliente,
                timezone.localtime(venta.fecha_programada).strftime("%d/%m/%Y %H:%M:%S") if venta.fecha_programada else "-",
                venta.servicio_nombre or (venta.servicio.nombre if venta.servicio else 'Sin Servicio'),
                float(venta.precio),
                float(venta.descuento),
                float(venta.impuesto),
                float(venta.precio) - float(venta.descuento) + float(venta.impuesto),
                f"{getattr(venta.usuario, 'get_full_name', lambda: '')() or venta.usuario.username} ({venta.usuario.perfil.get_rol_display() if hasattr(venta.usuario, 'perfil') else '-'})" if venta.usuario else "Sistema"
            ]
        ]

        sheets_data = [
            {
                'sheet_name': 'Historial de Estados',
                'headers': headers_estados,
                'rows': rows_estados,
                'title': f'Historial de Estados - Venta de Servicio {venta.numero_comprobante_simple or venta.id}',
                'period_label': 'Historial Completo'
            },
            {
                'sheet_name': 'Detalle de Venta de Servicio',
                'headers': headers_detalle,
                'rows': rows_detalle,
                'title': f'Detalle de Venta de Servicio - Venta {venta.numero_comprobante_simple or venta.id}',
                'period_label': 'Historial Completo'
            }
        ]

        return create_multi_sheet_excel_response(
            filename=f'historial_servicio_{venta.numero_comprobante_simple or venta.id}.xlsx',
            sheets_data=sheets_data
        )

    @action(detail=False, methods=['get'], renderer_classes=[PassthroughRenderer])
    def exportar_historial_global(self, request):
        """Exporta el historial global de ventas de servicios (Estados y Detalle)"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.get_queryset()
        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(creado_en__date__gte=date_from, creado_en__date__lte=date_to)

        # Sheet 1: Historial de Estados Global
        from apps.servicios.models import MovimientoEstadoVentaServicio
        estados = MovimientoEstadoVentaServicio.objects.filter(venta_servicio__in=queryset).order_by('-fecha')
        
        headers_estados = [
            'Fecha', 'Comprobante Simple', 'Comprobante', 'Cliente',
            'Estado Anterior', 'Estado Nuevo', 'Notas', 'Responsable'
        ]
        
        rows_estados = []
        for e in estados:
            v = e.venta_servicio
            tipo_c = v.tipo_comprobante
            l_tipo = tipo_c if tipo_c and tipo_c != 'SIMPLE' else ""
            l_num = v.numero_comprobante if l_tipo else ""
            comp_cliente = v.cliente_nombre or (v.cliente.nombre if v.cliente else 'Sin Cliente')
            
            rows_estados.append([
                timezone.localtime(e.fecha).strftime("%d/%m/%Y %H:%M:%S"),
                v.numero_comprobante_simple or "",
                f"{l_tipo} {l_num}".strip(),
                comp_cliente,
                e.estado_anterior,
                e.estado_nuevo,
                e.notas,
                f"{getattr(e.usuario, 'get_full_name', lambda: '')() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})" if e.usuario else "Sistema"
            ])

        # Sheet 2: Detalle de Venta de Servicios Global
        headers_detalle = [
            'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente', 'F. Programada', 'Servicio', 
            'Precio Serv. (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable'
        ]
        
        rows_detalle = []
        for v in queryset.order_by('-creado_en'):
            tipo_c = v.tipo_comprobante
            l_tipo = tipo_c if tipo_c and tipo_c != 'SIMPLE' else ""
            l_num = v.numero_comprobante if l_tipo else ""
            comp_cliente = v.cliente_nombre or (v.cliente.nombre if v.cliente else 'Sin Cliente')
            
            rows_detalle.append([
                timezone.localtime(v.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                'COMPROBANTE SIMPLE',
                v.numero_comprobante_simple or "",
                l_tipo,
                l_num,
                comp_cliente,
                timezone.localtime(v.fecha_programada).strftime("%d/%m/%Y %H:%M:%S") if v.fecha_programada else "-",
                v.servicio_nombre or (v.servicio.nombre if v.servicio else 'Sin Servicio'),
                float(v.precio),
                float(v.descuento),
                float(v.impuesto),
                float(v.precio) - float(v.descuento) + float(v.impuesto),
                f"{getattr(v.usuario, 'get_full_name', lambda: '')() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})" if v.usuario else "Sistema"
            ])

        period_label = get_period_label(periodo, anio)
        sheets_data = [
            {
                'sheet_name': 'Historial de Estados',
                'headers': headers_estados,
                'rows': rows_estados,
                'title': 'Historial Global de Estados - Ventas de Servicios',
                'period_label': period_label
            },
            {
                'sheet_name': 'Detalle de Ventas',
                'headers': headers_detalle,
                'rows': rows_detalle,
                'title': 'Detalle Global de Ventas de Servicios',
                'period_label': period_label
            }
        ]

        return create_multi_sheet_excel_response(
            filename=f'historial_global_servicios_{periodo}.xlsx',
            sheets_data=sheets_data
        )



from .models import CompraServicio, MovimientoEstadoCompraServicio
from .serializers import CompraServicioSerializer, CompraServicioCreateSerializer, MovimientoEstadoCompraServicioSerializer

class CompraServicioViewSet(SoloGerenteDestroyMixin, viewsets.ModelViewSet):
    queryset = CompraServicio.objects.all().select_related('servicio', 'proveedor')
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['servicio', 'proveedor', 'estado']
    ordering_fields = ['creado_en', 'fecha_programada', 'total']
    ordering = ['-creado_en']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CompraServicioCreateSerializer
        return CompraServicioSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if getattr(self, 'swagger_fake_view', False):
            return queryset.none()
        if self.request.user.is_authenticated:
            return queryset.filter(empresa=self.request.user.perfil.empresa)
        return queryset.none()

    def perform_create(self, serializer):
        serializer.save(empresa=self.request.user.perfil.empresa)

    @action(detail=True, methods=['post'])
    def iniciar(self, request, pk=None):
        compra = self.get_object()
        if compra.estado != 'PENDIENTE':
            return Response(
                {"error": "Solo se pueden iniciar compras pendientes"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        compra.iniciar()
        return Response({'status': 'Compra de servicio en progreso'})

    @action(detail=True, methods=['post'])
    def completar(self, request, pk=None):
        compra = self.get_object()
        if compra.estado == 'CANCELADO':
            return Response(
                {"error": "No se puede completar una compra cancelada"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        compra.completar()
        return Response({'status': 'Compra de servicio completada'})

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        compra = self.get_object()
        if compra.estado in ['TERMINADO', 'CANCELADO']:
            return Response(
                {"error": "No se puede cancelar en este estado"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        razon_tag = request.data.get('razon_tag')
        razon_detalle = request.data.get('razon_detalle', '')
        
        if not razon_tag or razon_tag not in RAZON_CANCELACION_SET:
            return Response(
                {"error": f"razon_tag es requerido y debe ser uno de: {', '.join(RAZON_CANCELACION_SET)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_estado = compra.estado
        compra.estado = 'CANCELADO'
        compra.save()
        
        MovimientoEstadoCompraServicio.objects.create(
            compra_servicio=compra,
            estado_anterior=old_estado,
            estado_nuevo='CANCELADO',
            notas=f'Compra cancelada. Razón: {razon_tag}. Detalle: {razon_detalle}',
            razon_tag=razon_tag,
            razon_detalle=razon_detalle
        )
        
        return Response({'status': 'Compra cancelada'})
    @action(detail=False, methods=['get'], renderer_classes=[PassthroughRenderer])
    def exportar(self, request):
        """Exportar compras de servicios a Excel con filtro de período"""
        from django.utils import timezone
        import datetime
        from apps.core.export_utils import create_excel_response
        
        queryset = self.filter_queryset(self.get_queryset())
        
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        
        if fecha_inicio and fecha_fin:
            try:
                start_date = datetime.datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
                end_date = datetime.datetime.strptime(fecha_fin, '%Y-%m-%d').date()
                queryset = queryset.filter(
                    creado_en__date__gte=start_date,
                    creado_en__date__lte=end_date
                )
            except ValueError:
                pass
                
        data_rows = []
        for c in queryset:
            data_rows.append([
                c.creado_en.strftime('%Y-%m-%d %H:%M'),
                str(c.numero_comprobante or c.id),
                str(c.servicio_nombre or 'Servicio sin nombre'),
                str(c.proveedor_nombre or 'Proveedor General'),
                str('General'),
                c.estado,
                float(c.precio or 0),
                float(c.descuento or 0),
                float(c.impuesto or 0),
                float(c.total or 0)
            ])
            
        return create_excel_response(
            filename='compras_servicios.xlsx',
            headers=['Fecha', 'Comprobante', 'Servicio', 'Proveedor', 'Almacén', 'Estado', 'Precio Base', 'Descuento', 'Impuesto', 'Total (S/.)'],
            rows=data_rows,
            sheet_name='Compras de Servicios',
            title='Compras de Servicios',
            period_label='Todo el historial',
        )



class ServicioContratadoViewSet(viewsets.ModelViewSet):
    serializer_class = ServicioContratadoSerializer
    
    def get_queryset(self):
        empresa = getattr(self.request, 'empresa', None)
        qs = ServicioContratado.objects.all()
        if empresa:
            qs = qs.filter(empresa=empresa)
        # Filter activo by default unless explicitly requested:
        activo = self.request.query_params.get('activo')
        if activo is None:
            qs = qs.filter(activo=True)
        elif activo == 'false':
            qs = qs.filter(activo=False)
        return qs.order_by('nombre')
    
    def perform_create(self, serializer):
        empresa = getattr(self.request, 'empresa', None)
        serializer.save(empresa=empresa)
