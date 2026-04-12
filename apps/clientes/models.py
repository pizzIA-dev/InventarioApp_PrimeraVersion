from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator


class Cliente(models.Model):
    """Cliente (persona, negocio o empresa)"""
    TIPO_CLIENTE_CHOICES = [
        ('PERSONA_NATURAL', 'Persona Natural'),
        ('EMPRESA', 'Empresa'),
    ]
    
    TIPO_DOCUMENTO_CHOICES = [
        ('DNI', 'DNI'),
        ('RUC', 'RUC'),
        ('CE', 'Carnet de Extranjería'),
        ('PASAPORTE', 'Pasaporte'),
    ]
    
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='clientes', null=True)
    nombre = models.CharField(max_length=200)
    tipo_cliente = models.CharField(max_length=20, choices=TIPO_CLIENTE_CHOICES, default='PERSONA_NATURAL')
    tipo_documento = models.CharField(max_length=20, choices=TIPO_DOCUMENTO_CHOICES, default='DNI')
    numero_documento = models.CharField(max_length=20)
    
    # Contacto
    contacto = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    
    # Control
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['nombre']
        verbose_name_plural = "Clientes"
        constraints = [
            models.UniqueConstraint(fields=['empresa', 'numero_documento'], name='unique_cliente_per_empresa')
        ]
    
    def __str__(self):
        return f"{self.nombre} ({self.numero_documento})"
    
    @property
    def recurrencia(self):
        """Número de compras realizadas (solo confirmadas)"""
        return self.ventas.filter(estado='CONFIRMADA').count()
    
    @property
    def total_comprado(self):
        """Total comprado por el cliente (solo confirmadas)"""
        return sum(venta.total for venta in self.ventas.filter(estado='CONFIRMADA'))
    
    @property
    def ultima_compra(self):
        """Fecha de la última compra (solo confirmadas)"""
        ultima_venta = self.ventas.filter(estado='CONFIRMADA').order_by('-creado_en').first()
        return ultima_venta.creado_en if ultima_venta else None

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if is_new:
            super().save(*args, **kwargs)
            from django.utils import timezone
            now_str = timezone.localtime().strftime("%d/%m/%Y a las %H:%M:%S")
            MovimientoEstadoCliente.objects.create(
                cliente=self,
                estado_anterior='—',
                estado_nuevo='Activo',
                notas=f'Cliente registrado en el sistema el {now_str}'
            )
        else:
            try:
                old_instance = Cliente.objects.get(pk=self.pk)
                if old_instance.activo != self.activo:
                    from django.utils import timezone
                    now_str = timezone.localtime().strftime("%d/%m/%Y a las %H:%M:%S")
                    MovimientoEstadoCliente.objects.create(
                        cliente=self,
                        estado_anterior='Activo' if old_instance.activo else 'Inactivo',
                        estado_nuevo='Activo' if self.activo else 'Inactivo',
                        notas=f'Cambió de {"Activo" if old_instance.activo else "Inactivo"} a {"Activo" if self.activo else "Inactivo"} el {now_str}'
                    )
            except Cliente.DoesNotExist:
                pass
            super().save(*args, **kwargs)


class MovimientoEstadoCliente(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    """Historial de cambios de estado de un cliente"""
    cliente = models.ForeignKey(
        Cliente, 
        on_delete=models.CASCADE, 
        related_name='movimientos_estado'
    )
    estado_anterior = models.CharField(max_length=20)
    estado_nuevo = models.CharField(max_length=20)
    fecha = models.DateTimeField(auto_now_add=True)
    notas = models.TextField(blank=True, null=True)
    

    def save(self, *args, **kwargs):
        if getattr(self, "usuario_id", None) is None:
            from apps.core.middleware import get_current_user
            user = get_current_user()
            if user and user.is_authenticated:
                self.usuario = user
        super().save(*args, **kwargs)
    class Meta:
        ordering = ['-fecha']
        verbose_name_plural = "Movimientos de Estado de Cliente"
    
    def __str__(self):
        return f"Cliente {self.cliente.nombre}: {self.estado_anterior} -> {self.estado_nuevo}"


class SegmentoCliente(models.Model):
    """Segmentación de clientes"""
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='segmentos_cliente', null=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    descuento_por_defecto = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    activo = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre
