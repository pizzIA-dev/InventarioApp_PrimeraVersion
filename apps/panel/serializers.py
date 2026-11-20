from decimal import Decimal

from django.contrib.auth import authenticate
from rest_framework import serializers

from apps.clientes_saas.models import Cliente
from apps.suscripciones import estado as estado_sus
from apps.suscripciones.models import Plan, Suscripcion

from .auth import es_admin_panel, tokens_panel
from .models import Gasto, MovimientoSuscripcion, Pago


# ─── Auth ────────────────────────────────────────────────────────────────────

class PanelLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(username=attrs['username'].strip(), password=attrs['password'])
        # Mismo mensaje para credenciales malas y para usuarios sin permiso:
        # no revela qué cuentas existen ni cuáles son administradoras.
        if not es_admin_panel(user):
            raise serializers.ValidationError('Credenciales inválidas o sin acceso al panel.')
        refresh = tokens_panel(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': PanelUserSerializer(user).data,
        }


class PanelUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    nombre = serializers.SerializerMethodField()
    is_superuser = serializers.BooleanField()

    def get_nombre(self, user):
        return user.get_full_name() or user.username


# ─── Planes / suscripción ────────────────────────────────────────────────────

class PlanSerializer(serializers.ModelSerializer):
    nombre_display = serializers.CharField(source='get_nombre_display', read_only=True)

    class Meta:
        model = Plan
        fields = ['id', 'nombre', 'nombre_display', 'precio_mensual', 'tiene_roles_avanzados']


class SuscripcionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    estado = serializers.SerializerMethodField()
    dias_restantes = serializers.SerializerMethodField()
    tiene_acceso = serializers.SerializerMethodField()

    class Meta:
        model = Suscripcion
        fields = ['id', 'plan', 'activa', 'fecha_inicio', 'fecha_fin', 'estado_pago',
                  'asientos_contratados', 'estado', 'dias_restantes', 'tiene_acceso']

    def get_estado(self, obj):
        return estado_sus.estado_de(obj)

    def get_dias_restantes(self, obj):
        return estado_sus.dias_restantes(obj)

    def get_tiene_acceso(self, obj):
        return estado_sus.tiene_acceso(obj)


def _suscripcion_de(cliente):
    try:
        return cliente.suscripcion
    except Suscripcion.DoesNotExist:
        return None


class EmpresaListSerializer(serializers.ModelSerializer):
    suscripcion = serializers.SerializerMethodField()
    estado = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = ['id', 'nombre', 'owner_email', 'schema_name', 'codigo_acceso',
                  'creado_en', 'estado', 'suscripcion']

    def get_suscripcion(self, obj):
        sus = _suscripcion_de(obj)
        return SuscripcionSerializer(sus).data if sus else None

    def get_estado(self, obj):
        return estado_sus.estado_de(_suscripcion_de(obj))


# ─── Pagos / gastos / movimientos ────────────────────────────────────────────

class PagoSerializer(serializers.ModelSerializer):
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True)
    plan_nombre = serializers.CharField(source='plan.nombre', read_only=True, default=None)
    metodo_pago_display = serializers.CharField(source='get_metodo_pago_display', read_only=True)
    registrado_por_nombre = serializers.CharField(source='registrado_por.username', read_only=True,
                                                  default=None)

    class Meta:
        model = Pago
        fields = ['id', 'empresa', 'empresa_nombre', 'plan', 'plan_nombre', 'monto', 'moneda',
                  'metodo_pago', 'metodo_pago_display', 'referencia', 'fecha_pago',
                  'periodo_inicio', 'periodo_fin', 'estado', 'notas',
                  'registrado_por_nombre', 'creado_en']
        read_only_fields = ['periodo_inicio', 'periodo_fin', 'estado', 'creado_en']
        extra_kwargs = {'empresa': {'queryset': Cliente.objects.exclude(schema_name='public')}}


class PagoUpdateSerializer(serializers.ModelSerializer):
    """Tras registrarse, solo se corrigen datos descriptivos (el monto se revierte, no se edita)."""

    class Meta:
        model = Pago
        fields = ['referencia', 'metodo_pago', 'notas']


class GastoSerializer(serializers.ModelSerializer):
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    registrado_por_nombre = serializers.CharField(source='registrado_por.username', read_only=True,
                                                  default=None)

    class Meta:
        model = Gasto
        fields = ['id', 'concepto', 'categoria', 'categoria_display', 'monto', 'moneda', 'fecha',
                  'notas', 'registrado_por_nombre', 'creado_en', 'actualizado_en']
        read_only_fields = ['creado_en', 'actualizado_en']


