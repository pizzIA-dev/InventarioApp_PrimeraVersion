"""
Estado de una suscripción — fuente única de verdad.

Lo usan:
- El middleware de tenant (bloqueo inmediato de negocios sin acceso).
- Los logins públicos (tenant-lookup, platform-login).
- El Panel de Control (listados, filtros y métricas).
"""
from datetime import date, timedelta

from django.db.models import Q
from django.utils import timezone

DIAS_AVISO_VENCIMIENTO = 7

# Estados calculados (no se guardan en BD)
SIN_SUSCRIPCION = 'sin_suscripcion'
SUSPENDIDA = 'suspendida'
VENCIDA = 'vencida'
SANDBOX = 'sandbox'
POR_VENCER = 'por_vencer'
ACTIVA = 'activa'

ESTADOS_CALCULADOS = [ACTIVA, POR_VENCER, SANDBOX, VENCIDA, SUSPENDIDA, SIN_SUSCRIPCION]
ESTADOS_CON_ACCESO = {ACTIVA, POR_VENCER, SANDBOX, SIN_SUSCRIPCION}


def hoy() -> date:
    return timezone.localdate()


def estado_de(suscripcion, ref: date | None = None) -> str:
    """Devuelve el estado calculado de una suscripción (o de su ausencia)."""
    ref = ref or hoy()
    if suscripcion is None:
        return SIN_SUSCRIPCION
    if not suscripcion.activa:
        return SUSPENDIDA
    if suscripcion.fecha_fin and suscripcion.fecha_fin < ref:
        return VENCIDA
    if suscripcion.estado_pago == 'SANDBOX':
        return SANDBOX
    if suscripcion.fecha_fin and suscripcion.fecha_fin <= ref + timedelta(days=DIAS_AVISO_VENCIMIENTO):
        return POR_VENCER
    return ACTIVA


def dias_restantes(suscripcion, ref: date | None = None):
    """Días hasta fecha_fin (negativo si ya venció). None si no tiene vencimiento."""
    if suscripcion is None or not suscripcion.fecha_fin:
        return None
    return (suscripcion.fecha_fin - (ref or hoy())).days


def tiene_acceso(suscripcion, ref: date | None = None) -> bool:
    """
    ¿El negocio puede usar la aplicación?
    Sin suscripción registrada se permite (tenants legacy/sandbox), igual que antes.
    """
    return estado_de(suscripcion, ref) in ESTADOS_CON_ACCESO


def mensaje_sin_acceso(suscripcion) -> str | None:
    estado = estado_de(suscripcion)
    if estado == SUSPENDIDA:
        return ('La suscripción de este negocio está suspendida. '
                'Contacta al administrador de NegocIA para reactivarla.')
    if estado == VENCIDA:
        return (f'La suscripción de este negocio venció el '
                f'{suscripcion.fecha_fin.strftime("%d/%m/%Y")}. Renueva tu plan para continuar.')
    return None


def q_por_estado(estado: str, prefijo: str = 'suscripcion__', ref: date | None = None) -> Q:
    """
    Filtro ORM equivalente a estado_de(). `prefijo` es la ruta hacia Suscripcion
    desde el modelo consultado ('suscripcion__' desde Cliente, '' desde Suscripcion).
    """
    ref = ref or hoy()
    p = prefijo
    aviso = ref + timedelta(days=DIAS_AVISO_VENCIMIENTO)
    no_vencida = Q(**{f'{p}fecha_fin__isnull': True}) | Q(**{f'{p}fecha_fin__gte': ref})

    if estado == SIN_SUSCRIPCION:
        return Q(**{f'{p}id__isnull': True}) if p else Q(pk__in=[])
    if estado == SUSPENDIDA:
        return Q(**{f'{p}activa': False})
    if estado == VENCIDA:
        return Q(**{f'{p}activa': True, f'{p}fecha_fin__lt': ref})
    if estado == SANDBOX:
        return Q(**{f'{p}activa': True, f'{p}estado_pago': 'SANDBOX'}) & no_vencida
    if estado == POR_VENCER:
        return (Q(**{f'{p}activa': True, f'{p}fecha_fin__gte': ref, f'{p}fecha_fin__lte': aviso})
                & ~Q(**{f'{p}estado_pago': 'SANDBOX'}))
    if estado == ACTIVA:
        return (Q(**{f'{p}activa': True}) & ~Q(**{f'{p}estado_pago': 'SANDBOX'})
                & (Q(**{f'{p}fecha_fin__isnull': True}) | Q(**{f'{p}fecha_fin__gt': aviso})))
    raise ValueError(f'Estado desconocido: {estado}')
