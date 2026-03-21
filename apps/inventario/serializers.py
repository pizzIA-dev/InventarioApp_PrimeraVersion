from rest_framework import serializers
from .models import Categoria, Producto, MovimientoStock


class CategoriaSerializer(serializers.ModelSerializer):
    productos_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'descripcion', 'activo', 'creado_en', 'productos_count']
        read_only_fields = ['creado_en']
    
    def get_productos_count(self, obj):
        return obj.productos.filter(activo=True).count()


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    stock_bajo = serializers.BooleanField(read_only=True)
    margen_ganancia = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = Producto
        fields = [
            'id', 'codigo', 'nombre', 'descripcion', 'categoria', 'categoria_nombre',
            'stock_inicial', 'stock_actual', 'stock_minimo', 'unidad_medida', 'stock_bajo',
            'precio_compra', 'precio_venta', 'margen_ganancia',
            'activo', 'creado_en', 'actualizado_en'
        ]
        read_only_fields = ['creado_en', 'actualizado_en']
    
    def validate_codigo(self, value):
        return value.upper()
    
    def validate(self, data):
        if data.get('precio_venta', 0) < data.get('precio_compra', 0):
            raise serializers.ValidationError(
                "El precio de venta no puede ser menor al precio de compra"
            )
        return data


class ProductoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = [
            'id', 'codigo', 'nombre', 'descripcion', 'categoria',
            'stock_inicial', 'stock_actual', 'stock_minimo', 'unidad_medida',
            'precio_compra', 'precio_venta', 'activo'
        ]
        read_only_fields = []
    
    def validate_codigo(self, value):
        return value.upper()


class MovimientoStockSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    
    class Meta:
        model = MovimientoStock
        fields = [
            'id', 'producto', 'producto_nombre', 'producto_codigo',
            'tipo', 'origen', 'cantidad', 'stock_anterior', 'stock_nuevo',
            'precio_unitario', 'precio_compra_anterior', 'precio_compra_nuevo', 
            'precio_venta_anterior', 'precio_venta_nuevo', 'referencia', 'notas',
            'activo_nuevo', 'fecha'
        ]
        read_only_fields = ['stock_anterior', 'stock_nuevo', 'fecha']
    
    def validate(self, data):
        producto = data.get('producto')
        tipo = data.get('tipo')
        cantidad = data.get('cantidad')
        
        if producto and tipo == 'SALIDA' and producto.stock_actual < cantidad:
            raise serializers.ValidationError(
                f"Stock insuficiente. Stock actual: {producto.stock_actual}"
            )
        
        return data


class MovimientoStockCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoStock
        fields = [
            'producto', 'tipo', 'origen', 'cantidad',
            'precio_unitario', 'precio_compra_anterior', 'precio_compra_nuevo', 
            'precio_venta_anterior', 'precio_venta_nuevo', 'referencia', 'notas'
        ]
