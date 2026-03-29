from rest_framework import serializers
from .models import CategoriaTransaccion, Transaccion, MovimientoCategoria, HistorialTransaccion


class CategoriaTransaccionSerializer(serializers.ModelSerializer):
    transacciones_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CategoriaTransaccion
        fields = ['id', 'nombre', 'tipo', 'descripcion', 'activo', 'transacciones_count']
        read_only_fields = ['transacciones_count']
    
    def get_transacciones_count(self, obj):
        return obj.transacciones.count()


class TransaccionSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    
    class Meta:
        model = Transaccion
        fields = [
            'id', 'categoria', 'categoria_nombre', 'tipo', 'descripcion', 
            'monto', 'metodo_pago', 'referencia', 'fecha', 'notas',
            'creado_en', 'actualizado_en'
        ]
        read_only_fields = ['creado_en', 'actualizado_en']


class TransaccionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaccion
        fields = [
            'categoria', 'tipo', 'descripcion', 'monto',
            'metodo_pago', 'referencia', 'fecha', 'notas'
        ]
    
    def validate(self, data):
        # Asegurar consistencia entre tipo y categoría
        categoria = data.get('categoria')
        tipo = data.get('tipo')
        
        if categoria and tipo != categoria.tipo:
            raise serializers.ValidationError(
                "El tipo de transacción debe coincidir con el tipo de categoría"
            )
        
        return data


class MovimientoCategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoCategoria
        fields = '__all__'
        read_only_fields = ['id', 'fecha']


class HistorialTransaccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialTransaccion
        fields = '__all__'
        read_only_fields = ['id', 'fecha']
