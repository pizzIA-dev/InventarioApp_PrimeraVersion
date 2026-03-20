from rest_framework import serializers
from .models import Venta, DetalleVenta


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
            'numero_comprobante', 'tipo_comprobante', 'estado',
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
            'numero_comprobante', 'tipo_comprobante', 'estado',
            'descuento', 'impuesto', 'notas', 'detalle', 'comprobante_archivo'
        ]
    
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
            'cliente', 'cliente_nombre', 'numero_comprobante', 'tipo_comprobante',
            'estado', 'descuento', 'impuesto', 'notas', 'detalle', 'comprobante_archivo'
        ]
    
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
