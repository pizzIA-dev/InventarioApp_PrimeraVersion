from rest_framework import serializers
from .models import Categoria, Producto, MovimientoStock, Almacen, StockAlmacen, TrasladoStock


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
    usuario_nombre = serializers.SerializerMethodField()
    usuario_rol = serializers.SerializerMethodField()
    almacen_nombre = serializers.CharField(source='almacen.nombre', read_only=True, default=None)

    class Meta:
        model = MovimientoStock
        fields = [
            'id', 'usuario', 'usuario_nombre', 'usuario_rol', 'producto', 'producto_nombre', 'producto_codigo',
            'tipo', 'origen', 'cantidad', 'stock_anterior', 'stock_nuevo',
            'precio_unitario', 'precio_compra_anterior', 'precio_compra_nuevo',
            'precio_venta_anterior', 'precio_venta_nuevo', 'referencia', 'notas',
            'activo_nuevo', 'almacen', 'almacen_nombre', 'fecha'
        ]
        read_only_fields = ['stock_anterior', 'stock_nuevo', 'fecha']

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return getattr(obj.usuario, 'get_full_name', lambda: '')() or obj.usuario.username
        return 'Sistema'

    def get_usuario_rol(self, obj):
        if obj.usuario and hasattr(obj.usuario, 'perfil'):
            return obj.usuario.perfil.get_rol_display()
        return '-'

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
            'precio_venta_anterior', 'precio_venta_nuevo', 'referencia', 'notas', 'almacen'
        ]


# ── Almacén ───────────────────────────────────────────────────────────────────

class StockAlmacenSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    producto_unidad = serializers.CharField(source='producto.unidad_medida', read_only=True)
    stock_minimo = serializers.DecimalField(
        source='producto.stock_minimo', max_digits=10, decimal_places=2, read_only=True
    )
    stock_bajo = serializers.SerializerMethodField()

    class Meta:
        model = StockAlmacen
        fields = [
            'id', 'almacen', 'producto', 'producto_nombre', 'producto_codigo',
            'producto_unidad', 'cantidad', 'stock_minimo', 'stock_bajo', 'actualizado_en'
        ]
        read_only_fields = ['actualizado_en']

    def get_stock_bajo(self, obj):
        return obj.cantidad <= obj.producto.stock_minimo


class AlmacenSerializer(serializers.ModelSerializer):
    stocks = StockAlmacenSerializer(many=True, read_only=True)
    total_colaboradores = serializers.IntegerField(read_only=True)

    class Meta:
        model = Almacen
        fields = [
            'id', 'nombre', 'descripcion', 'es_general', 'activo',
            'total_colaboradores', 'stocks', 'creado_en', 'actualizado_en'
        ]
        read_only_fields = ['creado_en', 'actualizado_en']


class AlmacenListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listas (sin stocks detallados)."""
    total_colaboradores = serializers.IntegerField(read_only=True)
    total_productos = serializers.SerializerMethodField()

    class Meta:
        model = Almacen
        fields = [
            'id', 'nombre', 'descripcion', 'es_general', 'activo',
            'total_colaboradores', 'total_productos', 'creado_en', 'actualizado_en'
        ]
        read_only_fields = ['creado_en', 'actualizado_en']

    def get_total_productos(self, obj):
        return obj.stocks.filter(cantidad__gt=0).count()


class TrasladoStockSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    almacen_origen_nombre = serializers.CharField(source='almacen_origen.nombre', read_only=True, default=None)
    almacen_destino_nombre = serializers.CharField(source='almacen_destino.nombre', read_only=True, default=None)
    usuario_nombre = serializers.SerializerMethodField()

    class Meta:
        model = TrasladoStock
        fields = [
            'id', 'tipo', 'producto', 'producto_nombre',
            'almacen_origen', 'almacen_origen_nombre',
            'almacen_destino', 'almacen_destino_nombre',
            'cantidad', 'notas', 'usuario', 'usuario_nombre', 'fecha'
        ]
        read_only_fields = ['fecha', 'usuario']

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return obj.usuario.username
        return 'Sistema'

    def validate(self, data):
        origen = data.get('almacen_origen')
        destino = data.get('almacen_destino')
        if origen and destino and origen == destino:
            raise serializers.ValidationError(
                "El almacén de origen y destino no pueden ser el mismo."
            )
        if not origen and not destino:
            raise serializers.ValidationError(
                "Debes especificar al menos un almacén de origen o destino."
            )
        return data
