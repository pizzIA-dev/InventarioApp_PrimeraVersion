from rest_framework import serializers
from decimal import Decimal
from django.utils import timezone
from .models import TipoCapital, Capital, MovimientoCapital


class TipoCapitalSerializer(serializers.ModelSerializer):
    capital_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TipoCapital
        fields = ['id', 'nombre', 'tipo', 'descripcion', 'activo', 'capital_count']
        read_only_fields = ['capital_count']
    
    def get_capital_count(self, obj):
        return Capital.objects.filter(tipo=obj, estado='ACTIVO').count()


class MovimientoCapitalSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoCapital
        fields = [
            'id', 'fecha', 'campo_modificado', 'valor_anterior', 'valor_nuevo', 
            'valor_inicial_ant', 'valor_inicial_nvo', 'valor_actual_ant', 'valor_actual_nvo',
            'notas'
        ]


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


# Helper to format values for history
def format_historial_value(field, value):
    if value is None:
        return "-"
    if field in ['valor_inicial', 'valor_actual', 'depreciacion_anual']:
        try:
            return f"S/. {float(value):.2f}"
        except:
            return str(value)
    return str(value)


# Fields to track for Kardex history
TRACKED_FIELDS = {
    'nombre': 'Nombre',
    'descripcion': 'Descripción',
    'valor_inicial': 'Valor Inicial',
    'valor_actual': 'Valor Actual',
    'estado': 'Estado',
    'tipo_id': 'Tipo',
    'fecha_adquisicion': 'Fecha Adquisición',
    'vida_util_anios': 'Vida Útil (años)',
    'cuenta': 'Cuenta',
    'banco': 'Banco',
    'notas': 'Notas',
}


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
        
        # Record initial creation movement with more detail
        val_inicial = format_historial_value('valor_inicial', instance.valor_inicial)
        val_actual = format_historial_value('valor_actual', instance.valor_actual)
        timestamp = timezone.localtime(timezone.now()).strftime('%d/%m/%Y %H:%M:%S')
        
        MovimientoCapital.objects.create(
            capital=instance,
            campo_modificado='Creación',
            valor_anterior=None,
            valor_nuevo=val_actual,
            # Specific value columns
            valor_inicial_ant=None,
            valor_inicial_nvo=instance.valor_inicial,
            valor_actual_ant=None,
            valor_actual_nvo=instance.valor_actual,
            notas=f"Registro inicial. V. Inicial: {val_inicial} | V. Actual: {val_actual} | Registrado: {timestamp}"
        )
        
        # Calculate depreciation if applicable
        if instance.tipo and instance.tipo.tipo == 'BIEN' and instance.vida_util_anios:
            instance.calcular_depreciacion()
        
        return instance


class CapitalUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Capital
        fields = [
            'tipo', 'nombre', 'descripcion',
            'valor_inicial', 'valor_actual', 'fecha_adquisicion', 'vida_util_anios',
            'cuenta', 'banco', 'estado', 'notas'
        ]
    
    def update(self, instance, validated_data):
        # Capture current state before update
        old_valor_inicial = instance.valor_inicial
        old_valor_actual = instance.valor_actual
        
        # Capture changes before saving
        changes = []
        for field, label in TRACKED_FIELDS.items():
            if field.replace('_id', '') not in validated_data:
                continue
                
            old_val = getattr(instance, field, None)
            new_val = validated_data.get(field.replace('_id', ''), None)
            
            # Handle FK fields
            if field == 'tipo_id':
                new_tipo = validated_data.get('tipo', None)
                new_val = new_tipo.id if new_tipo else None
                old_val = instance.tipo_id
            
            # Numeric comparison (avoid string precision issues)
            is_different = False
            if isinstance(old_val, (Decimal, float, int)) and isinstance(new_val, (Decimal, float, int)):
                is_different = Decimal(str(old_val)) != Decimal(str(new_val))
            else:
                is_different = str(old_val) != str(new_val)
            
            if is_different:
                # Format values for the note
                v_ant_fmt = format_historial_value(field, old_val)
                v_nvo_fmt = format_historial_value(field, new_val)
                
                changes.append({
                    'campo_modificado': label,
                    'valor_anterior': v_ant_fmt,
                    'valor_nuevo': v_nvo_fmt,
                    'notas': f"{label} actualizado: {v_ant_fmt} -> {v_nvo_fmt}",
                    'field_name': field 
                })
        
        instance = super().update(instance, validated_data)
        
        # Record each change as a movement
        for change in changes:
            field_name = change.pop('field_name', '')
            
            # Determine specific values for this movement
            v_ini_ant = old_valor_inicial
            v_ini_nvo = instance.valor_inicial
            v_act_ant = old_valor_actual
            v_act_nvo = instance.valor_actual
            
            MovimientoCapital.objects.create(
                capital=instance,
                valor_inicial_ant=v_ini_ant,
                valor_inicial_nvo=v_ini_nvo,
                valor_actual_ant=v_act_ant,
                valor_actual_nvo=v_act_nvo,
                **change
            )
        
        return instance
