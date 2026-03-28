from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count
from django.utils import timezone
from apps.core.export_utils import (
    get_period_range, get_period_label,
    create_excel_response, create_multi_sheet_excel_response
)
from .models import TipoCapital, Capital, MovimientoCapital
from .serializers import (
    TipoCapitalSerializer,
    CapitalSerializer, CapitalCreateSerializer, CapitalUpdateSerializer,
    MovimientoCapitalSerializer, format_historial_value
)


class TipoCapitalViewSet(viewsets.ModelViewSet):
    queryset = TipoCapital.objects.all()
    serializer_class = TipoCapitalSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()


class CapitalViewSet(viewsets.ModelViewSet):
    queryset = Capital.objects.all().select_related('tipo')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['nombre', 'descripcion', 'banco', 'cuenta']
    filterset_fields = ['tipo', 'estado']
    ordering_fields = ['nombre', 'valor_actual', 'creado_en']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CapitalCreateSerializer
        if self.action in ('update', 'partial_update'):
            return CapitalUpdateSerializer
        return CapitalSerializer
    
    def _asegurar_historial_inicial(self):
        """Busca capitales sin movimientos y crea un registro de Carga Inicial"""
        capitales_sin_historial = Capital.objects.annotate(
            num_movimientos=Count('movimientos')
        ).filter(num_movimientos=0)
        
        count = 0
        for cap in capitales_sin_historial:
            val_inicial = format_historial_value('valor_inicial', cap.valor_inicial)
            val_actual = format_historial_value('valor_actual', cap.valor_actual)
            
            timestamp = timezone.localtime(cap.creado_en).strftime('%d/%m/%Y %H:%M:%S')
            
            MovimientoCapital.objects.create(
                capital=cap,
                campo_modificado='Carga Inicial',
                valor_anterior=None,
                valor_nuevo=val_actual,
                # New fields for structured tracking
                valor_inicial_ant=None,
                valor_inicial_nvo=cap.valor_inicial,
                valor_actual_ant=None,
                valor_actual_nvo=cap.valor_actual,
                notas=f"Registro migrado/existente. V. Inicial: {val_inicial} | V. Actual: {val_actual} | Registrado: {timestamp}",
                fecha=cap.creado_en # Intentar mantener la fecha original de creación
            )
            count += 1
        return count

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Obtiene resumen del capital y sincroniza historial si es necesario"""
        # Sincronización automática de registros antiguos
        self._asegurar_historial_inicial()
        
        capital_activo = self.queryset.filter(estado='ACTIVO')
        
        total_dinero = sum(
            c.valor_actual for c in capital_activo 
            if c.tipo and c.tipo.tipo == 'DINERO'
        )
        total_bienes = sum(
            c.valor_actual for c in capital_activo 
            if c.tipo and c.tipo.tipo == 'BIEN'
        )
        capital_total = total_dinero + total_bienes
        
        return Response({
            'capital_total': capital_total,
            'total_dinero': total_dinero,
            'total_bienes': total_bienes,
            'cantidad_activos': capital_activo.count()
        })
    
    @action(detail=False, methods=['get'])
    def por_tipo(self, request):
        """Obtiene capital agrupado por tipo"""
        tipos = TipoCapital.objects.filter(activo=True)
        data = []
        for tipo in tipos:
            capital_tipo = Capital.objects.filter(tipo=tipo, estado='ACTIVO')
            total = sum(c.valor_actual for c in capital_tipo)
            data.append({
                'tipo': tipo.nombre,
                'categoria': tipo.tipo,
                'total': total,
                'cantidad': capital_tipo.count()
            })
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def tipos(self, request):
        """Obtiene todos los tipos de capital activos"""
        tipos = TipoCapital.objects.filter(activo=True)
        serializer = TipoCapitalSerializer(tipos, many=True)
        return Response(serializer.data)

    # ─── Kardex / Historial ────────────────────────────────────────────────────

    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        """Historial de cambios de un capital específico (paginado)"""
        capital = self.get_object()
        queryset = capital.movimientos.all()

        # Date filters
        desde = request.query_params.get('fecha_desde')
        hasta = request.query_params.get('fecha_hasta')
        if desde:
            queryset = queryset.filter(fecha__date__gte=desde)
        if hasta:
            queryset = queryset.filter(fecha__date__lte=hasta)

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 15))
        total = queryset.count()
        start = (page - 1) * page_size
        items = queryset[start:start + page_size]

        serializer = MovimientoCapitalSerializer(items, many=True)
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, (total + page_size - 1) // page_size),
            'results': serializer.data,
            'capital_nombre': capital.nombre,
        })

    @action(detail=True, methods=['get'])
    def exportar_historial(self, request, pk=None):
        """Exporta el historial de un capital individual a Excel"""
        capital = self.get_object()
        movimientos = capital.movimientos.all()

        headers = [
            'Fecha', 'Campo Modificado', 'V. Inicial Ant.', 'V. Inicial Nvo.', 
            'V. Actual Ant.', 'V. Actual Nvo.', 'Valor Anterior (Ref)', 'Valor Nuevo (Ref)', 'Notas'
        ]
        rows = []
        for m in movimientos:
            rows.append([
                timezone.localtime(m.fecha).strftime('%d/%m/%Y %H:%M:%S'),
                m.campo_modificado or '',
                float(m.valor_inicial_ant) if m.valor_inicial_ant is not None else '-',
                float(m.valor_inicial_nvo) if m.valor_inicial_nvo is not None else '-',
                float(m.valor_actual_ant) if m.valor_actual_ant is not None else '-',
                float(m.valor_actual_nvo) if m.valor_actual_nvo is not None else '-',
                m.valor_anterior or '-',
                m.valor_nuevo or '-',
                m.notas or '',
            ])

        return create_excel_response(
            filename=f'historial_capital_{capital.id}.xlsx',
            sheet_name='Historial',
            headers=headers,
            rows=rows,
            title=f'Historial de Capital: {capital.nombre}',
            period_label='Historial Completo',
        )

    @action(detail=False, methods=['get'])
    def exportar(self, request):
        """Exporta el listado de capital a Excel con filtro de período"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.get_queryset().order_by('nombre')
        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(creado_en__date__gte=date_from, creado_en__date__lte=date_to)

        headers = [
            'ID', 'Fecha de Registro', 'Nombre', 'Tipo', 'Categoría',
            'Valor Inicial', 'Valor Actual', 'Última Actualización'
        ]
        rows = []
        for c in queryset:
            rows.append([
                c.id,
                timezone.localtime(c.creado_en).strftime('%d/%m/%Y %H:%M:%S'),
                c.nombre,
                c.tipo.nombre if c.tipo else '-',
                c.tipo.tipo if c.tipo else '-',
                float(c.valor_inicial),
                float(c.valor_actual),
                timezone.localtime(c.actualizado_en).strftime('%d/%m/%Y %H:%M:%S'),
            ])

        period_label = get_period_label(periodo, anio)
        return create_excel_response(
            filename=f'capital_{periodo}{("_" + str(anio)) if anio else ""}.xlsx',
            sheet_name='Capital',
            headers=headers,
            rows=rows,
            title='Listado de Capital',
            period_label=period_label,
        )

    @action(detail=False, methods=['get'])
    def exportar_historial_global(self, request):
        """Exporta el historial global de todos los capitales a Excel"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        movimientos_qs = MovimientoCapital.objects.select_related('capital', 'capital__tipo').order_by('-fecha')
        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            movimientos_qs = movimientos_qs.filter(fecha__date__gte=date_from, fecha__date__lte=date_to)

        headers = [
            'Fecha', 'Capital', 'Tipo', 'Categoría',
            'Campo Modificado', 'V. Inicial Ant.', 'V. Inicial Nvo.', 
            'V. Actual Ant.', 'V. Actual Nvo.', 'Notas'
        ]
        rows = []
        for m in movimientos_qs:
            rows.append([
                timezone.localtime(m.fecha).strftime('%d/%m/%Y %H:%M:%S'),
                m.capital.nombre,
                m.capital.tipo.nombre if m.capital.tipo else '-',
                m.capital.tipo.tipo if m.capital.tipo else '-',
                m.campo_modificado or '',
                float(m.valor_inicial_ant) if m.valor_inicial_ant is not None else '-',
                float(m.valor_inicial_nvo) if m.valor_inicial_nvo is not None else '-',
                float(m.valor_actual_ant) if m.valor_actual_ant is not None else '-',
                float(m.valor_actual_nvo) if m.valor_actual_nvo is not None else '-',
                m.notas or '',
            ])

        period_label = get_period_label(periodo, anio)
        return create_excel_response(
            filename=f'historial_global_capital_{periodo}{("_" + str(anio)) if anio else ""}.xlsx',
            sheet_name='Historial Global',
            headers=headers,
            rows=rows,
            title='Historial Global de Capital',
            period_label=period_label,
        )
