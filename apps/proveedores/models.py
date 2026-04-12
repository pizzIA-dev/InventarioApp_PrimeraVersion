from django.conf import settings
from django.db import models
from django.utils import timezone
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

    TIPO_PROVEEDOR_CHOICES = [
        ('PERSONA_NATURAL', 'Persona Natural'),
        ('EMPRESA', 'Empresa'),
    ]
    
    TIPO_DOCUMENTO_CHOICES = [
        ('DNI', 'DNI'),
        ('RUC', 'RUC'),
        ('CE', 'Carnet de Extranjería'),
        ('PASAPORTE', 'Pasaporte'),
    ]
    
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='proveedores', null=True)
    nombre = models.CharField(max_length=200)
    tipo_proveedor = models.CharField(max_length=20, choices=TIPO_PROVEEDOR_CHOICES, default='PERSONA_NATURAL')
    tipo_documento = models.CharField(max_length=20, choices=TIPO_DOCUMENTO_CHOICES, default='RUC')
    identificador = models.CharField(max_length=20)  # RUC/DNI/CE/PASAPORTE
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
        constraints = [
            models.UniqueConstraint(fields=['empresa', 'identificador'], name='unique_proveedor_per_empresa')
        ]
    
    def __str__(self):
        return f"{self.nombre} ({self.identificador})"
    
    @property
    def total_compras(self):
        """Total comprado a este proveedor (solo confirmadas)"""
        return sum(compra.total for compra in self.compras.filter(estado='CONFIRMADA'))
    
    @property
    def productos_suministrados(self):
        """Productos que ha suministrado (solo confirmadas)"""
        return Producto.objects.filter(
            id__in=self.compras.filter(estado='CONFIRMADA').values_list('detallecompra_set__producto_id', flat=True).distinct()
        )

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        
        if not is_new:
            old_instance = Proveedor.objects.get(pk=self.pk)
            old_activo = old_instance.activo
            old_contrato = old_instance.tiene_contrato

        super().save(*args, **kwargs)
        now_str = timezone.localtime().strftime("%d/%m/%Y a las %H:%M:%S")

        if is_new:
            MovimientoProveedor.objects.create(
                proveedor=self,
                tipo='CREACION',
                descripcion=f'Registro inicial del proveedor el {now_str}',
                activo_nuevo=self.activo,
                contrato_nuevo=self.tiene_contrato
            )
        else:
            if old_activo != self.activo:
                MovimientoProveedor.objects.create(
                    proveedor=self,
                    tipo='ESTADO_ACTIVO' if self.activo else 'ESTADO_INACTIVO',
                    descripcion=f'Estado cambiado a {"Activo" if self.activo else "Inactivo"} el {now_str}',
                    activo_nuevo=self.activo,
                    contrato_nuevo=self.tiene_contrato
                )
            if old_contrato != self.tiene_contrato:
                MovimientoProveedor.objects.create(
                    proveedor=self,
                    tipo='CONTRATO_SI' if self.tiene_contrato else 'CONTRATO_NO',
                    descripcion=f'Contrato {"registrado" if self.tiene_contrato else "retirado"} el {now_str}',
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
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
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


    def save(self, *args, **kwargs):
        if getattr(self, "usuario_id", None) is None:
            from apps.core.middleware import get_current_user
            user = get_current_user()
            if user and user.is_authenticated:
                self.usuario = user
        super().save(*args, **kwargs)
    class Meta:
        ordering = ['-fecha']
        verbose_name_plural = "Movimientos de Proveedor"
    
    def __str__(self):
        return f"{self.proveedor.nombre} - {self.tipo} ({self.fecha})"
