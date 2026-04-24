from django.conf import settings
from django.db import models, transaction
from django.db.models import F
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError


class Categoria(models.Model):
    """Categoría de productos"""
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='categorias_producto', null=True)
    nombre = models.CharField(max_length=100, db_index=True)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categorías"
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Producto(models.Model):
    """Producto en stock"""
    TIPO_UNIDAD_CHOICES = [
        ('UN', 'Unidad'),
        ('KG', 'Kilogramo'),
        ('LB', 'Libra'),
        ('MT', 'Metro'),
        ('LT', 'Litro'),
        ('GL', 'Galón'),
        ('CJ', 'Caja'),
        ('PK', 'Pack'),
    ]

    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='productos', null=True)
    codigo = models.CharField(max_length=50)
    nombre = models.CharField(max_length=200, db_index=True)
    descripcion = models.TextField(blank=True, null=True)
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='productos'
    )

    # Stock
    stock_inicial = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    stock_actual  = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    stock_minimo  = models.DecimalField(max_digits=10, decimal_places=2, default=10, validators=[MinValueValidator(0)])
    unidad_medida = models.CharField(max_length=2, choices=TIPO_UNIDAD_CHOICES, default='UN')

    # Precios
    precio_compra = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    precio_venta  = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])

    # Control
    activo       = models.BooleanField(default=True)
    creado_en    = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.codigo})"

    @property
    def stock_bajo(self):
        return self.stock_actual < self.stock_minimo

    @property
    def margen_ganancia(self):
        if self.precio_compra > 0:
            return ((self.precio_venta - self.precio_compra) / self.precio_compra) * 100
        return 0

    def save(self, *args, **kwargs):
        if not self.pk:
            self.stock_actual = self.stock_inicial
        super().save(*args, **kwargs)


# ═══════════════════════════════════════════════════════════════════════════════
#  MÓDULO DE ALMACENES / CAJAS
# ═══════════════════════════════════════════════════════════════════════════════

class Almacen(models.Model):
    """
    Almacén o sub-almacén (caja) de inventario.

    Reglas de negocio:
    - Solo puede haber UN almacén general (es_general=True) por empresa.
    - Los subalmacenes son particiones del stock general.
    - Solo el Gerente puede crear, editar o eliminar almacenes.
    """
    empresa = models.ForeignKey(
        'core.Empresa',
        on_delete=models.CASCADE,
        related_name='almacenes',
        null=True
    )
    nombre      = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    es_general  = models.BooleanField(
        default=False,
        help_text="True si es el almacén principal/general de la empresa."
    )
    activo       = models.BooleanField(default=True)
    creado_en    = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventario_almacen'
        ordering = ['-es_general', 'nombre']
        verbose_name = 'Almacén'
        verbose_name_plural = 'Almacenes'
        indexes = [
            models.Index(fields=['empresa', 'es_general']),
        ]

    def __str__(self):
        suffix = ' (General)' if self.es_general else ''
        return f"{self.nombre}{suffix}"

    def clean(self):
        """Garantizar unicidad del almacén general por empresa."""
        if self.es_general and self.empresa_id:
            qs = Almacen.objects.filter(empresa=self.empresa, es_general=True)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError(
                    "Ya existe un almacén general para esta empresa. "
                    "Solo puede haber uno por empresa."
                )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @property
    def total_colaboradores(self):
        return self.perfiles_asignados.filter(user__is_active=True).count()


class StockAlmacen(models.Model):
    """
    Stock de un producto dentro de un almacén específico.

    Invariante: Σ(StockAlmacen subalmacenes) ≤ stock general del producto.
    Solo se modifica via TrasladoStock o al registrar MovimientoStock con almacen asignado.
    """
    almacen  = models.ForeignKey(Almacen, on_delete=models.CASCADE, related_name='stocks')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='stocks_por_almacen')
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventario_stock_almacen'
        unique_together = [('almacen', 'producto')]
        verbose_name = 'Stock por Almacén'
        verbose_name_plural = 'Stocks por Almacén'
        indexes = [
            models.Index(fields=['almacen', 'producto']),
        ]

    def __str__(self):
        return f"{self.producto.nombre} en {self.almacen.nombre}: {self.cantidad}"


