from django.db import models
from django.core.validators import MinValueValidator


class CategoriaTransaccion(models.Model):
    """Categoría de transacción (ingreso o egreso)"""
    TIPO_CHOICES = [
        ('INGRESO', 'Ingreso'),
        ('EGRESO', 'Egreso'),
    ]
    
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='categorias_transaccion', null=True)
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['tipo', 'nombre']
        verbose_name_plural = "Categorías de Transacciones"
    
    def __str__(self):
        return f"{self.nombre} ({self.tipo})"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_activo = None
        old_nombre = None
        
        if not is_new:
            try:
                old_instance = CategoriaTransaccion.objects.get(pk=self.pk)
                old_activo = old_instance.activo
                old_nombre = old_instance.nombre
            except CategoriaTransaccion.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)
        
        # Log creation
        cat_status = 'Activo' if self.activo else 'Inactivo'
        if is_new:
            MovimientoCategoria.objects.create(
                categoria=self,
                tipo_movimiento='ESTADO',
                campo_modificado='Creación',
                estado_categoria=cat_status,
                descripcion=self.descripcion or '',
                notas=f"Categoría '{self.nombre}' creada."
            )
        else:
            # Log status change
            if old_activo != self.activo:
                MovimientoCategoria.objects.create(
                    categoria=self,
                    tipo_movimiento='ESTADO',
                    campo_modificado='Estado',
                    estado_categoria=cat_status,
                    descripcion=self.descripcion or '',
                    notas=f"Cambio de estado: {'Activado' if self.activo else 'Desactivado'}."
                )
            # Log name change
            if old_nombre != self.nombre:
                MovimientoCategoria.objects.create(
                    categoria=self,
                    tipo_movimiento='INFO',
                    campo_modificado='Nombre',
                    estado_categoria=cat_status,
                    descripcion=self.descripcion or '',
                    notas=f"Cambio de nombre de '{old_nombre}' a '{self.nombre}'."
                )


