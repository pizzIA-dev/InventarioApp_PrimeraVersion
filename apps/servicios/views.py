from django.http import HttpResponse
from apps.core.export_utils import (
    get_period_range, get_period_label, create_excel_response
)
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count
from django.utils import timezone
from .models import CategoriaServicio, Servicio, VentaServicio
from .serializers import (
    CategoriaServicioSerializer,
    ServicioSerializer, ServicioCreateSerializer,
    VentaServicioSerializer, VentaServicioCreateSerializer,
    MovimientoEstadoVentaServicioSerializer
)


class CategoriaServicioViewSet(viewsets.ModelViewSet):
    queryset = CategoriaServicio.objects.all()
    serializer_class = CategoriaServicioSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()


class ServicioViewSet(viewsets.ModelViewSet):
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


class VentaServicioViewSet(viewsets.ModelViewSet):
    queryset = VentaServicio.objects.all().select_related('servicio', 'cliente')
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['estado', 'servicio', 'cliente']
    ordering_fields = ['-creado_en']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return VentaServicioCreateSerializer
        return VentaServicioSerializer
    
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
        """Cancela un servicio"""
        venta_servicio = self.get_object()
        venta_servicio.estado = 'CANCELADO'
        venta_servicio.save()
        
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

    @action(detail=False, methods=['get'])
    def exportar(self, request):
        """Exportar ventas de servicios a Excel con filtro de período"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.filter_queryset(self.get_queryset())

        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(fecha_programada__date__gte=date_from, fecha_programada__date__lte=date_to)

        headers = ['ID', 'Servicio', 'Cliente', 'Estado', 'Fecha Programada', 'Fecha Completado', 'Precio (S/.)', 'Descuento (S/.)', 'Total (S/.)']
        rows = []
        for obj in queryset:
            rows.append([
                obj.id,
                obj.servicio_nombre or (obj.servicio.nombre if obj.servicio else 'Sin Servicio'),
                obj.cliente_nombre or (obj.cliente.nombre if obj.cliente else 'Sin Cliente'),
                obj.get_estado_display(),
                obj.fecha_programada.strftime("%Y-%m-%d %H:%M") if obj.fecha_programada else '',
                obj.fecha_completado.strftime("%Y-%m-%d %H:%M") if obj.fecha_completado else '',
                float(obj.precio),
                float(obj.descuento),
                float(obj.total)
            ])

        period_label = get_period_label(periodo, anio)
        return create_excel_response(
            filename='ventas_servicios.xlsx',
            sheet_name='Ventas de Servicios',
            headers=headers,
            rows=rows,
            title='Historial de Ventas de Servicios',
            period_label=period_label
        )
