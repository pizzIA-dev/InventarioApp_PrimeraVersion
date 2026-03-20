from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.clientes.models import Cliente
from apps.inventario.models import Producto, MovimientoStock


class Venta(models.Model):
    """Venta a cliente"""
    ESTADO_CHOICES = [
        ('BORRADOR', 'Borrador'),
        ('CONFIRMADA', 'Confirmada'),
        ('CANCELADA', 'Cancelada'),
    ]
    
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='ventas', null=True)
    cliente = models.ForeignKey(
        Cliente, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='ventas'
    )
    cliente_nombre = models.CharField(max_length=200, blank=True, null=True)
    
    # Documento
    numero_comprobante = models.CharField(max_length=50, blank=True, null=True)
    tipo_comprobante = models.CharField(max_length=50, blank=True, null=True)
    comprobante_archivo = models.FileField(upload_to='comprobantes/ventas/', null=True, blank=True)
    
    # Estado
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='BORRADOR')
    
    # Totales
    subtotal = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    descuento = models.DecimalField(
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
        return f"Venta {self.numero_comprobante or self.id} - {self.cliente_nombre or self.cliente}"
    
    def calcular_totales(self):
        """Calcula los totales de la venta"""
        self.subtotal = sum(detalle.subtotal for detalle in self.detalleventa_set.all())
        self.total = self.subtotal - self.descuento + self.impuesto
        self.save()
    
    def registrar_salida_stock(self):
        """Registra la salida de stock por esta venta"""
        if self.estado == 'CONFIRMADA':
            for detalle in self.detalleventa_set.all():
                # Crear movimiento de stock
                MovimientoStock.objects.create(
                    producto=detalle.producto,
                    tipo='SALIDA',
                    origen='VENTA',
                    cantidad=detalle.cantidad,
                    stock_anterior=detalle.producto.stock_actual,
                    precio_unitario=detalle.precio_venta,
                    referencia=f"Venta {self.numero_comprobante or self.id}"
                )


class DetalleVenta(models.Model):
    """Detalle de productos en una venta"""
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='detalles_venta', null=True)
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='detalleventa_set')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    precio_venta = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    descuento = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
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
        self.subtotal = (self.cantidad * self.precio_venta) - self.descuento
        super().save(*args, **kwargs)
