from django.db import models
from django.core.validators import MinValueValidator, EmailValidator
from apps.inventario.models import Producto


class Proveedor(models.Model):
    """Proveedor de productos"""
    CATEGORIA_CHOICES = [
        ('MAYORISTA', 'Mayorista'),
        ('MINORISTA', 'Minorista'),
        ('PRODUCTOR', 'Productor/Fabricante'),
        ('IMPORTADOR', 'Importador'),
        ('DISTRIBUIDOR', 'Distribuidor'),
    ]
    
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='proveedores', null=True)
    nombre = models.CharField(max_length=200)
    identificador = models.CharField(max_length=20)  # RUC/DNI/NIT
    email = models.EmailField(blank=True, null=True, validators=[EmailValidator()])
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, default='MAYORISTA')
    
    # Contratos y condiciones
    tiene_contrato = models.BooleanField(default=False)
    detalles_contrato = models.TextField(blank=True, null=True)
    dias_credito = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    limite_credito = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    
    # Control
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['nombre']
        verbose_name_plural = "Proveedores"
    
    def __str__(self):
        return f"{self.nombre} ({self.identificador})"
    
    @property
    def total_compras(self):
        """Total comprado a este proveedor"""
        return sum(compra.total for compra in self.compras.all())
    
    @property
    def productos_suministrados(self):
        """Productos que ha suministrado"""
        return Producto.objects.filter(
            id__in=self.compras.values_list('detallecompra_set__producto_id', flat=True).distinct()
        )


class HistoricoPrecio(models.Model):
    """Histórico de precios de productos por proveedor"""
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='historico_precios_proveedor', null=True)
    proveedor = models.ForeignKey(
        Proveedor, 
        on_delete=models.CASCADE,
        related_name='historico_precios'
    )
    producto = models.ForeignKey(
        Producto, 
        on_delete=models.CASCADE,
        related_name='historico_precios'
    )
    precio_compra = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    cantidad = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    fecha = models.DateTimeField(auto_now_add=True)
    compra = models.ForeignKey(
        'compras.Compra', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='historico_precios'
    )
    
    class Meta:
        ordering = ['-fecha']
        verbose_name_plural = "Histórico de Precios"
    
    def __str__(self):
        return f"{self.producto.nombre} - {self.precio_compra} ({self.fecha})"
