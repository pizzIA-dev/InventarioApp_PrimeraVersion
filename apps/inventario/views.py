from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import Categoria, Producto, MovimientoStock
from .serializers import (
    CategoriaSerializer,
    ProductoSerializer, ProductoCreateSerializer,
    MovimientoStockSerializer, MovimientoStockCreateSerializer
)


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.filter(activo=True)
    serializer_class = CategoriaSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre', 'creado_en']
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.filter(activo=True)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['codigo', 'nombre', 'descripcion']
    filterset_fields = ['categoria', 'activo', 'unidad_medida']
    ordering_fields = ['nombre', 'precio_venta', 'stock_actual', 'creado_en']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProductoCreateSerializer
        return ProductoSerializer
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()
    
    @action(detail=True, methods=['get'])
    def movimientos(self, request, pk=None):
        """Obtiene todos los movimientos de un producto"""
        producto = self.get_object()
        movimientos = producto.movimientos.all()[:50]  # Últimos 50 movimientos
        serializer = MovimientoStockSerializer(movimientos, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stock_bajo(self, request):
        """Obtiene productos con stock bajo"""
        productos = Producto.objects.filter(activo=True)
        productos_stock_bajo = [p for p in productos if p.stock_bajo]
        serializer = self.get_serializer(productos_stock_bajo, many=True)
        return Response(serializer.data)


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
