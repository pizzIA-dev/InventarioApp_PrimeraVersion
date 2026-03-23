from rest_framework import serializers
from .models import Compra, DetalleCompra


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
        
        # Actualizar campos básicos
        instance = super().update(instance, validated_data)
        
        # Actualizar detalles si se proporcionan (Solo permitimos en BORRADOR para seguridad del stock)
        if detalle_data is not None and instance.estado == 'BORRADOR':
            instance.detallecompra_set.all().delete()
            for item in detalle_data:
                DetalleCompra.objects.create(compra=instance, **item)
        
        # Recalcular totales
        instance.calcular_totales()
        
        # Registrar stock si cambió a confirmada
        if estado_anterior != 'CONFIRMADA' and instance.estado == 'CONFIRMADA':
            instance.registrar_stock()
        
        return instance
