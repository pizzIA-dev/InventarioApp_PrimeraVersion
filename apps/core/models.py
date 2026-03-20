from django.db import models
from django.utils import timezone

class Empresa(models.Model):
    nombre = models.CharField(max_length=255)
    ruc = models.CharField(max_length=30, blank=True, null=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    telefono = models.CharField(max_length=50, blank=True, null=True)
    fecha_registro = models.DateTimeField(default=timezone.now)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'core_empresa'
        verbose_name_plural = 'Empresas'

    def __str__(self):
        return self.nombre
