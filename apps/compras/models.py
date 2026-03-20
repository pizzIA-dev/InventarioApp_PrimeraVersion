from django.db import models
from django.core.validators import MinValueValidator
from apps.proveedores.models import Proveedor
from apps.inventario.models import Producto, MovimientoStock


class Compra(models.Model):
    """Compra a proveedor o al por menor"""
    ESTADO_CHOICES = [
        ('BORRADOR', 'Borrador'),
        ('CONFIRMADA', 'Confirmada'),
        ('CANCELADA', 'Cancelada'),
    ]
    
    TIPO_COMPRA_CHOICES = [
        ('PROVEEDOR', 'Compra a Proveedor'),
        ('MINORISTA', 'Compra al por menor'),
    ]
    
    proveedor = models.ForeignKey(
        Proveedor, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='compras'
    )
    proveedor_nombre = models.CharField(max_length=200, blank=True, null=True)
    tipo_compra = models.CharField(max_length=20, choices=TIPO_COMPRA_CHOICES, default='PROVEEDOR')
    
    # Documento
    numero_comprobante = models.CharField(max_length=50, blank=True, null=True)
    tipo_comprobante = models.CharField(max_length=50, blank=True, null=True)
    
    # Estado
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='BORRADOR')
    
    # Totales
    subtotal = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    impuesto = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    total = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    
    # Control
    notas = models.TextField(blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-creado_en']
    
    def __str__(self):
        return f"Compra {self.numero_comprobante or self.id} - {self.proveedor_nombre or self.proveedor}"
    
    def calcular_totales(self):
        """Calcula los totales de la compra"""
        self.subtotal = sum(detalle.subtotal for detalle in self.detallecompra_set.all())
        self.total = self.subtotal + self.impuesto
        self.save()
    
    def registrar_stock(self):
        """Registra el ingreso de stock por esta compra"""
        if self.estado == 'CONFIRMADA':
            for detalle in self.detallecompra_set.all():
                # Crear movimiento de stock
                MovimientoStock.objects.create(
                    producto=detalle.producto,
                    tipo='ENTRADA',
                    origen='COMPRA',
                    cantidad=detalle.cantidad,
                    stock_anterior=detalle.producto.stock_actual,
                    precio_unitario=detalle.precio_compra,
                    referencia=f"Compra {self.numero_comprobante or self.id}"
                )


class DetalleCompra(models.Model):
    """Detalle de productos en una compra"""
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    precio_compra = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    subtotal = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    class Meta:
        ordering = ['producto__nombre']
    
    def __str__(self):
        return f"{self.producto.nombre} x {self.cantidad}"
    
    def save(self, *args, **kwargs):
        # Calcular subtotal automáticamente
        self.subtotal = self.cantidad * self.precio_compra
        super().save(*args, **kwargs)