class Transaccion(models.Model):
    """Transacción independiente (ingreso o egreso)"""
    TIPO_CHOICES = [
        ('INGRESO', 'Ingreso'),
        ('EGRESO', 'Egreso'),
    ]
    
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, related_name='transacciones', null=True)
    categoria = models.ForeignKey(
        CategoriaTransaccion, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='transacciones'
    )
    
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    descripcion = models.CharField(max_length=200)
    monto = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    # Método de pago
    METODO_PAGO_CHOICES = [
        ('EFECTIVO', 'Efectivo'),
        ('TARJETA', 'Tarjeta'),
        ('TRANSFERENCIA', 'Transferencia'),
        ('YAPE', 'Yape/Plin'),
        ('CHEQUE', 'Cheque'),
        ('OTRO', 'Otro'),
    ]
    metodo_pago = models.CharField(
        max_length=20, 
        choices=METODO_PAGO_CHOICES, 
        default='EFECTIVO'
    )
    referencia = models.CharField(max_length=100, blank=True, null=True)  # Nro de operación
    
    # Fecha
    fecha = models.DateTimeField()
    
    # Control
    notas = models.TextField(blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-fecha']
    
    def __str__(self):
        return f"{self.tipo} - {self.descripcion} - {self.monto}"
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_monto = None
        old_desc = None
        old_cat = None
        old_fecha = None
        
        if not is_new:
            try:
                old_instance = Transaccion.objects.get(pk=self.pk)
                old_monto = old_instance.monto
                old_desc = old_instance.descripcion
                old_cat = old_instance.categoria
                old_fecha = old_instance.fecha
            except Transaccion.DoesNotExist:
                pass

        # Asegurar que el tipo coincida con la categoría
        if self.categoria and self.tipo != self.categoria.tipo:
            self.tipo = self.categoria.tipo
        
        super().save(*args, **kwargs)
        
        # 1. Log to Category Kardex (Existing logic)
        cat_status = "Activo" if (self.categoria and self.categoria.activo) else "Inactivo"

        if is_new and self.categoria:
            MovimientoCategoria.objects.create(
                categoria=self.categoria,
                tipo_movimiento='TRANSACCION',
                campo_modificado='Registro de Movimiento',
                estado_categoria=cat_status,
                valor_anterior=None,
                valor_nuevo=str(self.monto),
                descripcion=self.descripcion,
                notas=self.notas or "Registro inicial del movimiento.",
                referencia=self.referencia,
                transaccion_id=self.id
            )

        # 2. Log to Transaction's Individual Audit Log (New logic)
        if is_new:
            HistorialTransaccion.objects.create(
                transaccion=self,
                campo_modificado='Creación',
                estado_categoria=cat_status,
                valor_anterior=None,
                valor_nuevo=str(self.monto),
                descripcion=self.descripcion,
                notas=self.notas or f"Transacción creada en categoría '{self.categoria.nombre if self.categoria else 'N/A'}'."
            )
        else:
            if old_monto != self.monto:
                HistorialTransaccion.objects.create(
                    transaccion=self,
                    campo_modificado='Monto',
                    estado_categoria=cat_status,
                    valor_anterior=str(old_monto),
                    valor_nuevo=str(self.monto),
                    descripcion=self.descripcion,
                    notas="Cambio de monto."
                )
                if self.categoria:
                    MovimientoCategoria.objects.create(
                        categoria=self.categoria,
                        tipo_movimiento='TRANSACCION',
                        campo_modificado='Cambio de Monto',
                        estado_categoria=cat_status,
                        valor_anterior=str(old_monto),
                        valor_nuevo=str(self.monto),
                        descripcion=self.descripcion,
                        transaccion_id=self.id,
                        notas="Cambio de monto del movimiento."
                    )
            
            if old_desc != self.descripcion:
                HistorialTransaccion.objects.create(
                    transaccion=self,
                    campo_modificado='Descripción',
                    estado_categoria=cat_status,
                    descripcion=self.descripcion,
                    notas=f"Cambio de descripción. Anterior: '{old_desc}'."
                )
            if old_cat != self.categoria:
                HistorialTransaccion.objects.create(
                    transaccion=self,
                    campo_modificado='Categoría',
                    estado_categoria=cat_status,
                    descripcion=self.descripcion,
                    notas=f"Cambio de categoría. Anterior: '{old_cat.nombre if old_cat else 'N/A'}'."
                )

    def delete(self, *args, **kwargs):
        if self.categoria:
            cat_status = "Activo" if self.categoria.activo else "Inactivo"
            MovimientoCategoria.objects.create(
                categoria=self.categoria,
                tipo_movimiento='TRANSACCION',
                campo_modificado='Eliminación de Movimiento',
                estado_categoria=cat_status,
                valor_anterior=str(self.monto),
                valor_nuevo="0.00",
                descripcion=f"ELIMINADO: {self.descripcion}",
                notas=f"Se eliminó el registro original de fecha {self.fecha.strftime('%d/%m/%Y %H:%M:%S')}"
            )
        super().delete(*args, **kwargs)


class HistorialTransaccion(models.Model):
    """Registro de auditoría individual para una transacción específica"""
    transaccion = models.ForeignKey(
        Transaccion, 
        on_delete=models.CASCADE, 
        related_name='historial_audit'
    )
    fecha = models.DateTimeField(auto_now_add=True)
    campo_modificado = models.CharField(max_length=100)
    estado_categoria = models.CharField(max_length=20, default='Activo')
    valor_anterior = models.CharField(max_length=255, blank=True, null=True)
    valor_nuevo = models.CharField(max_length=255, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    notas = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-fecha']
        verbose_name_plural = "Historial de Transacciones"

    def __str__(self):
        return f"Audit {self.transaccion.id} - {self.campo_modificado} - {self.fecha}"


class MovimientoCategoria(models.Model):
    """Registro de historial (Kardex) de una categoría"""
    TIPO_MOVIMIENTO_CHOICES = [
        ('TRANSACCION', 'Movimiento Financiero'),
        ('ESTADO', 'Cambio de Estado'),
        ('INFO', 'Actualización de Datos'),
    ]
    
    categoria = models.ForeignKey(
        CategoriaTransaccion, 
        on_delete=models.CASCADE, 
        related_name='historial'
    )
    fecha = models.DateTimeField(auto_now_add=True)
    tipo_movimiento = models.CharField(max_length=20, choices=TIPO_MOVIMIENTO_CHOICES)
    
    # For property changes
    campo_modificado = models.CharField(max_length=100, blank=True, null=True)
    estado_categoria = models.CharField(max_length=20, default='Activo')
    valor_anterior = models.CharField(max_length=255, blank=True, null=True)
    valor_nuevo = models.CharField(max_length=255, blank=True, null=True)

    
    # References
    descripcion = models.TextField(blank=True, null=True)
    referencia = models.CharField(max_length=100, blank=True, null=True)
    transaccion_id = models.IntegerField(null=True, blank=True)
    notas = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-fecha']
        verbose_name_plural = "Movimientos de Categorías"

    def __str__(self):
        return f"{self.categoria.nombre} - {self.tipo_movimiento} - {self.fecha}"
