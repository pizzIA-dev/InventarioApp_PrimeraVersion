from django.http import HttpResponse
from apps.core.export_utils import (
    get_period_range, get_period_label, create_excel_response
)
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Sum
from .models import Cliente, SegmentoCliente
from .serializers import ClienteSerializer, ClienteCreateSerializer, SegmentoClienteSerializer


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
        """Exportar clientes a Excel con filtro de período"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.filter_queryset(self.get_queryset())

        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(creado_en__date__gte=date_from, creado_en__date__lte=date_to)

        headers = ['ID', 'Nombre', 'Tipo Cliente', 'Documento', 'Contacto', 'Teléfono', 'Email', 'Total Comprado (S/.)', 'Activo']
        rows = []
        for obj in queryset:
            rows.append([
                obj.id,
                obj.nombre,
                obj.tipo_cliente,
                f"{obj.tipo_documento}: {obj.numero_documento}",
                obj.contacto or '',
                obj.telefono or '',
                obj.email or '',
                float(obj.total_comprado) if obj.total_comprado else 0.0,
                'Sí' if obj.activo else 'No'
            ])

        period_label = get_period_label(periodo, anio)
        return create_excel_response(
            filename='clientes.xlsx',
            sheet_name='Clientes',
            headers=headers,
            rows=rows,
            title='Registro de Clientes',
            period_label=period_label
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
