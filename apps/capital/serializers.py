from rest_framework import serializers
from .models import TipoCapital, Capital


class TipoCapitalSerializer(serializers.ModelSerializer):
    capital_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TipoCapital
        fields = ['id', 'nombre', 'tipo', 'descripcion', 'activo', 'capital_count']
        read_only_fields = ['capital_count']
    
    def get_capital_count(self, obj):
        return Capital.objects.filter(tipo=obj, estado='ACTIVO').count()


class CapitalSerializer(serializers.ModelSerializer):
    tipo_nombre = serializers.CharField(source='tipo.nombre', read_only=True)
    tipo_tipo = serializers.CharField(source='tipo.tipo', read_only=True)
    
    class Meta:
        model = Capital
        fields = [
            'id', 'tipo', 'tipo_nombre', 'tipo_tipo', 'nombre', 'descripcion',
            'valor_inicial', 'valor_actual', 'fecha_adquisicion', 'vida_util_anios',
            'depreciacion_anual', 'cuenta', 'banco', 'estado', 'notas',
            'creado_en', 'actualizado_en'
        ]
        read_only_fields = ['creado_en', 'actualizado_en']


class CapitalCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Capital
        fields = [
            'tipo', 'nombre', 'descripcion',
            'valor_inicial', 'valor_actual', 'fecha_adquisicion', 'vida_util_anios',
            'cuenta', 'banco', 'estado', 'notas'
        ]
    
    def create(self, validated_data):
        instance = super().create(validated_data)
        
        # Calcular depreciación si es un bien
        if instance.tipo and instance.tipo.tipo == 'BIEN' and instance.vida_util_anios:
            instance.calcular_depreciacion()
        
        return instance
