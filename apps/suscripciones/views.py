from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import Plan
from rest_framework import serializers

class PlanSerializer(serializers.ModelSerializer):
    nombre_display = serializers.CharField(source='get_nombre_display', read_only=True)
    class Meta:
        model = Plan
        fields = ['id', 'nombre', 'nombre_display', 'descripcion', 'precio_mensual',
                  'tiene_roles_avanzados', 'cobra_por_asiento', 'precio_asiento_extra']

class PlanListView(generics.ListAPIView):
    queryset = Plan.objects.all().order_by('precio_mensual')
    serializer_class = PlanSerializer
    permission_classes = [AllowAny]