class TrasladoStock(models.Model):
    """
    Traslado de stock entre almacenes. Registro INMUTABLE (append-only).
    Representa la cadena de custodia del inventario.
    Solo el Gerente puede crear traslados.
    """
    TIPO_CHOICES = [
        ('GENERAL_A_SUB', 'Del almacén general a un subalmacén'),
        ('SUB_A_GENERAL', 'De un subalmacén al almacén general'),
        ('SUB_A_SUB',     'Entre subalmacenes'),
        ('AJUSTE',        'Ajuste de inventario (Gerente)'),
    ]

    empresa  = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='traslados_stock', null=True)
    tipo     = models.CharField(max_length=20, choices=TIPO_CHOICES)
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='traslados')
    almacen_origen  = models.ForeignKey(Almacen, on_delete=models.PROTECT, related_name='traslados_salida', null=True, blank=True)
    almacen_destino = models.ForeignKey(Almacen, on_delete=models.PROTECT, related_name='traslados_entrada', null=True, blank=True)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    notas    = models.TextField(blank=True, null=True)
    usuario  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='traslados_realizados'
    )
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inventario_traslado_stock'
        ordering = ['-fecha']
        verbose_name = 'Traslado de Stock'
        verbose_name_plural = 'Traslados de Stock'
        indexes = [
            models.Index(fields=['-fecha']),
            models.Index(fields=['producto', '-fecha']),
        ]

    def __str__(self):
        origen  = self.almacen_origen.nombre  if self.almacen_origen  else 'Externo'
        destino = self.almacen_destino.nombre if self.almacen_destino else 'Externo'
        return f"Traslado {self.producto.nombre}: {origen} → {destino} ({self.cantidad})"

    def delete(self, *args, **kwargs):
        raise PermissionError(
            "Los traslados son registros contables inmutables. "
            "Crea un traslado inverso para revertir."
        )

    @classmethod
    def ejecutar(cls, tipo, producto, origen, destino, cantidad, usuario=None, notas=''):
        """
        Factory method atómico.
        Valida stock en origen y aplica cambios en StockAlmacen de forma atómica.
        """
        if cantidad <= 0:
            raise ValidationError("La cantidad del traslado debe ser mayor a cero.")

        with transaction.atomic():
            if origen:
                sa_origen, _ = StockAlmacen.objects.select_for_update().get_or_create(
                    almacen=origen, producto=producto, defaults={'cantidad': 0}
                )
                if sa_origen.cantidad < cantidad:
                    raise ValidationError(
                        f"Stock insuficiente en '{origen.nombre}'. "
                        f"Disponible: {sa_origen.cantidad}, Requerido: {cantidad}"
                    )
                StockAlmacen.objects.filter(pk=sa_origen.pk).update(cantidad=F('cantidad') - cantidad)

            if destino:
                StockAlmacen.objects.select_for_update().get_or_create(
                    almacen=destino, producto=producto, defaults={'cantidad': 0}
                )
                StockAlmacen.objects.filter(almacen=destino, producto=producto).update(
                    cantidad=F('cantidad') + cantidad
                )

            if usuario is None:
                from apps.core.middleware import get_current_user
                usuario = get_current_user()

            return cls.objects.create(
                tipo=tipo,
                empresa=producto.empresa,
                producto=producto,
                almacen_origen=origen,
                almacen_destino=destino,
                cantidad=cantidad,
                usuario=usuario,
                notas=notas,
            )


