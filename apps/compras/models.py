from django.conf import settings
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
    
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='compras_empresa', null=True)
    proveedor = models.ForeignKey(
        Proveedor, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='compras'
    )
    proveedor_nombre = models.CharField(max_length=200, blank=True, null=True)
    tipo_compra = models.CharField(max_length=20, choices=TIPO_COMPRA_CHOICES, default='PROVEEDOR', db_index=True)
    
    # Documento
    numero_comprobante = models.CharField(max_length=50, blank=True, null=True)
    tipo_comprobante = models.CharField(max_length=50, blank=True, null=True)
    comprobante_archivo = models.FileField(upload_to='comprobantes/compras/', null=True, blank=True)
    
    # Estado
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='BORRADOR', db_index=True)
    
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
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    notas = models.TextField(blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True, db_index=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-creado_en']
    
    def __str__(self):
        return f"Compra {self.numero_comprobante or self.id} - {self.proveedor_nombre or self.proveedor}"
    
    def calcular_totales(self):
        """Calcula los totales de la compra"""
        # Sumar los subtotales de los detalles (que ya incluyen descuentos)
        self.subtotal = sum(detalle.subtotal for detalle in self.detallecompra_set.all())
        # El total es el subtotal (ya con descuentos) más el impuesto
        self.total = self.subtotal + self.impuesto
        self.save()

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
                old_instance = Compra.objects.get(pk=self.pk)
                old_estado = old_instance.estado
            except Compra.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        # Log status change
        if is_new:
            from django.utils import timezone
            now_str = timezone.localtime().strftime("%d/%m/%Y a las %H:%M:%S")
            MovimientoEstadoCompra.objects.create(
                compra=self,
                estado_anterior='N/A',
                estado_nuevo=self.estado,
                notas=f'Registro inicial de la compra ({self.estado.capitalize()}) el {now_str}'
            )
        elif old_estado and old_estado != self.estado:
            from django.utils import timezone
            now_str = timezone.localtime().strftime("%d/%m/%Y a las %H:%M:%S")
            MovimientoEstadoCompra.objects.create(
                compra=self,
                estado_anterior=old_estado,
                estado_nuevo=self.estado,
                notas=f'Cambió de {old_estado.capitalize()} a {self.estado.capitalize()} el {now_str}'
            )
    
    def registrar_stock(self):
        """Registra el ingreso de stock por esta compra"""
        if self.estado == 'CONFIRMADA':
            from apps.inventario.models import MovimientoStock
            
            for detalle in self.detallecompra_set.all():
                MovimientoStock.objects.create(
                    empresa=self.empresa,
                    producto=detalle.producto,
                    tipo='ENTRADA',
                    origen='COMPRA',
                    cantidad=detalle.cantidad,
                    stock_anterior=detalle.producto.stock_actual,
                    precio_unitario=detalle.precio_compra,
                    precio_compra_anterior=detalle.producto.precio_compra,
                    precio_compra_nuevo=detalle.producto.precio_compra,
                    precio_venta_anterior=detalle.producto.precio_venta,
                    precio_venta_nuevo=detalle.producto.precio_venta,
                    referencia=f"Compra #{self.id}",
                )
                

    def revertir_stock(self):
        """Revierte los movimientos de stock asociados a esta compra"""
        from django.db.models import Q
        
        
        referencia_nueva = f"Compra #{self.id}"
        query = Q(referencia=referencia_nueva)
        if self.numero_comprobante:
            query |= Q(referencia=f"Compra {self.numero_comprobante}")
        query |= Q(referencia=f"Compra {self.id}")

        movimientos = MovimientoStock.objects.filter(query)
        
        for mov in movimientos:
            producto = mov.producto
            if mov.tipo == 'ENTRADA':
                producto.stock_actual -= mov.cantidad
            else:
                producto.stock_actual += mov.cantidad
            
            producto.save()
            mov.delete()
class DetalleCompra(models.Model):
    """Detalle de productos en una compra"""
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='detalles_compra', null=True)
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
    descuento = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
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
        # Calcular subtotal automáticamente: (cantidad * precio) - descuento
        base = self.cantidad * self.precio_compra
        self.subtotal = max(0, base - self.descuento)
        super().save(*args, **kwargs)


class MovimientoEstadoCompra(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    """Historial de cambios de estado de una compra"""
    compra = models.ForeignKey(
        Compra, 
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
        verbose_name_plural = "Movimientos de Estado de Compra"
    
    def __str__(self):
        return f"Compra {self.compra.id}: {self.estado_anterior} -> {self.estado_nuevo}"
