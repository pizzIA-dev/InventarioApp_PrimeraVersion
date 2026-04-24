from rest_framework import serializers
from .models import RolPersonalizado, PerfilUsuario
from django.contrib.auth.models import User

class RolPersonalizadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolPersonalizado
        fields = '__all__'

# Actualizamos Perfil para que exponga info de roles
class PerfilUsuarioSerializer(serializers.ModelSerializer):
    rol_custom = RolPersonalizadoSerializer(read_only=True)
    rol_custom_id = serializers.PrimaryKeyRelatedField(
        queryset=RolPersonalizado.objects.all(), 
        source='rol_custom',
        write_only=True, 
        required=False, 
        allow_null=True
    )

    class Meta:
        model = PerfilUsuario
        fields = ['rol', 'rol_custom', 'rol_custom_id']