class MovimientoSerializer(serializers.ModelSerializer):
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True)
    accion_display = serializers.CharField(source='get_accion_display', read_only=True)
    plan_anterior_nombre = serializers.CharField(source='plan_anterior.nombre', read_only=True, default=None)
    plan_nuevo_nombre = serializers.CharField(source='plan_nuevo.nombre', read_only=True, default=None)

    class Meta:
        model = MovimientoSuscripcion
        fields = ['id', 'empresa', 'empresa_nombre', 'accion', 'accion_display', 'detalle',
                  'fecha_fin_anterior', 'fecha_fin_nueva', 'plan_anterior_nombre',
                  'plan_nuevo_nombre', 'pago', 'usuario_nombre', 'creado_en']


class EmpresaDetalleSerializer(EmpresaListSerializer):
    pagos = serializers.SerializerMethodField()
    movimientos = serializers.SerializerMethodField()
    total_pagado = serializers.SerializerMethodField()
    respaldos = serializers.SerializerMethodField()

    class Meta(EmpresaListSerializer.Meta):
        fields = EmpresaListSerializer.Meta.fields + ['pagos', 'movimientos', 'total_pagado', 'respaldos']

    def get_respaldos(self, obj):
        """Estado de los respaldos del negocio (solo metadatos; se lee en su schema)."""
        from django.utils import timezone
        from django_tenants.utils import tenant_context
        try:
            with tenant_context(obj):
                from apps.core.models import ConfiguracionBackup, RegistroBackup
                config = ConfiguracionBackup.objects.first()
                ultimos = list(RegistroBackup.objects.defer('contenido').order_by('-fecha_creacion')[:5])
                ultimo_ok = next((r for r in ultimos if r.estado == 'EXITO'), None)
                dias = ((timezone.now() - ultimo_ok.fecha_creacion).days if ultimo_ok else None)
                return {
                    'configurado': config is not None,
                    'activo': config.activo if config else True,
                    'frecuencia': config.frecuencia if config else 'DIARIO',
                    'hora': config.hora_ejecucion.strftime('%H:%M') if config else '03:00',
                    'ultimo_exito': ultimo_ok.fecha_creacion if ultimo_ok else None,
                    'dias_sin_respaldo': dias,
                    'ultimo_fallo': bool(ultimos) and ultimos[0].estado == 'ERROR',
                    'recientes': [{
                        'fecha': r.fecha_creacion, 'estado': r.estado, 'origen': r.origen,
                        'tamano_bytes': r.tamano_bytes, 'notas': r.notas,
                    } for r in ultimos],
                }
        except Exception as exc:  # p. ej. schema sin migrar
            return {'error': str(exc)}

    def get_pagos(self, obj):
        qs = obj.pagos_plataforma.select_related('plan', 'registrado_por')[:50]
        return PagoSerializer(qs, many=True).data

    def get_movimientos(self, obj):
        qs = obj.movimientos_suscripcion.select_related('plan_anterior', 'plan_nuevo')[:50]
        return MovimientoSerializer(qs, many=True).data

    def get_total_pagado(self, obj):
        from django.db.models import Sum
        filas = (obj.pagos_plataforma.exclude(estado='REVERSADO')
                 .values('moneda').annotate(total=Sum('monto')))
        return {f['moneda']: f['total'] for f in filas}


# ─── Entradas de las acciones ────────────────────────────────────────────────

class DuracionMixin(serializers.Serializer):
    meses = serializers.IntegerField(required=False, min_value=1, max_value=36)
    dias = serializers.IntegerField(required=False, min_value=1, max_value=1095)
    fecha_fin = serializers.DateField(required=False)
    notas = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate(self, attrs):
        if sum(1 for k in ('meses', 'dias', 'fecha_fin') if attrs.get(k)) > 1:
            raise serializers.ValidationError('Indica solo una duración: meses, días o fecha de vencimiento.')
        return attrs


class ActivarSerializer(DuracionMixin):
    plan_id = serializers.PrimaryKeyRelatedField(queryset=Plan.objects.all(), source='plan',
                                                 required=False, allow_null=True)
    monto = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    moneda = serializers.ChoiceField(choices=['PEN', 'USD'], default='PEN')
    metodo_pago = serializers.ChoiceField(choices=[c[0] for c in Pago.METODO_CHOICES],
                                          default='TRANSFERENCIA')
    referencia = serializers.CharField(required=False, allow_blank=True, max_length=100)
    fecha_pago = serializers.DateField(required=False)


class NotasSerializer(serializers.Serializer):
    notas = serializers.CharField(required=False, allow_blank=True, max_length=500)


class CambiarPlanSerializer(NotasSerializer):
    plan_id = serializers.PrimaryKeyRelatedField(queryset=Plan.objects.all(), source='plan')


class RevertirPagoSerializer(serializers.Serializer):
    motivo = serializers.CharField(max_length=500)
