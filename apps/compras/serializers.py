from rest_framework import serializers
from .models import Compra, DetalleCompra, MovimientoEstadoCompra


class DetalleCompraSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    
    class Meta:
        model = DetalleCompra
        fields = [
            'id', 'producto', 'producto_nombre', 'producto_codigo',
            'cantidad', 'precio_compra', 'descuento', 'subtotal'
        ]
        read_only_fields = ['subtotal']


class DetalleCompraCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalleCompra
        fields = ['producto', 'cantidad', 'precio_compra', 'descuento']
    
    def validate(self, data):
        producto = data.get('producto')
        cantidad = data.get('cantidad')
        
        if producto and producto.stock_actual < 0:
            # Validación solo informativa para compras
            pass
        
        return data


class CompraSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    detalle = DetalleCompraSerializer(source='detallecompra_set', many=True, read_only=True)
    productos_resumen = serializers.SerializerMethodField()
    
    class Meta:
        model = Compra
        fields = [
            'id', 'proveedor', 'proveedor_nombre', 'tipo_compra',
            'numero_comprobante', 'tipo_comprobante', 'estado',
            'subtotal', 'impuesto', 'total', 'notas',
            'creado_en', 'actualizado_en', 'detalle', 'comprobante_archivo',
            'productos_resumen'
        ]
        read_only_fields = ['subtotal', 'impuesto', 'total', 'creado_en', 'actualizado_en']
        
    def get_productos_resumen(self, obj):
        detalles = obj.detallecompra_set.all()[:3]
        resumen = ", ".join([f"{d.producto.nombre} ({int(d.cantidad)})" for d in detalles])
        count = obj.detallecompra_set.count()
        if count > 3:
            resumen += f" y {count - 3} más..."
        return resumen or "Sin productos"


class CompraCreateSerializer(serializers.ModelSerializer):
    detalle = DetalleCompraCreateSerializer(many=True, write_only=True)
    
    class Meta:
        model = Compra
        fields = [
            'proveedor', 'proveedor_nombre', 'tipo_compra',
            'numero_comprobante', 'tipo_comprobante', 'estado',
            'impuesto', 'notas', 'detalle', 'comprobante_archivo'
        ]
    
    def to_internal_value(self, data):
        import json
        # Si viene de multipart/form-data, puede ser un QueryDict
        if hasattr(data, 'dict'):
            data = data.dict()
        
        if 'detalle' in data and isinstance(data.get('detalle'), str):
            try:
                data['detalle'] = json.loads(data['detalle'])
            except (ValueError, TypeError):
                pass
        return super().to_internal_value(data)
    
    def create(self, validated_data):
        detalle_data = validated_data.pop('detalle')
        
        # Crear compra
        compra = Compra.objects.create(**validated_data)
        
        # Crear detalles
        for item in detalle_data:
            DetalleCompra.objects.create(compra=compra, **item)
        
        # Calcular totales
        compra.calcular_totales()
        
        # Registrar stock si está confirmada
        if compra.estado == 'CONFIRMADA':
            compra.registrar_stock()
        
        return compra


class CompraUpdateSerializer(serializers.ModelSerializer):
    detalle = DetalleCompraCreateSerializer(many=True, write_only=True, required=False)
    
    class Meta:
        model = Compra
        fields = [
            'proveedor', 'tipo_compra', 'numero_comprobante', 
            'tipo_comprobante', 'estado', 'impuesto', 'notas', 
            'detalle', 'comprobante_archivo'
        ]

    def to_internal_value(self, data):
        import json
        # Si viene de multipart/form-data, puede ser un QueryDict
        if hasattr(data, 'dict'):
            data = data.dict()
        
        if 'detalle' in data and isinstance(data.get('detalle'), str):
            try:
                data['detalle'] = json.loads(data['detalle'])
            except (ValueError, TypeError):
                pass
        return super().to_internal_value(data)
    
    def update(self, instance, validated_data):
        estado_anterior = instance.estado
        detalle_data = validated_data.pop('detalle', None)
        
        # 1. Si era una compra CONFIRMADA, revertimos el stock antes de cualquier cambio
        if estado_anterior == 'CONFIRMADA':
            instance.revertir_stock()
        
        # 2. Actualizar campos básicos (incluyendo el nuevo estado si cambió)
        instance = super().update(instance, validated_data)
        
        # 3. Actualizar detalles si se proporcionan
        # Ahora lo permitimos siempre, pero el efecto en stock dependerá del nuevo estado
        if detalle_data is not None:
            instance.detallecompra_set.all().delete()
            for item in detalle_data:
                DetalleCompra.objects.create(compra=instance, **item)
        
        # 4. Recalcular totales tras actualizar detalles
        instance.calcular_totales()
        
        # 5. Si el nuevo estado es CONFIRMADA, registramos el stock (con los nuevos detalles)
        if instance.estado == 'CONFIRMADA':
            instance.registrar_stock()
        
        return instance


class MovimientoEstadoCompraSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoEstadoCompra
        fields = ['id', 'estado_anterior', 'estado_nuevo', 'fecha', 'notas']


class KardexProductoCompraSerializer(serializers.ModelSerializer):
    """Serializer aplanado para el Kardex de productos comprados"""
    fecha = serializers.DateTimeField(source='compra.creado_en', read_only=True)
    tipo_comprobante = serializers.CharField(source='compra.tipo_comprobante', read_only=True)
    numero_comprobante = serializers.CharField(source='compra.numero_comprobante', read_only=True)
    proveedor_nombre = serializers.SerializerMethodField()
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    impuesto = serializers.DecimalField(source='compra.impuesto', max_digits=12, decimal_places=2, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = DetalleCompra
        fields = [
            'id', 'fecha', 'tipo_comprobante', 'numero_comprobante',
            'proveedor_nombre', 'producto_nombre', 'producto_codigo',
            'cantidad', 'precio_compra', 'descuento', 'impuesto', 'total'
        ]

    def get_proveedor_nombre(self, obj):
        return obj.compra.proveedor_nombre or (obj.compra.proveedor.nombre if obj.compra.proveedor else 'N/A')

    def get_total(self, obj):
        """Total = (Cantidad * Precio Compra) - Descuento + Impuesto"""
        subtotal = (obj.cantidad * obj.precio_compra) - obj.descuento
        impuesto = obj.compra.impuesto or 0
        return subtotal + impuesto
