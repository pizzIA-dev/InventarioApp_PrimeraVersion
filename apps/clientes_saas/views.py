from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import transaction
from django.conf import settings as django_settings
from django_tenants.utils import tenant_context
from django.contrib.auth import get_user_model
from apps.clientes_saas.models import Cliente, Domain
from apps.suscripciones.models import Suscripcion
from .serializers import RegistroSaaSSerializer
import logging

logger = logging.getLogger(__name__)


class RegistroSaaSAPIView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = RegistroSaaSSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        plan_id = str(request.data.get('plan_id', '1'))
        plan_info = django_settings.PLAN_PRECIOS.get(plan_id, django_settings.PLAN_PRECIOS['1'])
        culqi_token = request.data.get('culqi_token', '')
        frontend_url = django_settings.FRONTEND_URL.rstrip('/')

        # === PASO 1: Verificar que el schema no exista ya ===
        schema_slug = data['subdominio']
        if Cliente.objects.filter(schema_name=schema_slug).exists():
            return Response(
                {'subdominio': ['Este identificador ya esta en uso. Elige otro.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        # === PASO 2: Procesar el pago con Culqi ===
        from apps.suscripciones.culqi_service import CulqiService
        culqi_svc = CulqiService()

        if culqi_svc.is_sandbox or not culqi_token:
            pago = culqi_svc.sandbox_bypass(data['email_admin'], plan_info['nombre'])
            estado_pago = 'SANDBOX'
        else:
            amount = plan_info['PEN']
            descripcion = f"NegocIA - Plan {plan_info['nombre']} | {data['nombre_empresa']}"
            pago = culqi_svc.crear_cobro(culqi_token, amount, data['email_admin'], descripcion)
            estado_pago = 'PAGADO' if pago['success'] else 'FALLIDO'

        if not pago['success']:
            return Response(
                {'error': f"Pago rechazado: {pago['message']}"},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        # === PASO 3: Crear el Tenant ===
        with transaction.atomic():
            tenant = Cliente(
                schema_name=schema_slug,
                nombre=data['nombre_empresa'],
                owner_email=data['email_admin'],
            )
            tenant.save()

            # Dominio (mantenemos por compatibilidad con django-tenants)
            base_domain = django_settings.BASE_DOMAIN
            domain_url  = f"{schema_slug}.{base_domain}"
            domain = Domain()
            domain.domain     = domain_url
            domain.tenant     = tenant
            domain.is_primary = True
            domain.save()

            # Suscripcion con estado de pago
            try:
                from apps.suscripciones.models import Plan
                plan_obj = Plan.objects.get(nombre=plan_info['nombre'])
                Suscripcion.objects.create(
                    cliente=tenant,
                    plan=plan_obj,
                    asientos_contratados=1,
                    culqi_charge_id=pago.get('charge_id', ''),
                    estado_pago=estado_pago,
                )
            except Exception as e:
                logger.warning(f"No se pudo crear Suscripcion: {e}")

            # Usuario Gerente dentro del schema
            with tenant_context(tenant):
                User = get_user_model()
                user = User.objects.create_superuser(
                    username=data['email_admin'],
                    email=data['email_admin'],
                    password=data['password_admin']
                )
                from apps.core.models import Empresa, PerfilUsuario
                empresa_interna = Empresa.objects.create(
                    nombre=data['nombre_empresa'],
                    email=data['email_admin'],
                    ruc=data.get('ruc', ''),
                    logo=data.get('logo', None)
                )
                PerfilUsuario.objects.create(
                    user=user,
                    rol='GERENTE',
                    empresa=empresa_interna
                )
                from apps.core.signals import ensure_defaults_for_empresa
                ensure_defaults_for_empresa(empresa_interna)

        # === PASO 4: Email de bienvenida ===
        login_url = f"{frontend_url}/t/{schema_slug}/login"
        try:
            from django.core.mail import send_mail
            send_mail(
                subject='Bienvenido a NegocIA - Tu negocio esta listo',
                message=(
                    f'Hola,\n\n'
                    f'Tu negocio "{data["nombre_empresa"]}" fue creado exitosamente.\n\n'
                    f'Accede a tu panel: {login_url}\n\n'
                    f'Usuario: {data["email_admin"]}\n\n'
                    f'El equipo de NegocIA'
                ),
                from_email=django_settings.DEFAULT_FROM_EMAIL,
                recipient_list=[data['email_admin']],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response({
            'mensaje': 'Registro exitoso. Tu negocio ha sido creado.',
            'login_url': login_url,
            'schema': schema_slug,
        }, status=status.HTTP_201_CREATED)


class BuscarTenantPorEmailAPIView(views.APIView):
    """
    Endpoint publico: recibe un email y devuelve TODOS los negocios (tenants)
    donde existe un usuario con ese email. Soporta multi-negocio por persona.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'El campo email es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        frontend_url = django_settings.FRONTEND_URL.rstrip('/')

        negocios = []
        for tenant in Cliente.objects.exclude(schema_name='public'):
            with tenant_context(tenant):
                match = (
                    User.objects.filter(email__iexact=email).exists() or
                    User.objects.filter(username__iexact=email).exists()
                )
                if match:
                    login_url = f"{frontend_url}/t/{tenant.schema_name}/login"
                    user_obj = (
                        User.objects.filter(email__iexact=email).first() or
                        User.objects.filter(username__iexact=email).first()
                    )
                    rol = 'Desconocido'
                    try:
                        rol = user_obj.perfil.get_rol_display()
                    except Exception:
                        rol = 'Administrador' if user_obj.is_superuser else 'Colaborador'

                    negocios.append({
                        'nombre':    tenant.nombre,
                        'schema':    tenant.schema_name,
                        'login_url': login_url,
                        'rol':       rol,
                    })

        if negocios:
            return Response({'found': True, 'negocios': negocios})

        return Response({
            'found': False,
            'error': 'No encontramos ningun negocio asociado a ese correo.'
        }, status=status.HTTP_404_NOT_FOUND)