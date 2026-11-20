"""
Lógica de negocio del Panel de Control.

Todas las operaciones sobre suscripciones pasan por aquí, tanto las manuales
(botones del panel) como las futuras automáticas (webhook de Culqi): así ambos
caminos registran el mismo Pago y la misma auditoría.
"""
import calendar
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth

from apps.clientes_saas.models import Cliente
from apps.suscripciones import estado as estado_sus
from apps.suscripciones.models import Plan, Suscripcion

from .models import Gasto, MovimientoSuscripcion, Pago


class OperacionInvalida(Exception):
    """Error de negocio que se muestra tal cual al administrador."""


# ─── Fechas ──────────────────────────────────────────────────────────────────

def sumar_meses(fecha: date, meses: int) -> date:
    """Suma meses calendario (31/01 + 1 mes = 28/02 o 29/02)."""
    mes_total = fecha.month - 1 + meses
    anio = fecha.year + mes_total // 12
    mes = mes_total % 12 + 1
    dia = min(fecha.day, calendar.monthrange(anio, mes)[1])
    return date(anio, mes, dia)


def calcular_periodo(suscripcion, *, meses=None, dias=None, fecha_fin=None, ref=None):
    """
    Devuelve (inicio, fin) del nuevo periodo.

    - Si la suscripción aún tiene días pagados (fecha_fin >= hoy) el periodo nuevo
      empieza al día siguiente de su fecha_fin: el cliente no pierde días.
    - Si está vencida, sin fecha o no existe, empieza hoy.
    - Prioridad: fecha_fin explícita > dias > meses (por defecto 1 mes calendario).
    """
    ref = ref or estado_sus.hoy()
    actual = getattr(suscripcion, 'fecha_fin', None)
    inicio = actual + timedelta(days=1) if actual and actual >= ref else ref

    if fecha_fin:
        if fecha_fin < ref:
            raise OperacionInvalida('La fecha de vencimiento no puede ser anterior a hoy.')
        return inicio if inicio <= fecha_fin else ref, fecha_fin
    if dias:
        return inicio, inicio + timedelta(days=int(dias) - 1)
    return inicio, sumar_meses(inicio, int(meses or 1)) - timedelta(days=1)


# ─── Auditoría ───────────────────────────────────────────────────────────────

def _registrar(empresa, accion, usuario, detalle='', **extra):
    return MovimientoSuscripcion.objects.create(
        empresa=empresa,
        accion=accion,
        detalle=detalle,
        usuario=usuario if getattr(usuario, 'pk', None) else None,
        usuario_nombre=getattr(usuario, 'username', '') or '',
        **extra,
    )


def _suscripcion_bloqueada(empresa):
    return Suscripcion.objects.select_for_update().filter(cliente=empresa).first()


def _fmt(d):
    return d.strftime('%d/%m/%Y') if d else 'sin vencimiento'


# ─── Operaciones sobre suscripciones ─────────────────────────────────────────

@transaction.atomic
def registrar_pago_y_activar(empresa: Cliente, *, usuario, monto, moneda='PEN',
                             metodo_pago='TRANSFERENCIA', referencia='', fecha_pago=None,
                             plan=None, meses=None, dias=None, fecha_fin=None, notas=''):
    """
    Operación principal del panel (y del futuro webhook de Culqi):
    registra el ingreso y activa/extiende la suscripción en una sola transacción.
    """
    sus = _suscripcion_bloqueada(empresa)
    if sus is None and plan is None:
        raise OperacionInvalida('El negocio no tiene suscripción: indica el plan a activar.')

    estado_previo = estado_sus.estado_de(sus)
    fin_anterior = sus.fecha_fin if sus else None
    plan_anterior = sus.plan if sus else None
    plan_final = plan or sus.plan

    inicio, fin = calcular_periodo(sus, meses=meses, dias=dias, fecha_fin=fecha_fin)

    pago = Pago.objects.create(
        empresa=empresa, plan=plan_final, monto=monto, moneda=moneda,
        metodo_pago=metodo_pago, referencia=referencia or '',
        fecha_pago=fecha_pago or estado_sus.hoy(),
        periodo_inicio=inicio, periodo_fin=fin, notas=notas or '',
        registrado_por=usuario if getattr(usuario, 'pk', None) else None,
    )

    if sus is None:
        sus = Suscripcion.objects.create(
            cliente=empresa, plan=plan_final, activa=True, fecha_fin=fin, estado_pago='PAGADO',
        )
        accion = 'CREACION'
    else:
        sus.plan = plan_final
        sus.activa = True
        sus.fecha_fin = fin
        sus.estado_pago = 'PAGADO'
        sus.save(update_fields=['plan', 'activa', 'fecha_fin', 'estado_pago'])
        accion = 'EXTENSION' if estado_previo in (estado_sus.ACTIVA, estado_sus.POR_VENCER) else 'ACTIVACION'

    detalle = (f'Pago de {moneda} {monto} ({pago.get_metodo_pago_display()}). '
               f'Periodo {_fmt(inicio)} → {_fmt(fin)}.')
    if plan_anterior and plan_anterior != plan_final:
        detalle += f' Plan {plan_anterior.nombre} → {plan_final.nombre}.'
    if notas:
        detalle += f' {notas}'

    _registrar(empresa, accion, usuario, detalle,
               fecha_fin_anterior=fin_anterior, fecha_fin_nueva=fin,
               plan_anterior=plan_anterior, plan_nuevo=plan_final, pago=pago)
    return sus, pago


