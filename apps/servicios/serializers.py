from rest_framework import serializers
from .models import CategoriaServicio, Servicio, VentaServicio, MovimientoEstadoVentaServicio, MovimientoServicio


class CategoriaServicioSerializer(serializers.ModelSerializer):
    servicios_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CategoriaServicio
        fields = ['id', 'nombre', 'descripcion', 'activo', 'servicios_count']
        read_only_fields = ['servicios_count']
    
    def get_servicios_count(self, obj):
        return obj.servicios.filter(activo=True).count()


class ServicioSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    margen_ganancia = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = Servicio
        fields = [
            'id', 'codigo', 'nombre', 'descripcion', 'categoria', 'categoria_nombre',
            'precio_base', 'costo', 'duracion_minutos', 'margen_ganancia',
            'activo', 'creado_en', 'actualizado_en'
        ]
        read_only_fields = ['creado_en', 'actualizado_en']


class ServicioCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = [
            'id', 'nombre', 'descripcion', 'categoria',
            'precio_base', 'costo', 'duracion_minutos', 'activo'
        ]


class VentaServicioSerializer(serializers.ModelSerializer):
    servicio_nombre = serializers.CharField(source='servicio.nombre', read_only=True)
    cliente_nombre = serializers.SerializerMethodField()

    def get_cliente_nombre(self, obj):
        if obj.cliente_nombre:
            return obj.cliente_nombre
        return obj.cliente.nombre if obj.cliente else 'Sin Cliente'
    
    class Meta:
        model = VentaServicio
        fields = [
            'id', 'servicio', 'servicio_nombre', 'cliente', 'cliente_nombre',
            'numero_comprobante', 'numero_comprobante_simple', 'tipo_comprobante',
            'precio', 'descuento', 'impuesto', 'total',
            'fecha_programada', 'fecha_completado', 'estado', 'notas',
            'creado_en', 'actualizado_en'
        ]
        read_only_fields = ['total', 'creado_en', 'actualizado_en']


class VentaServicioCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VentaServicio
        fields = [
            'id', 'servicio', 'servicio_nombre', 'cliente', 'cliente_nombre',
            'numero_comprobante', 'numero_comprobante_simple', 'tipo_comprobante',
            'precio', 'descuento', 'impuesto', 'fecha_programada', 'estado', 'notas'
        ]

class MovimientoEstadoVentaServicioSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()
    usuario_rol = serializers.SerializerMethodField()

    class Meta:
        model = MovimientoEstadoVentaServicio
        fields = ['id', 'usuario', 'usuario_nombre', 'usuario_rol', 'estado_anterior', 'estado_nuevo', 'fecha', 'notas']


    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return getattr(obj.usuario, "get_full_name", lambda: "")() or obj.usuario.username
        return "Sistema"

    def get_usuario_rol(self, obj):
        if obj.usuario and hasattr(obj.usuario, "perfil"):
            return obj.usuario.perfil.get_rol_display()
        return "-"

class MovimientoServicioSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()
    usuario_rol = serializers.SerializerMethodField()

    class Meta:
        model = MovimientoServicio
        fields = [
            'id', 'usuario', 'usuario_nombre', 'usuario_rol', 'fecha', 'tipo', 'costo_anterior', 'costo_nuevo',
            'precio_anterior', 'precio_nuevo', 'activo_anterior', 'activo_nuevo', 'notas'
        ]

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return getattr(obj.usuario, "get_full_name", lambda: "")() or obj.usuario.username
        return "Sistema"

    def get_usuario_rol(self, obj):
        if obj.usuario and hasattr(obj.usuario, "perfil"):
            return obj.usuario.perfil.get_rol_display()
        return "-"



from .models import CompraServicio, MovimientoEstadoCompraServicio, ServicioContratado

class CompraServicioSerializer(serializers.ModelSerializer):
    servicio_nombre_display = serializers.CharField(source='servicio.nombre', read_only=True)
    proveedor_nombre_display = serializers.SerializerMethodField()

    def get_proveedor_nombre_display(self, obj):
        if obj.proveedor_nombre:
            return obj.proveedor_nombre
        return obj.proveedor.nombre if obj.proveedor else 'Sin Proveedor'
    
    class Meta:
        model = CompraServicio
        fields = [
            'id', 'servicio', 'servicio_nombre', 'servicio_nombre_display', 'proveedor', 'proveedor_nombre', 'proveedor_nombre_display',
            'numero_comprobante', 'numero_comprobante_simple', 'tipo_comprobante',
            'precio', 'descuento', 'impuesto', 'total',
            'fecha_programada', 'fecha_completado', 'estado', 'notas',
            'creado_en', 'actualizado_en'
        ]
        read_only_fields = ['total', 'creado_en', 'actualizado_en']

class CompraServicioCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompraServicio
        fields = [
            'id', 'servicio', 'servicio_nombre', 'proveedor', 'proveedor_nombre',
            'numero_comprobante', 'numero_comprobante_simple', 'tipo_comprobante',
            'precio', 'descuento', 'impuesto', 'fecha_programada', 'estado', 'notas'
        ]

class MovimientoEstadoCompraServicioSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()
    usuario_rol = serializers.SerializerMethodField()

    class Meta:
        model = MovimientoEstadoCompraServicio
        fields = ['id', 'usuario', 'usuario_nombre', 'usuario_rol', 'estado_anterior', 'estado_nuevo', 'fecha', 'notas']

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return getattr(obj.usuario, 'get_full_name', lambda: '')() or obj.usuario.username
        return 'Sistema'

    def get_usuario_rol(self, obj):
        if obj.usuario and hasattr(obj.usuario, 'perfil'):
            return obj.usuario.perfil.get_rol_display()
        return '-'


class ServicioContratadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicioContratado
        fields = ['id', 'nombre', 'descripcion', 'precio_referencia', 'activo', 'creado']
        read_only_fields = ['id', 'creado']
