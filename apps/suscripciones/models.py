from django.db import models
from apps.clientes_saas.models import Cliente

class Plan(models.Model):
    TIPO_PLAN_CHOICES = [
        ('EMPRENDEDOR', 'Emprendedor'),
        ('EMPRESARIO', 'Empresario'),
    ]
    nombre = models.CharField(max_length=50, choices=TIPO_PLAN_CHOICES, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    precio_mensual = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Límites del plan
    tiene_roles_avanzados = models.BooleanField(default=False)
    cobra_por_asiento = models.BooleanField(default=False)
    precio_asiento_extra = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    def __str__(self):
        return f"Plan {self.get_nombre_display()}"

class Suscripcion(models.Model):
    cliente = models.OneToOneField(Cliente, on_delete=models.CASCADE, related_name='suscripcion')
    plan = models.ForeignKey(Plan, on_delete=models.RESTRICT)
    activa = models.BooleanField(default=True)
    fecha_inicio = models.DateField(auto_now_add=True)
    fecha_fin = models.DateField(null=True, blank=True)
    
    # Facturación por asientos
    asientos_contratados = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.cliente.nombre} - {self.plan.nombre}"
