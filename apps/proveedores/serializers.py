from rest_framework import serializers
from .models import Proveedor, HistoricoPrecio


class ProveedorSerializer(serializers.ModelSerializer):
    total_compras = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    productos_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Proveedor
        fields = [
            'id', 'nombre', 'identificador', 'contacto', 'email', 'telefono', 'direccion',
            'categoria', 'tiene_contrato', 'detalles_contrato', 'dias_credito', 'limite_credito',
            'activo', 'creado_en', 'actualizado_en', 'total_compras', 'productos_count'
        ]
        read_only_fields = ['creado_en', 'actualizado_en', 'total_compras']
    
    def get_productos_count(self, obj):
        return obj.historico_precios.values('producto').distinct().count()


class ProveedorCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = [
            'nombre', 'identificador', 'contacto', 'email', 'telefono', 'direccion',
            'categoria', 'tiene_contrato', 'detalles_contrato', 'dias_credito', 'limite_credito', 'activo'
        ]


class HistoricoPrecioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    
    class Meta:
        model = HistoricoPrecio
        fields = [
            'id', 'proveedor', 'proveedor_nombre', 'producto', 'producto_nombre', 
            'producto_codigo', 'precio_compra', 'cantidad', 'fecha', 'compra'
        ]
        read_only_fields = ['fecha']


class HistoricoPrecioPorProductoSerializer(serializers.ModelSerializer):
    """Histórico de precios para un producto específico"""
    class Meta:
        model = HistoricoPrecio
        fields = ['precio_compra', 'cantidad', 'fecha']
