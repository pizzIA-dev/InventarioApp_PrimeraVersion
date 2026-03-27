from django.db import models
from django.core.validators import MinValueValidator
from apps.clientes.models import Cliente
from django.utils import timezone


class CategoriaServicio(models.Model):
    """Categoría de servicios"""
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='categorias_servicio', null=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['nombre']
        verbose_name_plural = "Categorías de Servicios"
    
    def __str__(self):
        return self.nombre


class Servicio(models.Model):
    """Servicio ofrecido por el negocio"""
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='servicios', null=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    categoria = models.ForeignKey(
        CategoriaServicio, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='servicios'
    )
    
    # Precio
    precio_base = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    costo = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    duracion_minutos = models.PositiveIntegerField(blank=True, null=True)
    
    # Control
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.nombre} - {self.precio_base}"
    
    @property
    def margen_ganancia(self):
        """Calcula el margen de ganancia del servicio"""
        if self.costo > 0:
            return ((self.precio_base - self.costo) / self.costo) * 100
        return 0

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_costo = None
        old_precio = None
        old_activo = None

        if not is_new:
            try:
                old_instance = Servicio.objects.get(pk=self.pk)
                old_costo = old_instance.costo
                old_precio = old_instance.precio_base
                old_activo = old_instance.activo
            except Servicio.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        # Log movement
        if is_new:
            MovimientoServicio.objects.create(
                empresa=self.empresa,
                servicio=self,
                tipo='CREACION',
                costo_nuevo=self.costo,
                precio_nuevo=self.precio_base,
                activo_nuevo=self.activo,
                notas='Registro inicial del servicio'
            )
        else:
            changes = []
            if old_costo != self.costo:
                changes.append(f'Costo: {old_costo} -> {self.costo}')
            if old_precio != self.precio_base:
                changes.append(f'Precio: {old_precio} -> {self.precio_base}')
            if old_activo != self.activo:
                changes.append(f'Estado: {"Activo" if old_activo else "Inactivo"} -> {"Activo" if self.activo else "Inactivo"}')
            
            if changes:
                tipo = 'CAMBIO_ESTADO' if old_activo != self.activo and len(changes) == 1 else 'AJUSTE'
                MovimientoServicio.objects.create(
                    empresa=self.empresa,
                    servicio=self,
                    tipo=tipo,
                    costo_anterior=old_costo,
                    costo_nuevo=self.costo,
                    precio_anterior=old_precio,
                    precio_nuevo=self.precio_base,
                    activo_anterior=old_activo,
                    activo_nuevo=self.activo,
                    notas=', '.join(changes)
                )


class MovimientoServicio(models.Model):
    """Registro de movimientos y cambios en los servicios"""
    TIPO_MOVIMIENTO_CHOICES = [
        ('CREACION', 'Creación'),
        ('AJUSTE', 'Ajuste de Precios/Costos'),
        ('CAMBIO_ESTADO', 'Cambio de Estado'),
    ]

    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='movimientos_servicio', null=True)
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE, related_name='movimientos')
    fecha = models.DateTimeField(auto_now_add=True)
    tipo = models.CharField(max_length=20, choices=TIPO_MOVIMIENTO_CHOICES)
    
    costo_anterior = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    costo_nuevo = models.DecimalField(max_digits=10, decimal_places=2)
    
    precio_anterior = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    precio_nuevo = models.DecimalField(max_digits=10, decimal_places=2)
    
    activo_anterior = models.BooleanField(null=True, blank=True)
    activo_nuevo = models.BooleanField(default=True)
    
    notas = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-fecha']
        verbose_name_plural = "Movimientos de Servicio"

    def __str__(self):
        return f"{self.servicio.nombre} - {self.tipo} ({self.fecha})"


class VentaServicio(models.Model):
    """Venta/Registro de un servicio realizado"""
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('EN_PROGRESO', 'En Progreso'),
        ('TERMINADO', 'Terminado'),
        ('CANCELADO', 'Cancelado'),
    ]
    
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='ventas_servicio', null=True)
    comprobante_archivo = models.FileField(upload_to='comprobantes/servicios/', null=True, blank=True)
    
    servicio = models.ForeignKey(
        Servicio, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='ventas'
    )
    servicio_nombre = models.CharField(max_length=200, blank=True, null=True)
    
    cliente = models.ForeignKey(
        Cliente, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='servicios_contratados'
    )
    cliente_nombre = models.CharField(max_length=200, blank=True, null=True)
    
    # Documento
    numero_comprobante_simple = models.CharField(max_length=50, blank=True, null=True)
    numero_comprobante = models.CharField(max_length=50, blank=True, null=True)
    tipo_comprobante = models.CharField(max_length=50, blank=True, null=True)
    
    # Precio
    precio = models.DecimalField(
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
    impuesto = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    total = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    # Fechas
    fecha_programada = models.DateTimeField(blank=True, null=True)
    fecha_completado = models.DateTimeField(blank=True, null=True)
    
    # Control
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    notas = models.TextField(blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-creado_en']
    
    def __str__(self):
        return f"{self.servicio_nombre or self.servicio} - {self.cliente_nombre or 'Cliente'}"
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_estado = None
        
        if not is_new:
            try:
                old_instance = VentaServicio.objects.get(pk=self.pk)
                old_estado = old_instance.estado
            except VentaServicio.DoesNotExist:
                pass

        # Calcular total automáticamente
        self.total = self.precio - self.descuento + self.impuesto
        super().save(*args, **kwargs)

        # Log status change
        if is_new:
            now_str = timezone.localtime().strftime("%d/%m/%Y a las %H:%M:%S")
            MovimientoEstadoVentaServicio.objects.create(
                venta_servicio=self,
                estado_anterior='N/A',
                estado_nuevo=self.estado,
                notas=f'Registro inicial del servicio ({self.estado.capitalize()}) el {now_str}'
            )
        elif old_estado and old_estado != self.estado:
            now_str = timezone.localtime().strftime("%d/%m/%Y a las %H:%M:%S")
            MovimientoEstadoVentaServicio.objects.create(
                venta_servicio=self,
                estado_anterior=old_estado,
                estado_nuevo=self.estado,
                notas=f'Cambió de {old_estado.capitalize()} a {self.estado.capitalize()} el {now_str}'
            )
    
    def terminar(self):
        """Marca el servicio como terminado"""
        from django.utils import timezone
        self.estado = 'TERMINADO'
        self.fecha_completado = timezone.now()
        self.save()

    def iniciar(self):
        """Marca el servicio como en progreso"""
        self.estado = 'EN_PROGRESO'
        self.save()

    # Alias completar as terminar for backward compatibility if needed, 
    # but we'll use terminar for clarity.
    def completar(self):
        self.terminar()


class MovimientoEstadoVentaServicio(models.Model):
    """Historial de cambios de estado de una venta de servicios"""
    venta_servicio = models.ForeignKey(
        VentaServicio, 
        on_delete=models.CASCADE, 
        related_name='movimientos_estado'
    )
    estado_anterior = models.CharField(max_length=20)
    estado_nuevo = models.CharField(max_length=20)
    fecha = models.DateTimeField(auto_now_add=True)
    notas = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-fecha']
        verbose_name_plural = "Movimientos de Estado de Venta de Servicio"
    
    def __str__(self):
        return f"Servicio {self.venta_servicio.id}: {self.estado_anterior} -> {self.estado_nuevo}"
