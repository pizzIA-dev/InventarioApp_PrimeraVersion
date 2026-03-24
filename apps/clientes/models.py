from django.db import models
from django.core.validators import MinValueValidator


class Cliente(models.Model):
    """Cliente (persona, negocio o empresa)"""
    TIPO_CLIENTE_CHOICES = [
        ('PERSONA', 'Persona Natural'),
        ('NEGOCIO', 'Negocio'),
        ('EMPRESA', 'Empresa'),
    ]
    
    TIPO_DOCUMENTO_CHOICES = [
        ('DNI', 'DNI'),
        ('RUC', 'RUC'),
        ('NIT', 'NIT'),
        ('CE', 'Carnet de Extranjería'),
        ('PASAPORTE', 'Pasaporte'),
    ]
    
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='clientes', null=True)
    nombre = models.CharField(max_length=200)
    tipo_cliente = models.CharField(max_length=10, choices=TIPO_CLIENTE_CHOICES, default='PERSONA')
    tipo_documento = models.CharField(max_length=20, choices=TIPO_DOCUMENTO_CHOICES, default='DNI')
    numero_documento = models.CharField(max_length=20, unique=True)
    
    # Contacto
    contacto = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    
    # Control
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['nombre']
        verbose_name_plural = "Clientes"
    
    def __str__(self):
        return f"{self.nombre} ({self.numero_documento})"
    
    @property
    def recurrencia(self):
        """Número de compras realizadas (solo confirmadas)"""
        return self.ventas.filter(estado='CONFIRMADA').count()
    
    @property
    def total_comprado(self):
        """Total comprado por el cliente (solo confirmadas)"""
        return sum(venta.total for venta in self.ventas.filter(estado='CONFIRMADA'))
    
    @property
    def ultima_compra(self):
        """Fecha de la última compra (solo confirmadas)"""
        ultima_venta = self.ventas.filter(estado='CONFIRMADA').order_by('-creado_en').first()
        return ultima_venta.creado_en if ultima_venta else None


class SegmentoCliente(models.Model):
    """Segmentación de clientes"""
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='segmentos_cliente', null=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    descuento_por_defecto = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    activo = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre
