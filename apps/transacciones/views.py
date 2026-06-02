from apps.core.renderers import PassthroughRenderer
from django.http import HttpResponse
from apps.core.export_utils import (
    get_period_range, get_period_label, create_excel_response
)
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from .models import CategoriaTransaccion, Transaccion, MovimientoCategoria, HistorialTransaccion
from .serializers import (
    CategoriaTransaccionSerializer,
    TransaccionSerializer, TransaccionCreateSerializer,
    MovimientoCategoriaSerializer, HistorialTransaccionSerializer
)
from apps.core.mixins import SoloGerenteDestroyMixin


class CategoriaTransaccionViewSet(SoloGerenteDestroyMixin, viewsets.ModelViewSet):
    queryset = CategoriaTransaccion.objects.all()
    serializer_class = CategoriaTransaccionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()

    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        instance = self.get_object()
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        
        queryset = instance.historial.all().order_by('-fecha')
        
        if fecha_desde:
            queryset = queryset.filter(fecha__date__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha__date__lte=fecha_hasta)
            
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = MovimientoCategoriaSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = MovimientoCategoriaSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], renderer_classes=[PassthroughRenderer])
    def exportar_historial(self, request, pk=None):
        instance = self.get_object()
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        
        queryset = instance.historial.all().order_by('-fecha')
        
        period_label = "Todo el historial"
        if fecha_desde and fecha_hasta:
            queryset = queryset.filter(fecha__date__gte=fecha_desde, fecha__date__lte=fecha_hasta)
            period_label = f"Del {fecha_desde} al {fecha_hasta}"
        elif fecha_desde:
            queryset = queryset.filter(fecha__date__gte=fecha_desde)
            period_label = f"Desde {fecha_desde}"
        elif fecha_hasta:
            queryset = queryset.filter(fecha__date__lte=fecha_hasta)
            period_label = f"Hasta {fecha_hasta}"

        # Columnas estándar
        headers = ['Fecha y Hora', 'Categoría', 'Tipo de Evento', 'Campo', 'V. Anterior (S/.)', 'V. Nuevo (S/.)', 'Descripción', 'Notas', 'Responsable']
        rows = []
        for obj in queryset:
            tipo_label = obj.get_tipo_movimiento_display() if hasattr(obj, 'get_tipo_movimiento_display') else obj.tipo_movimiento
            usuario_nombre = "Sistema"
            if obj.usuario:
                nom = getattr(obj.usuario, "get_full_name", lambda: "")() or obj.usuario.username
                rol = obj.usuario.perfil.get_rol_display() if hasattr(obj.usuario, "perfil") else "-"
                usuario_nombre = f"{nom} ({rol})"

            rows.append([
                obj.fecha.strftime("%d/%m/%Y %H:%M:%S") if obj.fecha else '',
                instance.nombre,
                tipo_label,
                obj.campo_modificado or '-',
                obj.valor_anterior or '-',
                obj.valor_nuevo or '-',
                obj.descripcion or '',
                obj.notas or '',
                usuario_nombre
            ])

        return create_excel_response(
            filename=f'historial_{instance.nombre.replace(" ", "_").lower()}.xlsx',
            sheet_name='Historial',
            headers=headers,
            rows=rows,
            title=f'Historial de Categoría: {instance.nombre} ({instance.get_tipo_display() if hasattr(instance, "get_tipo_display") else instance.tipo})',
            period_label=period_label
        )


