from rest_framework import serializers
from .models import Proveedor, HistoricoPrecio, MovimientoProveedor


class ProveedorSerializer(serializers.ModelSerializer):
    total_compras = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    productos_count = serializers.SerializerMethodField()
    identificador = serializers.CharField() # Override to handle uniqueness in validate()
    
    class Meta:
        model = Proveedor
        fields = [
            'id', 'nombre', 'identificador', 'contacto', 'email', 'telefono', 'direccion',
            'categoria', 'tiene_contrato', 'detalles_contrato', 'dias_credito', 'limite_credito',
            'activo', 'creado_en', 'actualizado_en', 'total_compras', 'productos_count'
        ]
        read_only_fields = ['creado_en', 'actualizado_en', 'total_compras']
        validators = [] # Handle custom validation in validate()
        extra_kwargs = {
            'identificador': {
                'error_messages': {
                    'unique': 'El Documento (RUC/DNI) ya está registrado para otro proveedor'
                }
            }
        }
    
    def get_productos_count(self, obj):
        return obj.historico_precios.values('producto').distinct().count()

    def validate(self, data):
        identificador = data.get('identificador')
        
        # Check for duplicates (Document only)
        qs = Proveedor.objects.filter(identificador=identificador)
        
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
            
        if qs.exists():
            raise serializers.ValidationError({
                "identificador": ["El Documento (RUC/DNI) ya está registrado para otro proveedor"]
            })
            
        return data


class ProveedorCreateSerializer(serializers.ModelSerializer):
    identificador = serializers.CharField() # Override to handle uniqueness in validate()
    class Meta:
        model = Proveedor
        fields = [
            'id', 'nombre', 'identificador', 'contacto', 'email', 'telefono', 'direccion',
            'categoria', 'tiene_contrato', 'detalles_contrato', 'dias_credito', 'limite_credito', 'activo'
        ]
        validators = [] # Handle custom validation in validate()
        extra_kwargs = {
            'identificador': {
                'error_messages': {
                    'unique': 'El Documento (RUC/DNI) ya está registrado para otro proveedor'
                }
            }
        }

    def validate(self, data):
        identificador = data.get('identificador')
        
        # Check for duplicates (Document only)
        if Proveedor.objects.filter(identificador=identificador).exists():
            raise serializers.ValidationError({
                "identificador": ["El Documento (RUC/DNI) ya está registrado para otro proveedor"]
            })
            
        return data


class HistoricoPrecioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    
    class Meta:
        model = HistoricoPrecio
        fields = [
            'id', 'proveedor', 'proveedor_nombre', 'producto', 'producto_nombre', 
            'producto_codigo', 'precio_compra', 'cantidad', 'fecha', 'compra'
        ]
        read_only_fields = ['fecha']


class HistoricoPrecioPorProductoSerializer(serializers.ModelSerializer):
    """Histórico de precios para un producto específico"""
    class Meta:
        model = HistoricoPrecio
        fields = ['precio_compra', 'cantidad', 'fecha']

class MovimientoProveedorSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    proveedor_identificador = serializers.CharField(source='proveedor.identificador', read_only=True)

    class Meta:
        model = MovimientoProveedor
        fields = [
            'id', 'proveedor', 'proveedor_nombre', 'proveedor_identificador',
            'tipo', 'descripcion', 'fecha', 'activo_nuevo', 'contrato_nuevo'
        ]
        read_only_fields = ['fecha']
