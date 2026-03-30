from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from apps.inventario.models import Producto, MovimientoStock
from apps.servicios.models import Servicio
from apps.ventas.models import Venta
from apps.servicios.models import VentaServicio

class ClienteFiado(models.Model):
    """Cliente especializado para el módulo de Fiados"""
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='clientes_fiados', null=True)
    nombre = models.CharField(max_length=200)
    documento = models.CharField(max_length=50, blank=True, null=True, help_text="DNI, RUC u otro")
    telefono = models.CharField(max_length=50, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    notas = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nombre']
        verbose_name_plural = "Clientes Fiados"

    def __str__(self):
        return f"{self.nombre} (Fiado)"


class Fiado(models.Model):
    """Operación de Fiado de productos o servicios"""
    TIPO_CHOICES = [
        ('PRODUCTO', 'Venta de Productos'),
        ('SERVICIO', 'Venta de Servicios'),
    ]
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('PAGADO_PARCIAL', 'Cobro Parcial'),
        ('LIQUIDADO', 'Liquidado / Pagado'),
        ('CANCELADO', 'Cancelado'),
    ]

    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='fiados', null=True)
    cliente = models.ForeignKey(ClienteFiado, on_delete=models.PROTECT, related_name='fiados')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    
    # Totales detallados (estilo ventas)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    descuento = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    impuesto = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    saldo_pendiente = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    
    # Optional references when converted to regular sales
    venta_ref = models.ForeignKey(Venta, on_delete=models.SET_NULL, null=True, blank=True, related_name='fiado_origen')
    venta_servicio_ref = models.ForeignKey(VentaServicio, on_delete=models.SET_NULL, null=True, blank=True, related_name='fiado_origen')
    
    # Tracking Dates and Notes
    fecha_limite = models.DateField(blank=True, null=True, help_text="¿Para cuándo prometió pagar?")
    notas = models.TextField(blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado_en']

    def __str__(self):
        return f"Fiado #{self.id} - {self.cliente.nombre} ({self.tipo})"
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_estado = None
        
        if not is_new:
            try:
                old_instance = Fiado.objects.get(pk=self.pk)
                old_estado = old_instance.estado
            except Fiado.DoesNotExist:
                pass
                
        # Update automatic status based on saldo_pendiente for partial payments
        if not is_new and self.estado not in ['CANCELADO', 'LIQUIDADO']:
            if self.saldo_pendiente == 0:
                self.estado = 'LIQUIDADO'
            elif self.saldo_pendiente > 0 and self.saldo_pendiente < self.total:
                self.estado = 'PAGADO_PARCIAL'
            elif self.saldo_pendiente == self.total and self.total > 0:
                self.estado = 'PENDIENTE'

        super().save(*args, **kwargs)
        # La creación de historial se manejará en Serializers y ViewSets para evitar duplicidad o saldos incorrectos en la creación inicial.


    def revertir_stock(self):
        """Devuelve el stock de los productos al inventario si se cancela o elimina el fiado"""
        if self.tipo == 'PRODUCTO':
            for detalle in self.detalles_producto.all():
                MovimientoStock.objects.create(
                    producto=detalle.producto,
                    tipo='ENTRADA',
                    origen='DEVOLUCION',
                    cantidad=detalle.cantidad,
                    stock_anterior=detalle.producto.stock_actual,
                    precio_unitario=detalle.precio_unidad,
                    precio_compra_anterior=detalle.producto.precio_compra,
                    precio_compra_nuevo=detalle.producto.precio_compra,
                    precio_venta_anterior=detalle.producto.precio_venta,
                    precio_venta_nuevo=detalle.producto.precio_venta,
                    referencia=f"Reversión de stock por eliminación/cancelación de Fiado #{self.id}"
                )

    def reactivar(self):
        """Re-descuenta el stock y cambia el estado a una deuda activa"""
        if self.estado != 'CANCELADO':
            raise ValueError("Solo se pueden reactivar fiados cancelados.")
            
        if self.tipo == 'PRODUCTO':
            # 1. Validar Stock
            errores = []
            for detalle in self.detalles_producto.all():
                if detalle.producto.stock_actual < detalle.cantidad:
                    errores.append(f"'{detalle.producto.nombre}' (Stock: {detalle.producto.stock_actual}, Requerido: {detalle.cantidad})")
            
            if errores:
                raise ValueError(f"Stock insuficiente para reactivar: {', '.join(errores)}")
            
            # 2. Descontar Stock
            for detalle in self.detalles_producto.all():
                MovimientoStock.objects.create(
                    producto=detalle.producto,
                    tipo='SALIDA',
                    origen='FIADO',
                    cantidad=detalle.cantidad,
                    stock_anterior=detalle.producto.stock_actual,
                    precio_unitario=detalle.precio_unidad,
                    precio_compra_anterior=detalle.producto.precio_compra,
                    precio_compra_nuevo=detalle.producto.precio_compra,
                    precio_venta_anterior=detalle.producto.precio_venta,
                    precio_venta_nuevo=detalle.producto.precio_venta,
                    referencia=f"Reactivación de Fiado #{self.id}"
                )
        
        # 3. Cambiar estado y guardar (esto recalcula el estado final: Pendiente o Pagado Parcial)
        self.estado = 'PENDIENTE'
        self.save()

    def delete(self, *args, **kwargs):
        # Al eliminar, revertimos el stock primero
        self.revertir_stock()
        super().delete(*args, **kwargs)


class DetalleFiadoProducto(models.Model):
    """Detalle de los productos fiados en una operación (descuenta stock)"""
    fiado = models.ForeignKey(Fiado, on_delete=models.CASCADE, related_name='detalles_producto')
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT)
    # Detalle Financiero
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    precio_unidad = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    descuento = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])

    class Meta:
        ordering = ['producto__nombre']

    def save(self, *args, **kwargs):
        # Calcular subtotal individual restando el descuento por ítem
        self.subtotal = (self.cantidad * self.precio_unidad) - self.descuento
        is_new = self.pk is None
        super().save(*args, **kwargs)

        if is_new and self.fiado.tipo == 'PRODUCTO':
            # Registrar salida de stock
            MovimientoStock.objects.create(
                producto=self.producto,
                tipo='SALIDA',
                origen='FIADO',  # Se usará FK null en origen porque es distinto
                cantidad=self.cantidad,
                stock_anterior=self.producto.stock_actual,
                precio_unitario=self.precio_unidad,
                precio_compra_anterior=self.producto.precio_compra,
                precio_compra_nuevo=self.producto.precio_compra,
                precio_venta_anterior=self.producto.precio_venta,
                precio_venta_nuevo=self.producto.precio_venta,
                referencia=f"Fiado otorgado #{self.fiado.id}"
            )


class DetalleFiadoServicio(models.Model):
    """Detalle de un servicio fiado (para el caso de servicios)"""
    fiado = models.ForeignKey(Fiado, on_delete=models.CASCADE, related_name='detalles_servicio')
    servicio = models.ForeignKey(Servicio, on_delete=models.PROTECT)
    precio = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    descuento = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])

    class Meta:
        ordering = ['servicio__nombre']

    def save(self, *args, **kwargs):
        self.subtotal = self.precio - self.descuento
        super().save(*args, **kwargs)


class HistorialFiado(models.Model):
    """Registro de abonos y cambios de cada Fiado o acciones de cliente"""
    fiado = models.ForeignKey(Fiado, on_delete=models.CASCADE, related_name='historial', null=True, blank=True)
    cliente = models.ForeignKey(ClienteFiado, on_delete=models.CASCADE, related_name='historial_directo', null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)
    total_deuda = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    abono = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    saldo_restante = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    estado_nuevo = models.CharField(max_length=20)
    notas = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"Abono de {self.abono} a Fiado #{self.fiado.id}"