class TransaccionViewSet(SoloGerenteDestroyMixin, viewsets.ModelViewSet):
    queryset = Transaccion.objects.all().select_related('categoria')
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['tipo', 'categoria', 'metodo_pago']
    ordering_fields = ['-fecha']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TransaccionCreateSerializer
        return TransaccionSerializer
    
    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        """Obtiene el historial de auditoría de una transacción específica, con filtros de fecha y paginación"""
        instance = self.get_object()
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')

        queryset = instance.historial_audit.all().order_by('-fecha')
        if fecha_desde:
            queryset = queryset.filter(fecha__date__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha__date__lte=fecha_hasta)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = HistorialTransaccionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = HistorialTransaccionSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], renderer_classes=[PassthroughRenderer])
    def exportar_historial(self, request, pk=None):
        """Exportar el historial de auditoría de una transacción específica a Excel con columnas estándar"""
        instance = self.get_object()
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')

        queryset = instance.historial_audit.all().order_by('-fecha')
        if fecha_desde:
            queryset = queryset.filter(fecha__date__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha__date__lte=fecha_hasta)

        cat_nombre = instance.categoria.nombre if instance.categoria else 'Sin Categoría'
        period_label = 'Todos los cambios'
        if fecha_desde and fecha_hasta:
            period_label = f"Del {fecha_desde} al {fecha_hasta}"
        elif fecha_desde:
            period_label = f"Desde {fecha_desde}"
        elif fecha_hasta:
            period_label = f"Hasta {fecha_hasta}"

        # Columnas estándar
        headers = ['Fecha y Hora', 'Categoría', 'Tipo de Evento', 'Campo', 'V. Anterior (S/.)', 'V. Nuevo (S/.)', 'Descripción', 'Notas', 'Responsable']
        rows = []
        for obj in queryset:
            usuario_nombre = "Sistema"
            if obj.usuario:
                nom = getattr(obj.usuario, "get_full_name", lambda: "")() or obj.usuario.username
                rol = obj.usuario.perfil.get_rol_display() if hasattr(obj.usuario, "perfil") else "-"
                usuario_nombre = f"{nom} ({rol})"

            rows.append([
                obj.fecha.strftime("%d/%m/%Y %H:%M:%S") if obj.fecha else '',
                cat_nombre,
                'EDICION',
                obj.campo_modificado or '-',
                obj.valor_anterior or '-',
                obj.valor_nuevo or '-',
                obj.descripcion or '',
                obj.notas or '',
                usuario_nombre
            ])

        return create_excel_response(
            filename=f'historial_transaccion_{instance.id}.xlsx',
            sheet_name='Historial',
            headers=headers,
            rows=rows,
            title=f'Historial de Transacción #{instance.id} - {cat_nombre}',
            period_label=period_label
        )
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Obtiene resumen de ingresos y egresos"""
        # Totales
        total_ingresos = sum(
            t.monto for t in self.queryset.filter(tipo='INGRESO')
        )
        total_egresos = sum(
            t.monto for t in self.queryset.filter(tipo='EGRESO')
        )
        balance = total_ingresos - total_egresos
        
        # Este mes
        hoy = timezone.now().date()
        inicio_mes = hoy.replace(day=1)
        
        ingresos_mes = sum(
            t.monto for t in self.queryset.filter(
                tipo='INGRESO', fecha__date__gte=inicio_mes
            )
        )
        egresos_mes = sum(
            t.monto for t in self.queryset.filter(
                tipo='EGRESO', fecha__date__gte=inicio_mes
            )
        )
        balance_mes = ingresos_mes - egresos_mes
        
        return Response({
            'total_ingresos': total_ingresos,
            'total_egresos': total_egresos,
            'balance': balance,
            'ingresos_mes': ingresos_mes,
            'egresos_mes': egresos_mes,
            'balance_mes': balance_mes
        })
    
    @action(detail=False, methods=['get'])
    def por_categoria(self, request):
        """Obtiene transacciones agrupadas por categoría"""
        categorias = CategoriaTransaccion.objects.filter(activo=True)
        data = []
        
        for cat in categorias:
            total = sum(
                t.monto for t in cat.transacciones.all()
            )
            data.append({
                'categoria': cat.nombre,
                'tipo': cat.tipo,
                'total': total,
                'cantidad': cat.transacciones.count()
            })
        return Response(data)

    @action(detail=False, methods=['get'], renderer_classes=[PassthroughRenderer])
    def exportar(self, request):
        """Exportar movimientos a Excel con 2 hojas: Ingresos y Gastos"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.filter_queryset(self.get_queryset())

        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(fecha__date__gte=date_from, fecha__date__lte=date_to)

        period_label = get_period_label(periodo, anio)

        headers = ['ID', 'Fecha de Creación', 'Categoría', 'Descripción', 'Monto (S/.)', 'Método de Pago', 'Referencia', 'Fecha de Últ. Mod.', 'Responsable']

        ingresos = queryset.filter(tipo='INGRESO')
        rows_ingresos = []
        for obj in ingresos:
            usuario_str = f"{obj.usuario.get_full_name() or obj.usuario.username} ({obj.usuario.perfil.get_rol_display() if hasattr(obj.usuario, 'perfil') else '-'})" if obj.usuario else "Sistema"
            rows_ingresos.append([
                obj.id,
                obj.creado_en.strftime("%d/%m/%Y %H:%M:%S") if obj.creado_en else '',
                obj.categoria.nombre if obj.categoria else 'Sin Categoría',
                obj.descripcion or '',
                float(obj.monto),
                obj.get_metodo_pago_display(),
                obj.referencia or '',
                obj.actualizado_en.strftime("%d/%m/%Y %H:%M:%S") if obj.actualizado_en else '',
                usuario_str
            ])

        egresos = queryset.filter(tipo='EGRESO')
        rows_egresos = []
        for obj in egresos:
            usuario_str = f"{obj.usuario.get_full_name() or obj.usuario.username} ({obj.usuario.perfil.get_rol_display() if hasattr(obj.usuario, 'perfil') else '-'})" if obj.usuario else "Sistema"
            rows_egresos.append([
                obj.id,
                obj.creado_en.strftime("%d/%m/%Y %H:%M:%S") if obj.creado_en else '',
                obj.categoria.nombre if obj.categoria else 'Sin Categoría',
                obj.descripcion or '',
                float(obj.monto),
                obj.get_metodo_pago_display(),
                obj.referencia or '',
                obj.actualizado_en.strftime("%d/%m/%Y %H:%M:%S") if obj.actualizado_en else '',
                usuario_str
            ])

        sheets = [
            {
                'sheet_name': 'Ingresos',
                'headers': headers,
                'rows': rows_ingresos,
                'title': f'Registro de Ingresos No Operativos',
                'period_label': period_label,
            },
            {
                'sheet_name': 'Gastos',
                'headers': headers,
                'rows': rows_egresos,
                'title': f'Registro de Gastos',
                'period_label': period_label,
            },
        ]

        from apps.core.export_utils import create_multi_sheet_excel_response
        return create_multi_sheet_excel_response(
            filename='movimientos.xlsx',
            sheets_data=sheets,
        )

    @action(detail=False, methods=['get'], renderer_classes=[PassthroughRenderer])
    def exportar_historial_global(self, request):
        """Exportar historial global de movimientos de categorías, separado por tipo"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        period_range = get_period_range(periodo, anio)
        period_label = get_period_label(periodo, anio)

        queryset = MovimientoCategoria.objects.all().select_related('categoria')
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(fecha__date__gte=date_from, fecha__date__lte=date_to)

        headers_hist = ['Fecha y Hora', 'Categoría', 'Tipo de Evento', 'Campo', 'V. Anterior (S/.)', 'V. Nuevo (S/.)', 'Descripción', 'Notas', 'Responsable']

        def build_rows(qs):
            rows = []
            for obj in qs:
                usuario_nombre = "Sistema"
                if obj.usuario:
                    nom = getattr(obj.usuario, "get_full_name", lambda: "")() or obj.usuario.username
                    rol = obj.usuario.perfil.get_rol_display() if hasattr(obj.usuario, "perfil") else "-"
                    usuario_nombre = f"{nom} ({rol})"

                rows.append([
                    obj.fecha.strftime("%d/%m/%Y %H:%M:%S") if obj.fecha else '',
                    obj.categoria.nombre if obj.categoria else '-',
                    obj.get_tipo_movimiento_display() if hasattr(obj, 'get_tipo_movimiento_display') else obj.tipo_movimiento,
                    obj.campo_modificado or '-',
                    obj.valor_anterior or '-',
                    obj.valor_nuevo or '-',
                    obj.descripcion or '',
                    obj.notas or '',
                    usuario_nombre
                ])
            return rows

        ingresos_qs = queryset.filter(categoria__tipo='INGRESO').order_by('-fecha')
        egresos_qs = queryset.filter(categoria__tipo='EGRESO').order_by('-fecha')

        sheets = [
            {
                'sheet_name': 'Historial Ingresos',
                'headers': headers_hist,
                'rows': build_rows(ingresos_qs),
                'title': 'Historial Global de Ingresos No Operativos',
                'period_label': period_label,
            },
            {
                'sheet_name': 'Historial Gastos',
                'headers': headers_hist,
                'rows': build_rows(egresos_qs),
                'title': 'Historial Global de Gastos',
                'period_label': period_label,
            },
        ]

        from apps.core.export_utils import create_multi_sheet_excel_response
        return create_multi_sheet_excel_response(
            filename='historial_global.xlsx',
            sheets_data=sheets,
        )

