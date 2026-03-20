from rest_framework import serializers
from .models import Compra, DetalleCompra


class DetalleCompraSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    
    class Meta:
        model = DetalleCompra
        fields = [
            'id', 'producto', 'producto_nombre', 'producto_codigo',
            'cantidad', 'precio_compra', 'subtotal'
        ]
        read_only_fields = ['subtotal']


class DetalleCompraCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalleCompra
        fields = ['producto', 'cantidad', 'precio_compra']
    
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
    
    class Meta:
        model = Compra
        fields = [
            'id', 'proveedor', 'proveedor_nombre', 'tipo_compra',
            'numero_comprobante', 'tipo_comprobante', 'estado',
            'subtotal', 'impuesto', 'total', 'notas',
            'creado_en', 'actualizado_en', 'detalle', 'comprobante_archivo'
        ]
        read_only_fields = ['subtotal', 'impuesto', 'total', 'creado_en', 'actualizado_en']


class CompraCreateSerializer(serializers.ModelSerializer):
    detalle = DetalleCompraCreateSerializer(many=True, write_only=True)
    
    class Meta:
        model = Compra
        fields = [
            'proveedor', 'proveedor_nombre', 'tipo_compra',
            'numero_comprobante', 'tipo_comprobante', 'estado',
            'impuesto', 'notas', 'detalle', 'comprobante_archivo'
        ]
    
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
    class Meta:
        model = Compra
        fields = ['estado', 'notas', 'comprobante_archivo']
    
    def update(self, instance, validated_data):
        estado_anterior = instance.estado
        instance = super().update(instance, validated_data)
        
        # Registrar stock si cambió a confirmada
        if estado_anterior != 'CONFIRMADA' and instance.estado == 'CONFIRMADA':
            instance.registrar_stock()
        
        return instance