@transaction.atomic
def extender_sin_pago(empresa, *, usuario, meses=None, dias=None, fecha_fin=None, notas=''):
    """Extensión de cortesía (prueba gratis, compensación). No registra ingreso."""
    sus = _suscripcion_bloqueada(empresa)
    if sus is None:
        raise OperacionInvalida('El negocio no tiene suscripción. Usa "Registrar pago y activar".')
    fin_anterior = sus.fecha_fin
    _, fin = calcular_periodo(sus, meses=meses, dias=dias, fecha_fin=fecha_fin)
    sus.fecha_fin = fin
    sus.activa = True
    sus.save(update_fields=['fecha_fin', 'activa'])
    detalle = f'Extensión sin pago: {_fmt(fin_anterior)} → {_fmt(fin)}.'
    if notas:
        detalle += f' {notas}'
    _registrar(empresa, 'EXTENSION', usuario, detalle,
               fecha_fin_anterior=fin_anterior, fecha_fin_nueva=fin,
               plan_anterior=sus.plan, plan_nuevo=sus.plan)
    return sus


@transaction.atomic
def suspender(empresa, *, usuario, notas=''):
    sus = _suscripcion_bloqueada(empresa)
    if sus is None:
        raise OperacionInvalida('El negocio no tiene suscripción.')
    if not sus.activa:
        raise OperacionInvalida('La suscripción ya está suspendida.')
    sus.activa = False
    sus.save(update_fields=['activa'])
    _registrar(empresa, 'SUSPENSION', usuario, notas or 'Suspensión manual.',
               fecha_fin_anterior=sus.fecha_fin, fecha_fin_nueva=sus.fecha_fin)
    return sus


@transaction.atomic
def reactivar(empresa, *, usuario, notas=''):
    """Vuelve a activar sin tocar fecha_fin (si ya venció seguirá sin acceso)."""
    sus = _suscripcion_bloqueada(empresa)
    if sus is None:
        raise OperacionInvalida('El negocio no tiene suscripción.')
    if sus.activa:
        raise OperacionInvalida('La suscripción ya está activa.')
    sus.activa = True
    sus.save(update_fields=['activa'])
    _registrar(empresa, 'REACTIVACION', usuario, notas or 'Reactivación manual.',
               fecha_fin_anterior=sus.fecha_fin, fecha_fin_nueva=sus.fecha_fin)
    return sus


@transaction.atomic
def cambiar_plan(empresa, *, usuario, plan, notas=''):
    sus = _suscripcion_bloqueada(empresa)
    if sus is None:
        raise OperacionInvalida('El negocio no tiene suscripción. Usa "Registrar pago y activar".')
    if sus.plan_id == plan.pk:
        raise OperacionInvalida('El negocio ya tiene ese plan.')
    anterior = sus.plan
    sus.plan = plan
    sus.save(update_fields=['plan'])
    _registrar(empresa, 'CAMBIO_PLAN', usuario,
               f'Plan {anterior.nombre} → {plan.nombre}. {notas}'.strip(),
               plan_anterior=anterior, plan_nuevo=plan,
               fecha_fin_anterior=sus.fecha_fin, fecha_fin_nueva=sus.fecha_fin)
    return sus


@transaction.atomic
def revertir_pago(pago: Pago, *, usuario, motivo):
    """
    Marca un pago como REVERSADO (deja de contar como ingreso).
    No toca la suscripción: si corresponde, el admin la suspende aparte.
    """
    pago = Pago.objects.select_for_update().get(pk=pago.pk)
    if pago.estado == 'REVERSADO':
        raise OperacionInvalida('El pago ya fue reversado.')
    if not motivo:
        raise OperacionInvalida('Indica el motivo de la reversión.')
    pago.estado = 'REVERSADO'
    pago.notas = f'{pago.notas}\n[Reversado] {motivo}'.strip()
    pago.save(update_fields=['estado', 'notas'])
    _registrar(pago.empresa, 'REVERSION_PAGO', usuario,
               f'Pago de {pago.moneda} {pago.monto} del {_fmt(pago.fecha_pago)} reversado: {motivo}',
               pago=pago)
    return pago


