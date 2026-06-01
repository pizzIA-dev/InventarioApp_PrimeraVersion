from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.db import transaction
from django.conf import settings as django_settings
from django_tenants.utils import tenant_context, schema_context
from django.contrib.auth import get_user_model
from apps.clientes_saas.models import Cliente, Domain
from apps.suscripciones.models import Suscripcion
from .serializers import RegistroSaaSSerializer
import logging

logger = logging.getLogger(__name__)


def _crear_usuario_plataforma(email, password):
    """
    Crea o actualiza el usuario de plataforma en el schema PUBLIC.
    Se llama desde el registro para garantizar que el usuario pueda
    hacer login en la landing con sus credenciales del negocio.
    """
    User = get_user_model()
    pub_user, created = User.objects.get_or_create(
        username=email,
        defaults={'email': email}
    )
    pub_user.email = email
    pub_user.set_password(password)
    pub_user.save()
    logger.info(f"Usuario plataforma {'creado' if created else 'actualizado'}: {email}")
    return pub_user


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
                {'subdominio': ['Este subdominio ya esta en uso.']},
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

            # === NUEVO: Crear usuario de plataforma (schema publico) ===
            # Permite que el usuario haga login en la landing con las mismas credenciales
            try:
                _crear_usuario_plataforma(data['email_admin'], data['password_admin'])
            except Exception as e:
                logger.warning(f"No se pudo crear usuario plataforma: {e}")

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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tenant_token_view(request):
    """
    Emite un JWT de tenant sin pedir contraseÃ±a nuevamente.
    Requiere: Platform JWT (login en schema publico).
    Body: { "schema": "pizzia" }
    Retorna: JWT del tenant + datos del usuario en ese negocio.
    """
    schema = request.data.get('schema', '').strip().lower()
    if not schema:
        return Response({'error': 'El campo schema es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

    platform_email = request.user.email or request.user.username

    try:
        tenant = Cliente.objects.get(schema_name=schema)
    except Cliente.DoesNotExist:
        return Response({'error': 'Negocio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        with schema_context(schema):
            User = get_user_model()
            tenant_user = (
                User.objects.filter(email__iexact=platform_email).first() or
                User.objects.filter(username__iexact=platform_email).first()
            )
            if not tenant_user:
                return Response({'error': 'No tienes acceso a este negocio.'}, status=status.HTTP_403_FORBIDDEN)

            if not tenant_user.is_active:
                return Response({'error': 'Usuario inactivo en este negocio.'}, status=status.HTTP_403_FORBIDDEN)

            # Generar JWT del tenant
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(tenant_user)

            # Datos del perfil en el tenant
            rol = 'GERENTE'
            empresa_nombre = tenant.nombre
            try:
                rol = tenant_user.perfil.rol
                empresa_nombre = tenant_user.perfil.empresa.nombre
            except Exception:
                pass

            return Response({
                'access':  str(refresh.access_token),
                'refresh': str(refresh),
                'schema':  schema,
                'user': {
                    'id':             tenant_user.id,
                    'username':       tenant_user.username,
                    'email':          tenant_user.email,
                    'rol':            rol,
                    'empresa_nombre': empresa_nombre,
                },
            })
    except Exception as e:
        logger.error(f"tenant_token_view error para schema={schema}: {e}")
        return Response({'error': 'Error interno al acceder al negocio.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PlatformLoginAPIView(views.APIView):
    """
    Login de plataforma: autentica contra los schemas de tenant donde existe el usuario.
    No requiere usuario en el schema publico. Devuelve Platform JWT + lista de negocios.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email    = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        if not email or not password:
            return Response({'error': 'Email y contrasena son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        tenants_encontrados = []
        autenticado = False

        for tenant in Cliente.objects.exclude(schema_name='public'):
            try:
                with schema_context(tenant.schema_name):
                    TenantUser = get_user_model()
                    tenant_user = (
                        TenantUser.objects.filter(email__iexact=email).first() or
                        TenantUser.objects.filter(username__iexact=email).first()
                    )
                    if tenant_user and tenant_user.is_active and tenant_user.check_password(password):
                        autenticado = True
                        rol = 'Administrador'
                        try:
                            rol = tenant_user.perfil.get_rol_display()
                        except Exception:
                            rol = 'Administrador' if tenant_user.is_superuser else 'Colaborador'
                        tenants_encontrados.append({
                            'nombre': tenant.nombre,
                            'schema': tenant.schema_name,
                            'rol':    rol,
                        })
            except Exception as e:
                logger.warning(f"PlatformLogin: error en tenant {tenant.schema_name}: {e}")
                continue

        if not autenticado or not tenants_encontrados:
            return Response(
                {'error': 'Credenciales incorrectas o no tienes negocios asociados.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Crear/actualizar usuario en schema publico para el TenantTokenView
        try:
            pub_user = _crear_usuario_plataforma(email, password)
        except Exception as e:
            logger.warning(f"PlatformLogin: no se pudo actualizar usuario publico: {e}")
            # Crear uno temporal sin guardar JWT de tenant
            pub_user = User.objects.filter(username=email).first()

        if not pub_user:
            return Response({'error': 'Error interno al crear sesion.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Generar Platform JWT
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(pub_user)

        return Response({
            'access':   str(refresh.access_token),
            'refresh':  str(refresh),
            'negocios': tenants_encontrados,
        })