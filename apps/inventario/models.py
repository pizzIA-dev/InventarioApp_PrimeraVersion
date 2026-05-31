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
# ═══════════════════════════════════════════════════════════════════════════════

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



            # Refrescar en memoria
            self.producto = producto
            self.producto.stock_actual = self.stock_nuevo

            super().save(*args, **kwargs)
