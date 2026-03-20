from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Sum
from .models import Cliente, SegmentoCliente
from .serializers import ClienteSerializer, ClienteCreateSerializer, SegmentoClienteSerializer


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.filter(activo=True)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['nombre', 'numero_documento', 'email', 'telefono']
    filterset_fields = ['tipo_cliente', 'tipo_documento', 'activo']
    ordering_fields = ['nombre', 'creado_en']
    
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
        clientes = Cliente.objects.filter(activo=True).annotate(
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


class SegmentoClienteViewSet(viewsets.ModelViewSet):
    queryset = SegmentoCliente.objects.filter(activo=True)
    serializer_class = SegmentoClienteSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()
