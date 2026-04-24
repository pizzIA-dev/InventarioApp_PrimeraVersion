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
from decouple import config

class RegistroSaaSAPIView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = RegistroSaaSSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                data = serializer.validated_data

                # 1. Crear el Tenant (Schema físico en PostgreSQL)
                tenant = Cliente(
                    schema_name=data['subdominio'],
                    nombre=data['nombre_empresa'],
                    owner_email=data['email_admin'],
                )
                tenant.save()

                # 2. Asignar Dominio
                # BASE_DOMAIN en .env: 'localhost' (dev) | 'tudominio.com' (prod)
                base_domain = django_settings.BASE_DOMAIN
                domain_url  = f"{data['subdominio']}.{base_domain}"
                domain = Domain()
                domain.domain   = domain_url
                domain.tenant   = tenant
                domain.is_primary = True
                domain.save()

                # 3. Crear Suscripción
                Suscripcion.objects.create(
                    cliente=tenant,
                    plan=data['plan_id'],
                    asientos_contratados=1
                )

                # 4. Crear Usuario Gerente dentro del schema del tenant
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

                    # Garantizar que siempre existan el Cliente General y
                    # el Proveedor General en este tenant.
                    # (El signal post_save también lo hace, pero lo llamamos
                    #  aquí explícitamente como doble garantía.)
                    from apps.core.signals import ensure_defaults_for_empresa
                    ensure_defaults_for_empresa(empresa_interna)

                # 5. Construir URL de acceso según entorno
                is_debug = django_settings.DEBUG
                protocol = 'http' if is_debug else 'https'
                port_suffix = ':5175' if is_debug else ''
                login_url = f"{protocol}://{domain_url}{port_suffix}/login"

                # 6. Email de bienvenida (DEV: consola | PROD: SMTP real)
                try:
                    from django.core.mail import send_mail
                    send_mail(
                        subject='Bienvenido a NegocIA - Tu negocio está listo',
                        message=(
                            f'Hola,\n\n'
                            f'Tu negocio "{data["nombre_empresa"]}" fue creado exitosamente.\n\n'
                            f'Accede a tu panel: {login_url}\n\n'
                            f'Usuario: {data["email_admin"]}\n\n'
                            f'El equipo de NegocIA'
                        ),
                        from_email=django_settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[data['email_admin']],
                        fail_silently=True,   # No bloquear el registro si el email falla
                    )
                except Exception:
                    pass  # El registro sigue siendo válido aunque el email falle

                return Response({
                    'mensaje': 'Registro exitoso. Tu negocio ha sido creado.',
                    'login_url': login_url,
                    'api_url': f"{protocol}://{domain_url}{port_suffix.replace('5175','8000')}/api/"
                        if is_debug else f"{protocol}://api.{base_domain}/api/",
                }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BuscarTenantPorEmailAPIView(views.APIView):
    """
    Endpoint público: recibe un email y devuelve TODOS los negocios (tenants)
    donde existe un usuario con ese email. Soporta multi-negocio por persona.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'El campo email es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        is_debug = config('DEBUG', default=True, cast=bool)
        # En dev, el puerto de Vite puede variár; lo leemos del header Origin o usamos 5175
        origin = request.META.get('HTTP_ORIGIN', '')
        frontend_port = '5175'
        if ':' in origin:
            try:
                frontend_port = origin.rsplit(':', 1)[-1]
            except Exception:
                pass

        negocios = []
        for tenant in Cliente.objects.exclude(schema_name='public'):
            with tenant_context(tenant):
                match = (
                    User.objects.filter(email__iexact=email).exists() or
                    User.objects.filter(username__iexact=email).exists()
                )
                if match:
                    domain_obj = tenant.domains.filter(is_primary=True).first()
                    if domain_obj:
                        domain = domain_obj.domain
                        login_url = (
                            f"http://{domain}:{frontend_port}/login"
                            if is_debug else
                            f"https://{domain}/login"
                        )
                        # Obtener rol del usuario en este tenant
                        user_obj = (
                            User.objects.filter(email__iexact=email).first() or
                            User.objects.filter(username__iexact=email).first()
                        )
                        rol = 'DESCONOCIDO'
                        try:
                            rol = user_obj.perfil.get_rol_display()
                        except Exception:
                            rol = 'Administrador' if user_obj.is_superuser else 'Colaborador'

                        negocios.append({
                            'nombre':    tenant.nombre,
                            'subdominio': tenant.schema_name,
                            'login_url': login_url,
                            'rol':       rol,
                        })

        if negocios:
            return Response({'found': True, 'negocios': negocios})

        return Response({
            'found': False,
            'error': 'No encontramos ningún negocio asociado a ese correo.'
        }, status=status.HTTP_404_NOT_FOUND)