def referencia_duplicada(referencia, excluir_id=None):
    """Aviso (no bloqueante) de pagos con la misma referencia."""
    if not referencia:
        return []
    qs = Pago.objects.filter(referencia__iexact=referencia.strip()).exclude(estado='REVERSADO')
    if excluir_id:
        qs = qs.exclude(pk=excluir_id)
    return list(qs.values('id', 'empresa__nombre', 'monto', 'moneda', 'fecha_pago'))


# ─── Métricas ────────────────────────────────────────────────────────────────

def _por_moneda(qs, campo_monto='monto'):
    data = {'PEN': Decimal('0'), 'USD': Decimal('0')}
    for fila in qs.values('moneda').annotate(total=Sum(campo_monto)):
        data[fila['moneda']] = fila['total'] or Decimal('0')
    return data


def metricas(desde: date, hasta: date):
    ref = estado_sus.hoy()
    pagos_validos = Pago.objects.exclude(estado='REVERSADO')

    ingresos = _por_moneda(pagos_validos.filter(fecha_pago__range=(desde, hasta)))
    gastos = _por_moneda(Gasto.objects.filter(fecha__range=(desde, hasta)))
    balance = {m: ingresos[m] - gastos[m] for m in ingresos}
    ingresos_totales = _por_moneda(pagos_validos)

    empresas = Cliente.objects.exclude(schema_name='public')
    conteo = {e: empresas.filter(estado_sus.q_por_estado(e, ref=ref)).count()
              for e in estado_sus.ESTADOS_CALCULADOS}
    conteo['total'] = empresas.count()

    # MRR: suscripciones pagadas con acceso vigente (sandbox y suspendidas no son ingreso)
    pagantes = Suscripcion.objects.filter(
        estado_sus.q_por_estado(estado_sus.ACTIVA, prefijo='', ref=ref)
        | estado_sus.q_por_estado(estado_sus.POR_VENCER, prefijo='', ref=ref)
    ).exclude(cliente__schema_name='public')
    mrr = pagantes.aggregate(total=Sum('plan__precio_mensual'))['total'] or Decimal('0')
    n_pagantes = pagantes.count()
    arpu = (mrr / n_pagantes).quantize(Decimal('0.01')) if n_pagantes else Decimal('0')

    por_plan = list(
        Suscripcion.objects.exclude(cliente__schema_name='public')
        .values('plan__nombre').annotate(empresas=Count('id')).order_by('plan__nombre')
    )

    return {
        'periodo': {'desde': desde, 'hasta': hasta},
        'ingresos': ingresos,
        'gastos': gastos,
        'balance': balance,
        'ingresos_historicos': ingresos_totales,
        'mrr': {'PEN': mrr},
        'arpu': {'PEN': arpu},
        'suscripciones_pagantes': n_pagantes,
        'empresas': conteo,
        'por_plan': por_plan,
        'serie_mensual': serie_mensual(meses=12, ref=ref),
    }


def serie_mensual(meses=12, ref=None):
    """Ingresos y gastos por mes (últimos N meses, incluido el actual)."""
    ref = ref or estado_sus.hoy()
    inicio = sumar_meses(ref.replace(day=1), -(meses - 1))
    filas = defaultdict(lambda: {'ingresos_PEN': Decimal('0'), 'ingresos_USD': Decimal('0'),
                                 'gastos_PEN': Decimal('0'), 'gastos_USD': Decimal('0')})

    for f in (Pago.objects.exclude(estado='REVERSADO').filter(fecha_pago__gte=inicio)
              .annotate(mes=TruncMonth('fecha_pago')).values('mes', 'moneda').annotate(t=Sum('monto'))):
        filas[f['mes'].strftime('%Y-%m')][f'ingresos_{f["moneda"]}'] = f['t']
    for f in (Gasto.objects.filter(fecha__gte=inicio)
              .annotate(mes=TruncMonth('fecha')).values('mes', 'moneda').annotate(t=Sum('monto'))):
        filas[f['mes'].strftime('%Y-%m')][f'gastos_{f["moneda"]}'] = f['t']

    serie = []
    for i in range(meses):
        clave = sumar_meses(inicio, i).strftime('%Y-%m')
        serie.append({'mes': clave, **filas[clave]})
    return serie


def empresas_que_requieren_atencion(limite=10):
    """Vencidas y por vencer, ordenadas por fecha_fin (lo más urgente primero)."""
    ref = estado_sus.hoy()
    q = (estado_sus.q_por_estado(estado_sus.VENCIDA, ref=ref)
         | estado_sus.q_por_estado(estado_sus.POR_VENCER, ref=ref))
    return (Cliente.objects.exclude(schema_name='public').filter(q)
            .select_related('suscripcion__plan').order_by('suscripcion__fecha_fin')[:limite])
