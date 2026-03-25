from rest_framework import serializers
from .models import CategoriaServicio, Servicio, VentaServicio


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
            'id', 'nombre', 'descripcion', 'categoria', 'categoria_nombre',
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
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)
    
    class Meta:
        model = VentaServicio
        fields = [
            'id', 'servicio', 'servicio_nombre', 'cliente', 'cliente_nombre',
            'numero_comprobante', 'tipo_comprobante',
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
            'numero_comprobante', 'tipo_comprobante',
            'precio', 'descuento', 'impuesto', 'fecha_programada', 'estado', 'notas'
        ]
