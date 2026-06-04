from decimal import Decimal
from rest_framework import serializers
from .models import ClienteFiado, Fiado, DetalleFiadoProducto, DetalleFiadoServicio, HistorialFiado
from apps.clientes.serializers import ClienteSerializer
from apps.inventario.serializers import ProductoSerializer
from apps.servicios.serializers import ServicioSerializer

class ClienteFiadoSerializer(serializers.ModelSerializer):
    total_fiados       = serializers.SerializerMethodField()
    total_deuda        = serializers.SerializerMethodField()
    tiene_fiados_activos = serializers.SerializerMethodField()
    ultimo_fiado       = serializers.SerializerMethodField()

    class Meta:
        model = ClienteFiado
        fields = '__all__'
        # extra read-only computed fields:
        extra_fields = ['total_fiados', 'total_deuda', 'tiene_fiados_activos', 'ultimo_fiado']

    def get_fields(self):
        fields = super().get_fields()
        # Ensure computed fields are always included
        return fields

    def get_total_fiados(self, obj):
        return obj.fiados.exclude(estado='CANCELADO').count()

    def get_total_deuda(self, obj):
        from decimal import Decimal
        total = sum(
            f.saldo_pendiente for f in obj.fiados.exclude(estado='CANCELADO')
        )
        return float(total)

    def get_tiene_fiados_activos(self, obj):
        return obj.fiados.filter(estado__in=['PENDIENTE', 'PAGADO_PARCIAL']).exists()

    def get_ultimo_fiado(self, obj):
        ultimo = obj.fiados.exclude(estado='CANCELADO').order_by('-creado_en').first()
        if ultimo:
            return str(ultimo.creado_en.date())
        return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['total_fiados'] = self.get_total_fiados(instance)
        ret['total_deuda'] = self.get_total_deuda(instance)
        ret['tiene_fiados_activos'] = self.get_tiene_fiados_activos(instance)
        ret['ultimo_fiado'] = self.get_ultimo_fiado(instance)
        return ret


class DetalleFiadoProductoSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)

    class Meta:
        model = DetalleFiadoProducto
        fields = '__all__'
        read_only_fields = ['subtotal']


class DetalleFiadoServicioSerializer(serializers.ModelSerializer):
    servicio_nombre = serializers.CharField(source='servicio.nombre', read_only=True)

    class Meta:
        model = DetalleFiadoServicio
        fields = '__all__'
        read_only_fields = ['subtotal']


class HistorialFiadoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()
    usuario_rol = serializers.SerializerMethodField()

    class Meta:
        model = HistorialFiado
        fields = '__all__'


    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return getattr(obj.usuario, "get_full_name", lambda: "")() or obj.usuario.username
        return "Sistema"

    def get_usuario_rol(self, obj):
        if obj.usuario and hasattr(obj.usuario, "perfil"):
            return obj.usuario.perfil.get_rol_display()
        return "-"

class FiadoSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.SerializerMethodField()
    cliente_documento = serializers.SerializerMethodField()

    def get_cliente_nombre(self, obj):
        if obj.cliente:
            return obj.cliente.nombre
        return ''

    def get_cliente_documento(self, obj):
        if obj.cliente:
            return obj.cliente.numero_documento or ''
        return ''
    detalles_producto = DetalleFiadoProductoSerializer(many=True, read_only=True)
    detalles_servicio = DetalleFiadoServicioSerializer(many=True, read_only=True)
    historial = HistorialFiadoSerializer(many=True, read_only=True)

    class Meta:
        model = Fiado
        fields = '__all__'
        read_only_fields = ['saldo_pendiente', 'estado', 'total']

class FiadoCreateSerializer(serializers.ModelSerializer):
    """Serializer especial para crear un fiado con sus detalles"""
    detalles = serializers.JSONField(write_only=True)

    class Meta:
        model = Fiado
        fields = ['cliente', 'tipo', 'fecha_limite', 'notas', 'detalles', 'empresa', 'subtotal', 'descuento', 'impuesto']
        extra_kwargs = {
            'fecha_limite': {'required': False, 'allow_null': True},
            'notas': {'required': False, 'allow_blank': True},
        }

    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles', [])
        # Extraer totales opcionales enviados (si no, se calculan abajo)
        subtotal_global = Decimal(str(validated_data.get('subtotal', 0)))
        descuento_global = Decimal(str(validated_data.get('descuento', 0)))
        impuesto_global = Decimal(str(validated_data.get('impuesto', 0)))
        
        fiado = Fiado.objects.create(**validated_data)
        
        total_calculado = Decimal('0')
        subtotal_acumulado = Decimal('0')
        
        if fiado.tipo == 'PRODUCTO':
            for item in detalles_data:
                cantidad = Decimal(str(item.get('cantidad', 0)))
                precio_unidad = Decimal(str(item.get('precio_unidad', 0)))
                descuento_item = Decimal(str(item.get('descuento', 0)))
                producto_id = item.get('producto')
                
                # Subtotal del ítem
                subtotal_item = (cantidad * precio_unidad) - descuento_item
                subtotal_acumulado += subtotal_item
                
                DetalleFiadoProducto.objects.create(
                    fiado=fiado,
                    producto_id=producto_id,
                    cantidad=cantidad,
                    precio_unidad=precio_unidad,
                    descuento=descuento_item,
                    subtotal=subtotal_item
                )
        elif fiado.tipo == 'SERVICIO':
            for item in detalles_data:
                precio = Decimal(str(item.get('precio', 0)))
                descuento_item = Decimal(str(item.get('descuento', 0)))
                servicio_id = item.get('servicio')
                subtotal_item = precio - descuento_item
                subtotal_acumulado += subtotal_item
                
                DetalleFiadoServicio.objects.create(
                    fiado=fiado,
                    servicio_id=servicio_id,
                    precio=precio,
                    descuento=descuento_item,
                    subtotal=subtotal_item
                )
        
        # Si no se pasó subtotal global, usar el acumulado
        if subtotal_global == 0:
            fiado.subtotal = subtotal_acumulado
        
        # El total final es: Subtotal - Descuento Global + Impuesto
        fiado.total = fiado.subtotal - fiado.descuento + fiado.impuesto
        fiado.saldo_pendiente = fiado.total
        fiado.save()
        
        # Registrar historial inicial con el total real
        HistorialFiado.objects.create(
            fiado=fiado,
            cliente=fiado.cliente,
            total_deuda=fiado.total,
            abono=0,
            saldo_restante=fiado.saldo_pendiente,
            estado_nuevo=fiado.estado,
            notas=f"Fiado registrado. Saldo inicial: S/ {fiado.total}"
        )
        
        return fiado