class MovimientoStock(models.Model):
    """Registro de movimientos de stock (entradas y salidas)"""
    TIPO_MOVIMIENTO_CHOICES = [
        ('ENTRADA', 'Entrada'),
        ('SALIDA',  'Salida'),
    ]

    ORIGEN_MOVIMIENTO_CHOICES = [
        ('COMPRA',     'Compra a proveedor'),
        ('VENTA',      'Venta'),
        ('FIADO',      'Fiado (Venta diferida)'),
        ('AJUSTE',     'Ajuste manual'),
        ('DEVOLUCION', 'Devolución'),
        ('MERMA',      'Merma (General)'),
        ('CADUCIDAD',  'Caducidad/Vencimiento'),
        ('EXTRAVIO',   'Extravío o Robo'),
        ('ROTURA',     'Rotura o Daño'),
    ]

    usuario  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    empresa  = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='movimientos_stock', null=True)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='movimientos')
    almacen  = models.ForeignKey(
        Almacen,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='movimientos_stock',
        help_text="Almacén donde ocurrió este movimiento."
    )
    tipo   = models.CharField(max_length=10, choices=TIPO_MOVIMIENTO_CHOICES)
    origen = models.CharField(max_length=20, choices=ORIGEN_MOVIMIENTO_CHOICES)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    stock_anterior = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    stock_nuevo    = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])

    precio_unitario        = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, validators=[MinValueValidator(0)])
    precio_compra_anterior = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, validators=[MinValueValidator(0)])
    precio_compra_nuevo    = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, validators=[MinValueValidator(0)])
    precio_venta_anterior  = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, validators=[MinValueValidator(0)])
    precio_venta_nuevo     = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, validators=[MinValueValidator(0)])

    referencia  = models.CharField(max_length=100, blank=True, null=True)
    notas       = models.TextField(blank=True, null=True)
    activo_nuevo = models.BooleanField(null=True, blank=True, help_text="Cambio de estado activo/inactivo del producto.")
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']
        indexes = [
            models.Index(fields=['producto', '-fecha']),
            models.Index(fields=['almacen', '-fecha']),
        ]

    def __str__(self):
        return f"{self.tipo} - {self.producto.nombre} ({self.cantidad})"

    def save(self, *args, **kwargs):
        if getattr(self, "usuario_id", None) is None:
            from apps.core.middleware import get_current_user
            user = get_current_user()
            if user and user.is_authenticated:
                self.usuario = user

        with transaction.atomic():
            # Bloquear producto para evitar race conditions
            producto = Producto.objects.select_for_update().get(pk=self.producto_id)

            # Stock anterior desde la fila bloqueada (fuente de verdad)
            self.stock_anterior = producto.stock_actual

            # Calcular stock nuevo
            if self.tipo == 'ENTRADA':
                self.stock_nuevo = self.stock_anterior + self.cantidad
            else:
                self.stock_nuevo = self.stock_anterior - self.cantidad

            # Capturar precios históricos
            if self.precio_compra_nuevo    is None: self.precio_compra_nuevo    = producto.precio_compra
            if self.precio_venta_nuevo     is None: self.precio_venta_nuevo     = producto.precio_venta
            if self.precio_compra_anterior is None: self.precio_compra_anterior = self.precio_compra_nuevo
            if self.precio_venta_anterior  is None: self.precio_venta_anterior  = self.precio_venta_nuevo

            # UPDATE atómico del stock global
            Producto.objects.filter(pk=self.producto_id).update(stock_actual=self.stock_nuevo)

            # Actualizar StockAlmacen si hay almacén asignado
            if self.almacen_id:
                sa, _ = StockAlmacen.objects.select_for_update().get_or_create(
                    almacen_id=self.almacen_id,
                    producto_id=self.producto_id,
                    defaults={'cantidad': 0}
                )
                delta = F('cantidad') + self.cantidad if self.tipo == 'ENTRADA' else F('cantidad') - self.cantidad
                StockAlmacen.objects.filter(pk=sa.pk).update(cantidad=delta)

            # Refrescar en memoria
            self.producto = producto
            self.producto.stock_actual = self.stock_nuevo

            super().save(*args, **kwargs)


class HistorialAsignacionAlmacen(models.Model):
    """
    Historial INMUTABLE de asignaciones de colaboradores a almacenes.
    Trazabilidad completa: quién fue asignado, cuándo, a qué almacén, y quién lo autorizó.
    """
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='historial_asignaciones_almacen'
    )
    almacen_anterior = models.ForeignKey(
        Almacen, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='historial_salidas'
    )
    almacen_nuevo = models.ForeignKey(
        Almacen, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='historial_entradas'
    )
    asignado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='asignaciones_realizadas'
    )
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inventario_historial_asignacion_almacen'
        ordering = ['-fecha']
        verbose_name = 'Historial de Asignación de Almacén'
        verbose_name_plural = 'Historial de Asignaciones de Almacén'

    def __str__(self):
        anterior = self.almacen_anterior.nombre if self.almacen_anterior else 'Sin almacén'
        nuevo    = self.almacen_nuevo.nombre    if self.almacen_nuevo    else 'Desasignado'
        return f"{self.usuario.username}: {anterior} → {nuevo} ({self.fecha:%d/%m/%Y})"

    def delete(self, *args, **kwargs):
        raise PermissionError("El historial de asignaciones es inmutable.")
