from rest_framework import serializers
from .models import Proveedor, HistoricoPrecio, MovimientoProveedor


class ProveedorSerializer(serializers.ModelSerializer):
    total_compras = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    productos_count = serializers.SerializerMethodField()
    identificador = serializers.CharField() # Override to handle uniqueness in validate()
    
    class Meta:
        model = Proveedor
        fields = [
            'id', 'nombre', 'tipo_proveedor', 'tipo_documento', 'identificador', 'contacto', 'email', 'telefono', 'direccion',
            'categoria', 'tiene_contrato', 'detalles_contrato', 'dias_credito', 'limite_credito',
            'activo', 'creado_en', 'actualizado_en', 'total_compras', 'productos_count'
        ]
        read_only_fields = ['creado_en', 'actualizado_en', 'total_compras']
        validators = []
        extra_kwargs = {
            'identificador': {
                'error_messages': {
                    'unique': 'El Documento ya está registrado para otro proveedor'
                }
            }
        }
    
    def get_productos_count(self, obj):
        return obj.historico_precios.values('producto').distinct().count()

    def validate_identificador(self, value):
        val = value.strip().upper()
        tipo = self.initial_data.get('tipo_documento')
        
        if tipo == 'DNI':
            if not val.isdigit() or len(val) != 8:
                raise serializers.ValidationError("El DNI debe tener exactamente 8 números.")
        elif tipo == 'RUC':
            if not val.isdigit() or len(val) != 11:
                raise serializers.ValidationError("El RUC debe tener exactamente 11 números.")
        
        return val

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
            'id', 'nombre', 'tipo_proveedor', 'tipo_documento', 'identificador', 'contacto', 'email', 'telefono', 'direccion',
            'categoria', 'tiene_contrato', 'detalles_contrato', 'dias_credito', 'limite_credito', 'activo'
        ]
        validators = []
        extra_kwargs = {
            'identificador': {
                'error_messages': {
                    'unique': 'El Documento ya está registrado para otro proveedor'
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
    usuario_nombre = serializers.SerializerMethodField()
    usuario_rol = serializers.SerializerMethodField()

    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    proveedor_identificador = serializers.CharField(source='proveedor.identificador', read_only=True)

    class Meta:
        model = MovimientoProveedor
        fields = [
            'id', 'usuario', 'usuario_nombre', 'usuario_rol', 'proveedor', 'proveedor_nombre', 'proveedor_identificador',
            'tipo', 'descripcion', 'fecha', 'activo_nuevo', 'contrato_nuevo'
        ]
        read_only_fields = ['fecha']

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return getattr(obj.usuario, "get_full_name", lambda: "")() or obj.usuario.username
        return "Sistema"

    def get_usuario_rol(self, obj):
        if obj.usuario and hasattr(obj.usuario, "perfil"):
            return obj.usuario.perfil.get_rol_display()
        return "-"
