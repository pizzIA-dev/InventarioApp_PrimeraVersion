from django.db import models
from django.core.validators import MinValueValidator


class TipoCapital(models.Model):
    """Tipo de capital (bien o dinero)"""
    TIPO_CHOICES = [
        ('DINERO', 'Dinero en Efectivo/Banco'),
        ('BIEN', 'Bien/Activo Fijo'),
    ]
    
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='tipos_capital', null=True)
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['nombre']
        verbose_name_plural = "Tipos de Capital"
    
    def __str__(self):
        return f"{self.nombre} ({self.tipo})"


class Capital(models.Model):
    """Registro de capital del negocio"""
    ESTADO_CHOICES = [
        ('ACTIVO', 'Activo'),
        ('INACTIVO', 'Inactivo'),
        ('VENDIDO', 'Vendido'),
    ]
    
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='activos_capital', null=True)
    tipo = models.ForeignKey(TipoCapital, on_delete=models.SET_NULL, null=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    
    # Valor
    valor_inicial = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    valor_actual = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    # Para bienes
    fecha_adquisicion = models.DateField(blank=True, null=True)
    vida_util_anios = models.PositiveIntegerField(blank=True, null=True)
    depreciacion_anual = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    
    # Para dinero
    cuenta = models.CharField(max_length=50, blank=True, null=True)  # Número de cuenta
    banco = models.CharField(max_length=100, blank=True, null=True)  # Nombre del banco
    
    # Control
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ACTIVO')
    notas = models.TextField(blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.nombre} - {self.valor_actual}"
    
    def calcular_depreciacion(self):
        """Calcula la depreciación anual para bienes"""
        if self.tipo and self.tipo.tipo == 'BIEN' and self.vida_util_anios:
            self.depreciacion_anual = self.valor_inicial / self.vida_util_anios
            self.save()
    
    @property
    def valor_total(self):
        """Valor total del capital"""
        return self.valor_actual


class MovimientoCapital(models.Model):
    """Registro de cambios en un capital (Kardex)"""
    capital = models.ForeignKey(
        Capital,
        on_delete=models.CASCADE,
        related_name='movimientos'
    )
    fecha = models.DateTimeField(auto_now_add=True)
    campo_modificado = models.CharField(max_length=100, blank=True, null=True)
    valor_anterior = models.CharField(max_length=200, blank=True, null=True)
    valor_nuevo = models.CharField(max_length=200, blank=True, null=True)
    
    # New specific tracking fields
    valor_inicial_ant = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    valor_inicial_nvo = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    valor_actual_ant = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    valor_actual_nvo = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    notas = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"Movimiento {self.capital.nombre} - {self.fecha}"
