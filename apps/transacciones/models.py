from django.db import models
from django.core.validators import MinValueValidator


class CategoriaTransaccion(models.Model):
    """Categoría de transacción (ingreso o egreso)"""
    TIPO_CHOICES = [
        ('INGRESO', 'Ingreso'),
        ('EGRESO', 'Egreso'),
    ]
    
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='categorias_transaccion', null=True)
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['tipo', 'nombre']
        verbose_name_plural = "Categorías de Transacciones"
    
    def __str__(self):
        return f"{self.nombre} ({self.tipo})"


class Transaccion(models.Model):
    """Transacción independiente (ingreso o egreso)"""
    TIPO_CHOICES = [
        ('INGRESO', 'Ingreso'),
        ('EGRESO', 'Egreso'),
    ]
    
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='transacciones', null=True)
    categoria = models.ForeignKey(
        CategoriaTransaccion, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='transacciones'
    )
    
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    descripcion = models.CharField(max_length=200)
    monto = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    # Método de pago
    METODO_PAGO_CHOICES = [
        ('EFECTIVO', 'Efectivo'),
        ('TARJETA', 'Tarjeta'),
        ('TRANSFERENCIA', 'Transferencia'),
        ('YAPE', 'Yape/Plin'),
        ('CHEQUE', 'Cheque'),
        ('OTRO', 'Otro'),
    ]
    metodo_pago = models.CharField(
        max_length=20, 
        choices=METODO_PAGO_CHOICES, 
        default='EFECTIVO'
    )
    referencia = models.CharField(max_length=100, blank=True, null=True)  # Nro de operación
    
    # Fecha
    fecha = models.DateTimeField()
    
    # Control
    notas = models.TextField(blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-fecha']
    
    def __str__(self):
        return f"{self.tipo} - {self.descripcion} - {self.monto}"
    
    def save(self, *args, **kwargs):
        # Asegurar que el tipo coincida con la categoría
        if self.categoria and self.tipo != self.categoria.tipo:
            self.tipo = self.categoria.tipo
        super().save(*args, **kwargs)
