from rest_framework import serializers
from .models import Venta, DetalleVenta, MovimientoEstadoVenta


class DetalleVentaSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    
    class Meta:
        model = DetalleVenta
        fields = [
            'id', 'producto', 'producto_nombre', 'producto_codigo',
            'cantidad', 'precio_venta', 'descuento', 'subtotal'
        ]
        read_only_fields = ['subtotal']


class DetalleVentaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalleVenta
        fields = ['producto', 'cantidad', 'precio_venta', 'descuento']
    
    def validate(self, data):
        # Solo validar stock al crear ventas nuevas (no al editar)
        # Esto se controla desde el contexto del serializador padre
        if self.context.get('skip_stock_validation'):
            return data
        
        producto = data.get('producto')
        cantidad = data.get('cantidad')
        
        # Validar stock suficiente
        if producto and producto.stock_actual < cantidad:
            raise serializers.ValidationError(
                f"Stock insuficiente para '{producto.nombre}'. Stock actual: {producto.stock_actual}"
            )
        
        return data


class VentaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)
    cliente_documento = serializers.CharField(source='cliente.numero_documento', read_only=True)
    detalle = DetalleVentaSerializer(source='detalleventa_set', many=True, read_only=True)
    
    class Meta:
        model = Venta
        fields = [
            'id', 'cliente', 'cliente_nombre', 'cliente_documento',
            'numero_comprobante', 'numero_comprobante_simple', 'tipo_comprobante', 'estado',
            'subtotal', 'descuento', 'impuesto', 'total', 'notas',
            'creado_en', 'actualizado_en', 'detalle', 'comprobante_archivo'
        ]
        read_only_fields = ['subtotal', 'descuento', 'impuesto', 'total', 'creado_en', 'actualizado_en']


class VentaCreateSerializer(serializers.ModelSerializer):
    detalle = DetalleVentaCreateSerializer(many=True, write_only=True)
    
    class Meta:
        model = Venta
        fields = [
            'cliente', 'cliente_nombre',
            'numero_comprobante', 'numero_comprobante_simple', 'tipo_comprobante', 'estado',
            'descuento', 'impuesto', 'notas', 'detalle', 'comprobante_archivo'
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
        
        # Crear venta
        venta = Venta.objects.create(**validated_data)
        
        # Crear detalles
        for item in detalle_data:
            DetalleVenta.objects.create(venta=venta, **item)
        
        # Calcular totales
        venta.calcular_totales()
        
        # Registrar salida de stock si está confirmada
        if venta.estado == 'CONFIRMADA':
            venta.registrar_salida_stock()
        
        return venta


class VentaUpdateSerializer(serializers.ModelSerializer):
    detalle = DetalleVentaCreateSerializer(many=True, write_only=True, required=False)
    
    class Meta:
        model = Venta
        fields = [
            'cliente', 'cliente_nombre', 'numero_comprobante', 'numero_comprobante_simple', 'tipo_comprobante',
            'estado', 'descuento', 'impuesto', 'notas', 'detalle', 'comprobante_archivo'
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
    
    def get_fields(self):
        fields = super().get_fields()
        # Pass skip_stock_validation to nested detalle serializers
        for field in fields.values():
            if hasattr(field, 'child') and isinstance(field.child, DetalleVentaCreateSerializer):
                field.child.context.update({'skip_stock_validation': True})
        return fields
    
    def update(self, instance, validated_data):
        detalle_data = validated_data.pop('detalle', None)
        estado_anterior = instance.estado
        
        # Actualizar campos de la venta
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Si se enviaron detalles, reemplazar los existentes
        if detalle_data is not None:
            instance.detalleventa_set.all().delete()
            for item in detalle_data:
                DetalleVenta.objects.create(venta=instance, **item)
            instance.calcular_totales()
        
        # Registrar salida de stock si cambio a confirmada
        if estado_anterior != 'CONFIRMADA' and instance.estado == 'CONFIRMADA':
            instance.registrar_salida_stock()
        
        return instance

class MovimientoEstadoVentaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoEstadoVenta
        fields = ['id', 'estado_anterior', 'estado_nuevo', 'fecha', 'notas']


class VentaKardexSerializer(serializers.ModelSerializer):
    fecha = serializers.DateTimeField(source='venta.creado_en', read_only=True)
    tipo_comprobante_simple = serializers.SerializerMethodField()
    numero_comprobante_simple = serializers.CharField(source='venta.numero_comprobante_simple', read_only=True)
    tipo_comprobante = serializers.SerializerMethodField()
    comprobante = serializers.CharField(source='venta.numero_comprobante', read_only=True)
    cliente = serializers.SerializerMethodField()
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    precio_unitario = serializers.DecimalField(source='precio_venta', max_digits=10, decimal_places=2, read_only=True)
    total = serializers.DecimalField(source='subtotal', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = DetalleVenta
        fields = [
            'fecha', 'tipo_comprobante_simple', 'numero_comprobante_simple', 
            'tipo_comprobante', 'comprobante', 'cliente',
            'producto_nombre', 'producto_codigo', 'cantidad', 'precio_unitario', 'descuento', 'total'
        ]

    def get_tipo_comprobante_simple(self, obj):
        return "COMPROBANTE SIMPLE"

    def get_tipo_comprobante(self, obj):
        tipo = obj.venta.tipo_comprobante
        return tipo if tipo and tipo != 'SIMPLE' else ""

    def get_cliente(self, obj):
        return obj.venta.cliente_nombre or (obj.venta.cliente.nombre if obj.venta.cliente else "Cliente General")
