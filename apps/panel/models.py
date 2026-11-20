"""
Modelos del Panel de Control. Viven SOLO en el schema public (app en SHARED_APPS).
Solo referencian modelos públicos: Cliente (tenant), Plan y el usuario del schema public.
"""
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.clientes_saas.models import Cliente
from apps.suscripciones.models import Plan

MONEDA_CHOICES = [('PEN', 'Soles (PEN)'), ('USD', 'Dólares (USD)')]


class Pago(models.Model):
    """Ingreso de la plataforma: pago de una suscripción (manual hoy, Culqi mañana)."""

    METODO_CHOICES = [
        ('TRANSFERENCIA', 'Transferencia'),
        ('YAPE', 'Yape'),
        ('PLIN', 'Plin'),
        ('EFECTIVO', 'Efectivo'),
        ('TARJETA', 'Tarjeta'),
        ('CULQI', 'Culqi'),
        ('OTRO', 'Otro'),
    ]
    ESTADO_CHOICES = [('CONFIRMADO', 'Confirmado'), ('REVERSADO', 'Reversado')]

    # PROTECT: el historial financiero no se pierde aunque se intente borrar el negocio.
    empresa = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name='pagos_plataforma')
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, null=True, blank=True, related_name='pagos')
    monto = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    moneda = models.CharField(max_length=3, choices=MONEDA_CHOICES, default='PEN')
    metodo_pago = models.CharField(max_length=20, choices=METODO_CHOICES, default='TRANSFERENCIA')
    referencia = models.CharField(max_length=100, blank=True, default='',
                                  help_text='Nro. de operación / comprobante')
    fecha_pago = models.DateField()
    # Periodo de servicio que cubre este pago (si activó/extendió la suscripción)
    periodo_inicio = models.DateField(null=True, blank=True)
    periodo_fin = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='CONFIRMADO')
    notas = models.TextField(blank=True, default='')
    registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                       null=True, blank=True, related_name='+')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_pago', '-creado_en']
        indexes = [models.Index(fields=['fecha_pago']), models.Index(fields=['estado'])]

    def __str__(self):
        return f'{self.empresa.nombre} · {self.moneda} {self.monto} · {self.fecha_pago}'


class Gasto(models.Model):
    """Egreso operativo de la plataforma."""

    CATEGORIA_CHOICES = [
        ('INFRAESTRUCTURA', 'Infraestructura (hosting, BD, dominios)'),
        ('PASARELA', 'Comisiones de pasarela'),
        ('SERVICIOS', 'Servicios y licencias'),
        ('PERSONAL', 'Personal'),
        ('MARKETING', 'Marketing'),
        ('OTRO', 'Otro'),
    ]

    concepto = models.CharField(max_length=200)
    categoria = models.CharField(max_length=30, choices=CATEGORIA_CHOICES, default='INFRAESTRUCTURA')
    monto = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    moneda = models.CharField(max_length=3, choices=MONEDA_CHOICES, default='PEN')
    fecha = models.DateField()
    notas = models.TextField(blank=True, default='')
    registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                       null=True, blank=True, related_name='+')
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha', '-creado_en']
        indexes = [models.Index(fields=['fecha'])]

    def __str__(self):
        return f'{self.concepto} · {self.moneda} {self.monto}'


class MovimientoSuscripcion(models.Model):
    """Auditoría: toda acción del panel sobre la suscripción de un negocio."""

    ACCION_CHOICES = [
        ('CREACION', 'Creación'),
        ('ACTIVACION', 'Activación'),
        ('EXTENSION', 'Extensión'),
        ('SUSPENSION', 'Suspensión'),
        ('REACTIVACION', 'Reactivación'),
        ('CAMBIO_PLAN', 'Cambio de plan'),
        ('REVERSION_PAGO', 'Reversión de pago'),
    ]

    # Ligado al negocio (no a la Suscripcion) para que la auditoría sobreviva
    # aunque la suscripción se recree.
    empresa = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name='movimientos_suscripcion')
    accion = models.CharField(max_length=30, choices=ACCION_CHOICES)
    detalle = models.TextField(blank=True, default='')
    fecha_fin_anterior = models.DateField(null=True, blank=True)
    fecha_fin_nueva = models.DateField(null=True, blank=True)
    plan_anterior = models.ForeignKey(Plan, on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    plan_nuevo = models.ForeignKey(Plan, on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    pago = models.ForeignKey(Pago, on_delete=models.SET_NULL, null=True, blank=True, related_name='movimientos')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                null=True, blank=True, related_name='+')
    # Copia del nombre: la auditoría sigue legible aunque se borre el usuario
    usuario_nombre = models.CharField(max_length=150, blank=True, default='')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']
        indexes = [models.Index(fields=['accion']), models.Index(fields=['creado_en'])]

    def __str__(self):
        return f'{self.get_accion_display()} · {self.empresa.nombre} · {self.creado_en:%d/%m/%Y}'
