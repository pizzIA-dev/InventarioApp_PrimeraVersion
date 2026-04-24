from rest_framework import serializers
from .models import Cliente
from apps.suscripciones.models import Plan
from django.contrib.auth import get_user_model

class RegistroSaaSSerializer(serializers.Serializer):
    nombre_empresa = serializers.CharField(max_length=100)
    subdominio = serializers.CharField(max_length=50)
    email_admin = serializers.EmailField()
    password_admin = serializers.CharField(write_only=True, min_length=6)
    plan_id = serializers.PrimaryKeyRelatedField(queryset=Plan.objects.all())
    ruc = serializers.CharField(max_length=30, required=False, allow_blank=True)
    logo = serializers.ImageField(required=False, allow_null=True)

    def validate_subdominio(self, value):
        value = value.lower().strip()
        if not value.isalnum():
            raise serializers.ValidationError("El subdominio solo puede contener letras y números.")
        if Cliente.objects.filter(schema_name=value).exists():
            raise serializers.ValidationError("Este subdominio ya está en uso.")
        # Campos reservados
        if value in ['www', 'public', 'api', 'admin']:
            raise serializers.ValidationError("Subdominio reservado.")
        return value
