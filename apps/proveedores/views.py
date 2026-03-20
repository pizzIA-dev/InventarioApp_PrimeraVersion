from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import Proveedor, HistoricoPrecio
from .serializers import (
    ProveedorSerializer, ProveedorCreateSerializer,
    HistoricoPrecioSerializer
)


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.filter(activo=True)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['nombre', 'identificador', 'email', 'telefono']
    filterset_fields = ['categoria', 'activo', 'tiene_contrato']
    ordering_fields = ['nombre', 'creado_en']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProveedorCreateSerializer
        return ProveedorSerializer
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()
    
    @action(detail=True, methods=['get'])
    def historico_precios(self, request, pk=None):
        """Obtiene el histórico de precios de un proveedor"""
        proveedor = self.get_object()
        historico = proveedor.historico_precios.all()[:100]
        serializer = HistoricoPrecioSerializer(historico, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def productos(self, request, pk=None):
        """Obtiene los productos que ha suministrado este proveedor"""
        proveedor = self.get_object()
        productos = proveedor.productos_suministrados
        from apps.inventario.serializers import ProductoSerializer
        serializer = ProductoSerializer(productos, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def estadisticas(self, request, pk=None):
        """Obtiene estadísticas del proveedor"""
        proveedor = self.get_object()
        
        # Total comprado
        total_compras = sum(compra.total for compra in proveedor.compras.all())
        
        # Cantidad de compras
        cantidad_compras = proveedor.compras.count()
        
        # Producto más comprado
        from django.db.models import Sum
        producto_stats = HistoricoPrecio.objects.filter(
            proveedor=proveedor
        ).values('producto__nombre').annotate(
            total_cantidad=Sum('cantidad')
        ).order_by('-total_cantidad').first()
        
        return Response({
            'total_compras': total_compras,
            'cantidad_compras': cantidad_compras,
            'producto_mas_comprado': producto_stats['producto__nombre'] if producto_stats else None,
            'productos_diferentes': proveedor.historico_precios.values('producto').distinct().count()
        })


class HistoricoPrecioViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistoricoPrecio.objects.all().select_related('producto', 'proveedor')
    serializer_class = HistoricoPrecioSerializer
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['proveedor', 'producto']
    ordering_fields = ['fecha']
