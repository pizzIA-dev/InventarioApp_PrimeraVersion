from rest_framework import serializers
from .models import Cliente, SegmentoCliente


class ClienteSerializer(serializers.ModelSerializer):
    recurrencia = serializers.IntegerField(read_only=True)
    total_comprado = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    ultima_compra = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = Cliente
        fields = [
            'id', 'nombre', 'tipo_cliente', 'tipo_documento', 'numero_documento',
            'contacto', 'email', 'telefono', 'direccion',
            'activo', 'creado_en', 'actualizado_en',
            'recurrencia', 'total_comprado', 'ultima_compra'
        ]
        read_only_fields = ['creado_en', 'actualizado_en']
    
    def validate_numero_documento(self, value):
        # Primero limpiamos el valor (uppercase y quitar espacios)
        val = value.strip().upper()
        tipo = self.initial_data.get('tipo_documento')
        
        if tipo == 'DNI':
            if not val.isdigit() or len(val) != 8:
                raise serializers.ValidationError("El DNI debe tener exactamente 8 números.")
        elif tipo == 'RUC':
            if not val.isdigit() or len(val) != 11:
                raise serializers.ValidationError("El RUC debe tener exactamente 11 números.")
        
        return val


class ClienteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = [
            'id', 'nombre', 'tipo_cliente', 'tipo_documento', 'numero_documento',
            'contacto', 'email', 'telefono', 'direccion', 'activo'
        ]


class SegmentoClienteSerializer(serializers.ModelSerializer):
    clientes_count = serializers.SerializerMethodField()
    
    class Meta:
        model = SegmentoCliente
        fields = ['id', 'nombre', 'descripcion', 'descuento_por_defecto', 'activo', 'clientes_count']
        read_only_fields = ['clientes_count']
    
    def get_clientes_count(self, obj):
        return Cliente.objects.filter(activo=True).count()
