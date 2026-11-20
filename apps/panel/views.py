"""
API del Panel de Control — /api/panel/...

Todas las vistas usan PanelAPIMixin (token de panel + IsPanelAdmin),
excepto login y refresh, que son públicos pero con throttling.
"""
from datetime import date

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError

from apps.clientes_saas.models import Cliente
from apps.suscripciones import estado as estado_sus
from apps.suscripciones.models import Plan

from . import services
from .auth import PanelAPIMixin, PanelRefreshToken, es_admin_panel
from .models import Gasto, MovimientoSuscripcion, Pago
from .serializers import (
    ActivarSerializer, CambiarPlanSerializer, DuracionMixin, EmpresaDetalleSerializer,
    EmpresaListSerializer, GastoSerializer, MovimientoSerializer, NotasSerializer,
    PagoSerializer, PagoUpdateSerializer, PanelLoginSerializer, PanelUserSerializer,
    PlanSerializer, RevertirPagoSerializer, SuscripcionSerializer,
)


class PanelPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class LoginThrottle(AnonRateThrottle):
    scope = 'panel_login'
    rate = '10/min'


def _fecha(valor, nombre):
    if not valor:
        return None
    try:
        return date.fromisoformat(valor)
    except ValueError:
        raise ValidationError({nombre: 'Formato de fecha inválido (AAAA-MM-DD).'})


def _error_negocio(exc):
    return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


# ─── Auth ────────────────────────────────────────────────────────────────────

class PanelLoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = PanelLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class PanelRefreshView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        try:
            refresh = PanelRefreshToken(request.data.get('refresh', ''))
        except TokenError:
            return Response({'detail': 'Sesión del panel expirada.'}, status=status.HTTP_401_UNAUTHORIZED)
        # El usuario debe seguir siendo administrador al refrescar
        from django.contrib.auth import get_user_model
        user = get_user_model().objects.filter(pk=refresh.get('user_id')).first()
        if not es_admin_panel(user):
            return Response({'detail': 'Sin acceso al panel.'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response({'access': str(refresh.access_token)})


class PanelMeView(PanelAPIMixin, APIView):
    def get(self, request):
        return Response(PanelUserSerializer(request.user).data)


# ─── Métricas / planes ───────────────────────────────────────────────────────

class MetricasView(PanelAPIMixin, APIView):
    """GET /api/panel/metricas/?desde=AAAA-MM-DD&hasta=AAAA-MM-DD (por defecto: mes actual)."""

    def get(self, request):
        ref = estado_sus.hoy()
        desde = _fecha(request.query_params.get('desde'), 'desde') or ref.replace(day=1)
        hasta = _fecha(request.query_params.get('hasta'), 'hasta') or ref
        if desde > hasta:
            raise ValidationError({'desde': 'Debe ser anterior a "hasta".'})
        data = services.metricas(desde, hasta)
        data['atencion'] = EmpresaListSerializer(services.empresas_que_requieren_atencion(), many=True).data
        return Response(data)


class PlanesView(PanelAPIMixin, generics.ListAPIView):
    serializer_class = PlanSerializer
    pagination_class = None
    queryset = Plan.objects.all().order_by('precio_mensual')


# ─── Empresas (tenants) ──────────────────────────────────────────────────────

class EmpresaViewSet(PanelAPIMixin, viewsets.ReadOnlyModelViewSet):
    """
    GET  /empresas/?search=&plan=&estado=&ordering=
    GET  /empresas/{id}/
    POST /empresas/{id}/activar|extender|suspender|reactivar|cambiar-plan/
    """
    pagination_class = PanelPagination
    ORDENES = {
        'nombre': 'nombre', '-nombre': '-nombre',
        'creado_en': 'creado_en', '-creado_en': '-creado_en',
        'fecha_fin': 'suscripcion__fecha_fin', '-fecha_fin': '-suscripcion__fecha_fin',
    }

    def get_serializer_class(self):
        return EmpresaDetalleSerializer if self.action == 'retrieve' else EmpresaListSerializer

    def get_queryset(self):
        qs = Cliente.objects.exclude(schema_name='public').select_related('suscripcion__plan')
        p = self.request.query_params
        if p.get('search'):
            s = p['search'].strip()
            qs = qs.filter(Q(nombre__icontains=s) | Q(owner_email__icontains=s)
                           | Q(schema_name__icontains=s) | Q(codigo_acceso__iexact=s))
        if p.get('plan'):
            qs = qs.filter(suscripcion__plan__nombre=p['plan'].upper())
        if p.get('estado'):
            estados = [e for e in p['estado'].split(',') if e]
            if any(e not in estado_sus.ESTADOS_CALCULADOS for e in estados):
                raise ValidationError({'estado': f'Valores válidos: {", ".join(estado_sus.ESTADOS_CALCULADOS)}'})
            filtro = Q(pk__in=[])
            for e in estados:
                filtro |= estado_sus.q_por_estado(e)
            qs = qs.filter(filtro)
        return qs.order_by(self.ORDENES.get(p.get('ordering'), '-creado_en'), 'id')

    def _responder(self, empresa, extra=None):
        empresa = Cliente.objects.select_related('suscripcion__plan').get(pk=empresa.pk)
        data = EmpresaDetalleSerializer(empresa).data
        if extra:
            data.update(extra)
        return Response(data)

    def _ejecutar(self, request, pk, serializer_class, operacion):
        empresa = get_object_or_404(Cliente.objects.exclude(schema_name='public'), pk=pk)
        entrada = serializer_class(data=request.data)
        entrada.is_valid(raise_exception=True)
        try:
            extra = operacion(empresa, dict(entrada.validated_data))
        except services.OperacionInvalida as exc:
            return _error_negocio(exc)
        return self._responder(empresa, extra)

    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        """Registra el pago y activa/extiende la suscripción (operación atómica)."""
        def op(empresa, d):
            avisos = services.referencia_duplicada(d.get('referencia'))
            _, pago = services.registrar_pago_y_activar(empresa, usuario=request.user, **d)
            return {'pago_registrado': PagoSerializer(pago).data,
                    'avisos': ([f'Ya existe un pago con la referencia "{d["referencia"]}".']
                               if avisos else [])}
        return self._ejecutar(request, pk, ActivarSerializer, op)

    @action(detail=True, methods=['post'])
    def extender(self, request, pk=None):
        """Extiende sin registrar pago (cortesía)."""
        return self._ejecutar(request, pk, DuracionMixin,
                              lambda e, d: services.extender_sin_pago(e, usuario=request.user, **d) and None)

    @action(detail=True, methods=['post'])
    def suspender(self, request, pk=None):
        return self._ejecutar(request, pk, NotasSerializer,
                              lambda e, d: services.suspender(e, usuario=request.user, **d) and None)

    @action(detail=True, methods=['post'])
    def reactivar(self, request, pk=None):
        def op(empresa, d):
            sus = services.reactivar(empresa, usuario=request.user, **d)
            if estado_sus.estado_de(sus) == estado_sus.VENCIDA:
                return {'avisos': ['La suscripción está vencida: el negocio seguirá sin acceso '
                                   'hasta que registres un pago o la extiendas.']}
            return None
        return self._ejecutar(request, pk, NotasSerializer, op)

    @action(detail=True, methods=['post'], url_path='cambiar-plan')
    def cambiar_plan(self, request, pk=None):
        return self._ejecutar(request, pk, CambiarPlanSerializer,
                              lambda e, d: services.cambiar_plan(e, usuario=request.user, **d) and None)


# ─── Pagos ───────────────────────────────────────────────────────────────────

def _filtrar_fechas(qs, params, campo):
    desde = _fecha(params.get('fecha_desde'), 'fecha_desde')
    hasta = _fecha(params.get('fecha_hasta'), 'fecha_hasta')
    if desde:
        qs = qs.filter(**{f'{campo}__gte': desde})
    if hasta:
        qs = qs.filter(**{f'{campo}__lte': hasta})
    return qs


class PagoViewSet(PanelAPIMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                  mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """
    Pagos: listar, registrar (sin tocar la suscripción), corregir datos descriptivos
    y revertir. No se eliminan: un pago erróneo se revierte y queda en la auditoría.
    """
    pagination_class = PanelPagination
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_serializer_class(self):
        return PagoUpdateSerializer if self.action == 'partial_update' else PagoSerializer

    def get_queryset(self):
        qs = Pago.objects.select_related('empresa', 'plan', 'registrado_por')
        p = self.request.query_params
        qs = _filtrar_fechas(qs, p, 'fecha_pago')
        for campo in ('moneda', 'estado', 'metodo_pago'):
            if p.get(campo):
                qs = qs.filter(**{campo: p[campo].upper()})
        if p.get('empresa_id'):
            qs = qs.filter(empresa_id=p['empresa_id'])
        if p.get('search'):
            s = p['search'].strip()
            qs = qs.filter(Q(empresa__nombre__icontains=s) | Q(referencia__icontains=s))
        return qs

    def perform_create(self, serializer):
        self._avisos = services.referencia_duplicada(serializer.validated_data.get('referencia'))
        serializer.save(registrado_por=self.request.user)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if self._avisos:
            response.data['avisos'] = ['Ya existe un pago con esa referencia.']
        return response

    @action(detail=True, methods=['post'])
    def revertir(self, request, pk=None):
        pago = self.get_object()
        entrada = RevertirPagoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        try:
            pago = services.revertir_pago(pago, usuario=request.user, motivo=entrada.validated_data['motivo'])
        except services.OperacionInvalida as exc:
            return _error_negocio(exc)
        return Response(PagoSerializer(pago).data)


# ─── Gastos ──────────────────────────────────────────────────────────────────

class GastoViewSet(PanelAPIMixin, viewsets.ModelViewSet):
    serializer_class = GastoSerializer
    pagination_class = PanelPagination

    def get_queryset(self):
        qs = Gasto.objects.select_related('registrado_por')
        p = self.request.query_params
        qs = _filtrar_fechas(qs, p, 'fecha')
        for campo in ('moneda', 'categoria'):
            if p.get(campo):
                qs = qs.filter(**{campo: p[campo].upper()})
        if p.get('search'):
            qs = qs.filter(concepto__icontains=p['search'].strip())
        return qs

    def perform_create(self, serializer):
        serializer.save(registrado_por=self.request.user)


# ─── Auditoría ───────────────────────────────────────────────────────────────

class MovimientoViewSet(PanelAPIMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = MovimientoSerializer
    pagination_class = PanelPagination

    def get_queryset(self):
        qs = MovimientoSuscripcion.objects.select_related('empresa', 'plan_anterior', 'plan_nuevo')
        p = self.request.query_params
        if p.get('empresa_id'):
            qs = qs.filter(empresa_id=p['empresa_id'])
        if p.get('accion'):
            qs = qs.filter(accion=p['accion'].upper())
        return _filtrar_fechas(qs, p, 'creado_en__date')
