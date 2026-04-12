from datetime import datetime
from django.http import HttpResponse

from apps.core.export_utils import (
    get_period_range, get_period_label, create_excel_response
)
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from django.db.models import Count, Sum, Q
from django.utils import timezone
from .models import Cliente, SegmentoCliente, MovimientoEstadoCliente
from .serializers import (
    ClienteSerializer, ClienteCreateSerializer, SegmentoClienteSerializer,
    MovimientoEstadoClienteSerializer
)
from apps.ventas.models import Venta, DetalleVenta, MovimientoEstadoVenta

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
        """Exportar clientes a Excel (Multi-hoja: Productos y Servicios)"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.filter_queryset(self.get_queryset()).annotate(
            num_ventas=Count('ventas', filter=models.Q(ventas__estado='CONFIRMADA')),
            ventas_total=Sum('ventas__total', filter=models.Q(ventas__estado='CONFIRMADA')),
            num_servicios=Count('servicios_contratados', filter=models.Q(servicios_contratados__estado='TERMINADO')),
            servicios_total=Sum('servicios_contratados__total', filter=models.Q(servicios_contratados__estado='TERMINADO'))
        )

        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(creado_en__date__gte=date_from, creado_en__date__lte=date_to)

        # Cabeceras: ID Nombre Tipo Documento Contacto Email Teléfono Recurrencia Total Comprado Estado Última Modificación Responsable
        headers = [
            'ID', 'Nombre', 'Tipo', 'Documento', 'Contacto', 'Email', 
            'Teléfono', 'Recurrencia', 'Total Comprado (S/.)', 'Estado', 'Última Modificación', 'Responsable'
        ]
        
        rows_productos = []
        rows_servicios = []

        for obj in queryset:
            # Common data
            last_mov = obj.movimientos_estado.order_by('-fecha').first()
            usuario_str = f"{last_mov.usuario.get_full_name() or last_mov.usuario.username} ({last_mov.usuario.perfil.get_rol_display() if hasattr(last_mov.usuario, 'perfil') else '-'})" if last_mov and last_mov.usuario else "Sistema"
            
            common_data = [
                obj.id,
                obj.nombre,
                obj.get_tipo_cliente_display(),
                f"{obj.tipo_documento}: {obj.numero_documento}",
                obj.contacto or '',
                obj.email or '',
                obj.telefono or '',
            ]
            common_footer = [
                'Activo' if obj.activo else 'Inactivo',
                timezone.localtime(obj.actualizado_en).strftime("%d/%m/%Y %H:%M:%S"),
                usuario_str
            ]

            # Product sheet logic
            if (obj.num_ventas or 0) > 0:
                total_v = float(obj.ventas_total) if obj.ventas_total else 0.0
                rows_productos.append(
                    common_data + [
                        obj.num_ventas or 0,
                        total_v,
                    ] + common_footer
                )

            # Service sheet logic
            if (obj.num_servicios or 0) > 0:
                total_s = float(obj.servicios_total) if obj.servicios_total else 0.0
                rows_servicios.append(
                    common_data + [
                        obj.num_servicios or 0,
                        total_s,
                    ] + common_footer
                )

        period_label = get_period_label(periodo, anio)
        sheets_data = [
            {
                'sheet_name': 'Clientes (Productos)',
                'headers': headers,
                'rows': rows_productos,
                'title': 'Registro de Clientes (Compras de Productos)',
                'period_label': period_label
            },
            {
                'sheet_name': 'Clientes (Servicios)',
                'headers': headers,
                'rows': rows_servicios,
                'title': 'Registro de Clientes (Contratación de Servicios)',
                'period_label': period_label
            }
        ]

        return create_multi_sheet_excel_response(
            filename=f'clientes_{periodo}{"_" + str(anio) if anio else ""}.xlsx',
            sheets_data=sheets_data
        )

    @action(detail=True, methods=['get'])
    def kardex_servicios(self, request, pk=None):
        """Obtiene el detalle de servicios vendidos (Kardex)"""
        cliente = self.get_object()
        from apps.servicios.models import VentaServicio
        ventas_servicios = VentaServicio.objects.filter(
            cliente=cliente
        ).select_related('servicio', 'cliente').order_by('-creado_en')
        
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_desde:
            ventas_servicios = ventas_servicios.filter(creado_en__date__gte=fecha_desde)
        if fecha_hasta:
            ventas_servicios = ventas_servicios.filter(creado_en__date__lte=fecha_hasta)

        page = request.query_params.get('page', 1)
        try: page = int(page)
        except: page = 1
            
        page_size = request.query_params.get('page_size', 15)
        try: page_size = int(page_size)
        except: page_size = 15
            
        total = ventas_servicios.count()
        start = (page - 1) * page_size
        end = start + page_size
        paginados = ventas_servicios[start:end]

        results = []
        for v in paginados:
            tipo_c = v.tipo_comprobante
            l_tipo = tipo_c if tipo_c and tipo_c != 'SIMPLE' else ""
            l_num = v.numero_comprobante if l_tipo else ""
            results.append({
                'fecha': v.creado_en,
                'numero_comprobante_simple': v.numero_comprobante_simple,
                'tipo_comprobante': l_tipo,
                'comprobante': l_num,
                'cliente': v.cliente_nombre or (v.cliente.nombre if v.cliente else "Cliente General"),
                'servicio_nombre': v.servicio_nombre or (v.servicio.nombre if v.servicio else 'Sin Servicio'),
                'precio_servicio': float(v.precio),
                'descuento': float(v.descuento),
                'impuesto': float(v.impuesto),
                'total': float(v.total),
                'usuario_nombre': getattr(v.usuario, "get_full_name", lambda: "")() or v.usuario.username if v.usuario else "Sistema",
                'usuario_rol': v.usuario.perfil.get_rol_display() if v.usuario and hasattr(v.usuario, "perfil") else "-"
            })

        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if page_size > 0 else 1,
            'results': results
        })

    @action(detail=True, methods=['get'])
    def exportar_historial(self, request, pk=None):
        """Exporta el historial completo de un cliente (Multi-hoja: Estados, Productos, Servicios)"""
        cliente = self.get_object()
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')

        # Hoja 1: Historial de Estados
        estados = cliente.movimientos_estado.all().order_by('-fecha')
        headers_estados = ['Fecha', 'Tipo de Evento', 'Estado Anterior', 'Estado Nuevo', 'Notas', 'Responsable']
        rows_estados = []
        for e in estados:
            es_creacion = e.estado_anterior == '—'
            rows_estados.append([
                timezone.localtime(e.fecha).strftime("%d/%m/%Y %H:%M:%S"),
                'CREACIÓN' if es_creacion else 'CAMBIO DE ESTADO',
                'Nuevo cliente' if es_creacion else e.estado_anterior,
                e.estado_nuevo,
                e.notas,
                f"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})" if e.usuario else "Sistema"
            ])

        # Hoja 2: Detalle de Venta de Productos
        detalles = DetalleVenta.objects.filter(venta__cliente=cliente).select_related('producto', 'venta').order_by('-venta__creado_en')
        if fecha_desde: detalles = detalles.filter(venta__creado_en__date__gte=fecha_desde)
        if fecha_hasta: detalles = detalles.filter(venta__creado_en__date__lte=fecha_hasta)

        headers_productos = [
            'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente', 'Producto',
            'Código', 'Cant.', 'P. Unit. (S/.)', 'Subtotal (S/.)', 'Desc. (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable'
        ]
        rows_productos = []
        for d in detalles:
            v = d.venta
            t_c = v.tipo_comprobante
            l_t = t_c if t_c and t_c != 'SIMPLE' else ""
            l_n = v.numero_comprobante if l_t else ""
            rows_productos.append([
                timezone.localtime(v.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE",
                v.numero_comprobante_simple or "",
                l_t, l_n,
                v.cliente_nombre or (v.cliente.nombre if v.cliente else "Cliente General"),
                d.producto.nombre, d.producto.codigo,
                float(d.cantidad), float(d.precio_venta),
                float(d.cantidad) * float(d.precio_venta),
                float(d.descuento), float(v.impuesto),
                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto),
                f"{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})" if v.usuario else "Sistema"
            ])

        # Hoja 3: Detalle de Venta de Servicios
        from apps.servicios.models import VentaServicio
        ventas_s = VentaServicio.objects.filter(cliente=cliente).select_related('servicio', 'cliente').order_by('-creado_en')
        if fecha_desde: ventas_s = ventas_s.filter(creado_en__date__gte=fecha_desde)
        if fecha_hasta: ventas_s = ventas_s.filter(creado_en__date__lte=fecha_hasta)

        headers_servicios = [
            'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente', 'Servicio',
            'Precio Serv. (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable'
        ]
        rows_servicios = []
        for v in ventas_s:
            t_c = v.tipo_comprobante
            l_t = t_c if t_c and t_c != 'SIMPLE' else ""
            l_n = v.numero_comprobante if l_t else ""
            rows_servicios.append([
                timezone.localtime(v.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE",
                v.numero_comprobante_simple or "",
                l_t, l_n,
                v.cliente_nombre or (v.cliente.nombre if v.cliente else "Cliente General"),
                v.servicio_nombre or (v.servicio.nombre if v.servicio else 'Sin Servicio'),
                float(v.precio), float(v.descuento), float(v.impuesto), float(v.total), f'{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})' if v.usuario else 'Sistema'
            ])

        sheets_data = [
            {
                'sheet_name': 'Historial de Estados',
                'headers': headers_estados, 'rows': rows_estados,
                'title': f'Historial de Estados - Cliente: {cliente.nombre}',
                'period_label': 'Historial Completo'
            },
            {
                'sheet_name': 'Detalle de Venta de Productos',
                'headers': headers_productos, 'rows': rows_productos,
                'title': f'Detalle de Venta de Productos - Cliente: {cliente.nombre}',
                'period_label': f"{fecha_desde or 'Inicio'} al {fecha_hasta or 'Hoy'}" if (fecha_desde or fecha_hasta) else "Historial Completo"
            },
            {
                'sheet_name': 'Detalle de Venta de Servicios',
                'headers': headers_servicios, 'rows': rows_servicios,
                'title': f'Detalle de Venta de Servicios - Cliente: {cliente.nombre}',
                'period_label': f"{fecha_desde or 'Inicio'} al {fecha_hasta or 'Hoy'}" if (fecha_desde or fecha_hasta) else "Historial Completo"
            }
        ]

        return create_multi_sheet_excel_response(
            filename=f'historial_cliente_{cliente.id}.xlsx',
            sheets_data=sheets_data
        )

    @action(detail=False, methods=['get'])
    def exportar_historial_global(self, request):
        """Exporta el historial global de todos los clientes (Ventas por producto y servicio)"""
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        try: anio = int(anio) if anio else None
        except: anio = datetime.now().year
        
        period_range = get_period_range(periodo, anio)
        if period_range:
            d_from, d_to = period_range
        else:
            d_from = fecha_desde
            d_to = fecha_hasta

        # Hoja 1: Historial de Estados (Ventas confirmadas)
        ventas_qs = Venta.objects.filter(estado='CONFIRMADA')
        if d_from: ventas_qs = ventas_qs.filter(creado_en__date__gte=d_from)
        if d_to: ventas_qs = ventas_qs.filter(creado_en__date__lte=d_to)
            
        venta_ids = ventas_qs.values_list('id', flat=True)
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
            t_c = v.tipo_comprobante
            l_t = t_c if t_c and t_c != 'SIMPLE' else ""
            l_n = v.numero_comprobante if l_t else ""
            rows_estados.append([
                timezone.localtime(e.fecha).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE", v.numero_comprobante_simple or "",
                l_t, l_n, comp_cliente, e.estado_anterior, e.estado_nuevo, e.notas, f"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})" if e.usuario else "Sistema"
            ])

        # Hoja 2: Detalle de Venta de Productos (Kardex Global)
        detalles = DetalleVenta.objects.filter(venta_id__in=venta_ids).select_related('producto', 'venta', 'venta__cliente').order_by('-venta__creado_en')
        headers_productos = [
            'Fecha/Hora', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente', 'Estado',
            'Producto', 'Código de Producto', 'Cantidad', 'Precio Unitario (S/.)', 
            'Subtotal (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable'
        ]
        rows_productos = []
        for d in detalles:
            v = d.venta
            t_c = v.tipo_comprobante
            l_t = t_c if t_c and t_c != 'SIMPLE' else ""
            l_n = v.numero_comprobante if l_t else ""
            cliente_nombre = v.cliente_nombre or (v.cliente.nombre if v.cliente else "Cliente General")
            rows_productos.append([
                timezone.localtime(v.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE", v.numero_comprobante_simple or "",
                l_t, l_n, cliente_nombre, v.get_estado_display(),
                d.producto.nombre, d.producto.codigo, float(d.cantidad),
                float(d.precio_venta), float(d.cantidad) * float(d.precio_venta),
                float(d.descuento), float(v.impuesto), 
                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto),
                f"{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})" if v.usuario else "Sistema"
            ])

        # Hoja 3: Detalle de Venta de Servicios (Kardex Global)
        from apps.servicios.models import VentaServicio
        ventas_s = VentaServicio.objects.all().select_related('servicio', 'cliente').order_by('-creado_en')
        if d_from: ventas_s = ventas_s.filter(creado_en__date__gte=d_from)
        if d_to: ventas_s = ventas_s.filter(creado_en__date__lte=d_to)

        headers_servicios = [
            'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente', 'Estado', 'Servicio',
            'Precio Serv. (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable'
        ]
        rows_servicios = []
        for v in ventas_s:
            t_c = v.tipo_comprobante
            l_t = t_c if t_c and t_c != 'SIMPLE' else ""
            l_n = v.numero_comprobante if l_t else ""
            cliente_nombre = v.cliente_nombre or (v.cliente.nombre if v.cliente else "Cliente General")
            rows_servicios.append([
                timezone.localtime(v.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE", v.numero_comprobante_simple or "",
                l_t, l_n, cliente_nombre, v.get_estado_display(),
                v.servicio_nombre or (v.servicio.nombre if v.servicio else 'Sin Servicio'),
                float(v.precio), float(v.descuento), float(v.impuesto), float(v.total), f'{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})' if v.usuario else 'Sistema'
            ])

        period_label = get_period_label(periodo, anio)
        sheets_data = [
            {
                'sheet_name': 'Historial de Estados',
                'headers': headers_estados, 'rows': rows_estados,
                'title': 'Historial Global de Estados de Ventas',
                'period_label': period_label if period_range else (f"{fecha_desde or 'Inicio'} al {fecha_hasta or 'Hoy'}")
            },
            {
                'sheet_name': 'Detalle de Venta de Productos',
                'headers': headers_productos, 'rows': rows_productos,
                'title': 'Detalle Global de Venta de Productos (Kardex)',
                'period_label': period_label if period_range else (f"{fecha_desde or 'Inicio'} al {fecha_hasta or 'Hoy'}")
            },
            {
                'sheet_name': 'Detalle de Venta de Servicios',
                'headers': headers_servicios, 'rows': rows_servicios,
                'title': 'Detalle Global de Venta de Servicios (Kardex)',
                'period_label': period_label if period_range else (f"{fecha_desde or 'Inicio'} al {fecha_hasta or 'Hoy'}")
            }
        ]

        return create_multi_sheet_excel_response(
            filename=f'historial_global_clientes_{timezone.now().strftime("%Y%m%d")}.xlsx',
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
