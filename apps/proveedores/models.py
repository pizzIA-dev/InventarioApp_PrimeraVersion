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
    contacto = models.CharField(max_length=100, blank=True, null=True)
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

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        
        if not is_new:
            old_instance = Proveedor.objects.get(pk=self.pk)
            old_activo = old_instance.activo
            old_contrato = old_instance.tiene_contrato

        super().save(*args, **kwargs)

        if is_new:
            MovimientoProveedor.objects.create(
                proveedor=self,
                tipo='CREACION',
                descripcion='Registro inicial del proveedor',
                activo_nuevo=self.activo,
                contrato_nuevo=self.tiene_contrato
            )
        else:
            if old_activo != self.activo:
                MovimientoProveedor.objects.create(
                    proveedor=self,
                    tipo='ESTADO_ACTIVO' if self.activo else 'ESTADO_INACTIVO',
                    descripcion='Estado cambiado a Activo' if self.activo else 'Estado cambiado a Inactivo',
                    activo_nuevo=self.activo,
                    contrato_nuevo=self.tiene_contrato
                )
            if old_contrato != self.tiene_contrato:
                MovimientoProveedor.objects.create(
                    proveedor=self,
                    tipo='CONTRATO_SI' if self.tiene_contrato else 'CONTRATO_NO',
                    descripcion='Contrato registrado' if self.tiene_contrato else 'Contrato retirado',
                    activo_nuevo=self.activo,
                    contrato_nuevo=self.tiene_contrato
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

class MovimientoProveedor(models.Model):
    """Registro de historial de cambios del proveedor"""
    TIPO_EVENTO_CHOICES = [
        ('CREACION', 'Creación del proveedor'),
        ('ESTADO_ACTIVO', 'Cambio a estado Activo'),
        ('ESTADO_INACTIVO', 'Cambio a estado Inactivo'),
        ('CONTRATO_SI', 'Contrato firmado'),
        ('CONTRATO_NO', 'Contrato finalizado'),
        ('OTRO', 'Otra modificación'),
    ]

    proveedor = models.ForeignKey(
        Proveedor,
        on_delete=models.CASCADE,
        related_name='movimientos'
    )
    tipo = models.CharField(max_length=20, choices=TIPO_EVENTO_CHOICES)
    descripcion = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)
    
    # State snapshots
    activo_nuevo = models.BooleanField(default=True)
    contrato_nuevo = models.BooleanField(default=False)

    class Meta:
        ordering = ['-fecha']
        verbose_name_plural = "Movimientos de Proveedor"
    
    def __str__(self):
        return f"{self.proveedor.nombre} - {self.tipo} ({self.fecha})"
