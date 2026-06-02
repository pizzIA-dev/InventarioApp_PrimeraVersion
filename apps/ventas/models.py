from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.clientes.models import Cliente
from apps.inventario.models import Producto, MovimientoStock
from django.utils import timezone


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
    numero_comprobante_simple = models.CharField(max_length=50, blank=True, null=True)
    numero_comprobante = models.CharField(max_length=50, blank=True, null=True)
    tipo_comprobante = models.CharField(max_length=50, blank=True, null=True)
    comprobante_archivo = models.FileField(upload_to='comprobantes/ventas/', null=True, blank=True)
    
    # Estado
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='BORRADOR', db_index=True)
    
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
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    notas = models.TextField(blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True, db_index=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-creado_en']
    
    def __str__(self):
        return f"Venta {self.numero_comprobante or self.id} - {self.cliente_nombre or self.cliente}"
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_estado = None
        
        # Auditoría de usuario
        if is_new and getattr(self, "usuario_id", None) is None:
            from apps.core.middleware import get_current_user
            user = get_current_user()
            if user and user.is_authenticated:
                self.usuario = user

        if not is_new:
            try:
                old_instance = Venta.objects.get(pk=self.pk)
                old_estado = old_instance.estado
            except Venta.DoesNotExist:
                pass

        # Calculate totals
        if self.pk: # Only if it already exists or we have details
             self.subtotal = sum(detalle.subtotal for detalle in self.detalleventa_set.all())
        self.total = self.subtotal - self.descuento + self.impuesto
        
        super().save(*args, **kwargs)

        # Log status change
        if is_new:
            now_str = timezone.localtime().strftime("%d/%m/%Y a las %H:%M:%S")
            MovimientoEstadoVenta.objects.create(
                venta=self,
                estado_anterior='N/A',
                estado_nuevo=self.estado,
                notas=f'Registro inicial de la venta ({self.estado.capitalize()}) el {now_str}'
            )
        elif old_estado and old_estado != self.estado:
            now_str = timezone.localtime().strftime("%d/%m/%Y a las %H:%M:%S")
            MovimientoEstadoVenta.objects.create(
                venta=self,
                estado_anterior=old_estado,
                estado_nuevo=self.estado,
                notas=f'Cambió de {old_estado.capitalize()} a {self.estado.capitalize()} el {now_str}'
            )

    def calcular_totales(self):
        """Calcula los totales de la venta (Legacy method, now handled in save)"""
        self.save()
    
    def registrar_salida_stock(self):
        """
        Registra la salida de inventario para cada producto en la venta.
        """
        from apps.inventario.models import MovimientoStock
        

        for detalle in self.detalleventa_set.all():
            # MovimientoStock.save() actualiza el stock atomicamente - no hacerlo manualmente
            MovimientoStock.objects.create(
                empresa=self.empresa,
                producto=detalle.producto,
                tipo='SALIDA',
                origen='VENTA',
                cantidad=detalle.cantidad,
                precio_unitario=detalle.precio_venta,
                referencia=str(self.numero_comprobante_simple or self.numero_comprobante or self.id),
                usuario=self.usuario,
            )


    def revertir_stock(self):
        """
        Revierte la salida de inventario cuando se cancela una venta.
        MovimientoStock.save() maneja la actualizacion atomica del stock.
        """
        from apps.inventario.models import MovimientoStock
        
        for detalle in self.detalleventa_set.all():
            MovimientoStock.objects.create(
                empresa=self.empresa,
                producto=detalle.producto,
                tipo='ENTRADA',
                origen='DEVOLUCION',
                cantidad=detalle.cantidad,
                precio_unitario=detalle.precio_venta,
                referencia=str(self.numero_comprobante_simple or self.numero_comprobante or self.id),
                usuario=self.usuario,
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


class MovimientoEstadoVenta(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    """Historial de cambios de estado de una venta de productos"""
    venta = models.ForeignKey(
        Venta, 
        on_delete=models.CASCADE, 
        related_name='movimientos_estado'
    )
    estado_anterior = models.CharField(max_length=20)
    estado_nuevo = models.CharField(max_length=20)
    fecha = models.DateTimeField(auto_now_add=True)
    notas = models.TextField(blank=True, null=True)
    razon_tag = models.CharField(
        max_length=30,
        blank=True, null=True,
        choices=[
            ('CONFUSION', 'Confusión en el pedido'),
            ('ARREPENTIMIENTO', 'El cliente se arrepintió'),
            ('SIN_STOCK', 'Sin stock disponible'),
            ('PRECIO', 'Desacuerdo en el precio'),
            ('DUPLICADO', 'Registro duplicado'),
            ('ERROR_SISTEMA', 'Error del sistema'),
            ('OTRO', 'Otro motivo'),
        ]
    )
    razon_detalle = models.TextField(blank=True, null=True, help_text='Detalle libre del motivo de cancelación')
    

    def save(self, *args, **kwargs):
        if getattr(self, "usuario_id", None) is None:
            from apps.core.middleware import get_current_user
            user = get_current_user()
            if user and user.is_authenticated:
                self.usuario = user
        super().save(*args, **kwargs)
    class Meta:
        ordering = ['-fecha']
        verbose_name_plural = "Movimientos de Estado de Venta"
    
    def __str__(self):
        return f"Venta {self.venta.id}: {self.estado_anterior} -> {self.estado_nuevo}"
