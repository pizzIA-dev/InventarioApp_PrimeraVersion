from django.db import models
from django.core.validators import MinValueValidator
from apps.clientes.models import Cliente


class CategoriaServicio(models.Model):
    """Categoría de servicios"""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['nombre']
        verbose_name_plural = "Categorías de Servicios"
    
    def __str__(self):
        return self.nombre


class Servicio(models.Model):
    """Servicio ofrecido por el negocio"""
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    categoria = models.ForeignKey(
        CategoriaServicio, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='servicios'
    )
    
    # Precio
    precio_base = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    costo = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    duracion_minutos = models.PositiveIntegerField(blank=True, null=True)
    
    # Control
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.nombre} - {self.precio_base}"
    
    @property
    def margen_ganancia(self):
        """Calcula el margen de ganancia del servicio"""
        if self.costo > 0:
            return ((self.precio_base - self.costo) / self.costo) * 100
        return 0


class VentaServicio(models.Model):
    """Venta/Registro de un servicio realizado"""
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('EN_PROGRESO', 'En Progreso'),
        ('TERMINADO', 'Terminado'),
        ('CANCELADO', 'Cancelado'),
    ]
    
    servicio = models.ForeignKey(
        Servicio, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='ventas'
    )
    servicio_nombre = models.CharField(max_length=200, blank=True, null=True)
    
    cliente = models.ForeignKey(
        Cliente, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='servicios_contratados'
    )
    cliente_nombre = models.CharField(max_length=200, blank=True, null=True)
    
    # Precio
    precio = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    descuento = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    total = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    # Fechas
    fecha_programada = models.DateTimeField(blank=True, null=True)
    fecha_completado = models.DateTimeField(blank=True, null=True)
    
    # Control
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    notas = models.TextField(blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-creado_en']
    
    def __str__(self):
        return f"{self.servicio_nombre or self.servicio} - {self.cliente_nombre or 'Cliente'}"
    
    def save(self, *args, **kwargs):
        # Calcular total automáticamente
        self.total = self.precio - self.descuento
        super().save(*args, **kwargs)
    
    def terminar(self):
        """Marca el servicio como terminado"""
        from django.utils import timezone
        self.estado = 'TERMINADO'
        self.fecha_completado = timezone.now()
        self.save()

    def iniciar(self):
        """Marca el servicio como en progreso"""
        self.estado = 'EN_PROGRESO'
        self.save()

    # Alias completar as terminar for backward compatibility if needed, 
    # but we'll use terminar for clarity.
    def completar(self):
        self.terminar()
