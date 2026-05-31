from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Serializer JWT personalizado para multi-tenant SaaS.
    
    Arquitectura de seguridad:
    - Tokens estateless (sin blacklist) — incompatible con FK cross-schema
    - Revocación via is_active=False en el usuario (simplejwt la chequea siempre)
    - El JWT incluye datos del perfil/empresa para evitar round-trips extra
    - Compatible 100% con schemas aislados de django-tenants
    """
    def validate(self, attrs):
        data = super().validate(attrs)

        perfil = getattr(self.user, 'perfil', None)
        rol = perfil.rol if perfil else 'GERENTE'

        if self.user.is_superuser and not perfil:
            rol = 'GERENTE'

        empresa_nombre = None
        if perfil and getattr(perfil, 'empresa', None):
            empresa_nombre = perfil.empresa.nombre

        data['user'] = {
            'id':       self.user.id,
            'username': self.user.username,
            'email':    self.user.email,
            'rol':      rol,
            'empresa_nombre': empresa_nombre,
        }
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout stateless para multi-tenant SaaS.
    
    El cliente elimina sus tokens de localStorage/sessionStorage.
    El servidor responde 205 como confirmación.
    La revocación real se hace via user.is_active=False (chequeo interno de simplejwt).
    """
    return Response({'detail': 'Logout exitoso.'}, status=status.HTTP_205_RESET_CONTENT)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """
    Solicitud de restablecimiento de contraseña.
    
    Tenant-aware: solo busca el email dentro del schema del tenant actual.
    Genera un token seguro con PasswordResetTokenGenerator de Django.
    
    En producción: enviar por email. En desarrollo: retornar el link en la respuesta.
    Body: { email }
    """
    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'error': 'El email es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

    # Siempre responder OK (no revelar si el email existe) — seguridad anti-enumeración
    try:
        user = User.objects.get(email__iexact=email, is_active=True)
    except User.DoesNotExist:
        return Response({
            'detail': 'Si ese email está registrado, recibirás las instrucciones en breve.'
        })
    except User.MultipleObjectsReturned:
        user = User.objects.filter(email__iexact=email, is_active=True).first()

    # Generar token seguro (válido 24h por defecto de Django)
    token_gen = PasswordResetTokenGenerator()
    token = token_gen.make_token(user)
    uid   = urlsafe_base64_encode(force_bytes(user.pk))

    # Construir URL de reset apuntando al mismo subdominio del tenant
    # DEV:  http://tenant.localhost:5175/reset-password/:uid/:token
    # PROD: https://tenant.tudominio.com/reset-password/:uid/:token
    from django.conf import settings as django_settings
    import logging
    logger = logging.getLogger(__name__)

    if django_settings.DEBUG:
        # En dev: el frontend corre en puerto 5175 (u otro de Vite)
        frontend_host = request.get_host().replace(':8000', ':5175')
        reset_url = f"http://{frontend_host}/reset-password/{uid}/{token}"
    else:
        # En prod: sin puerto, con HTTPS
        frontend_host = request.get_host().replace(':8000', '')
        reset_url = f"https://{frontend_host}/reset-password/{uid}/{token}"

    # Enviar email
    #  - DEV:  EMAIL_BACKEND=console → aparece en la terminal del servidor
    #  - PROD: EMAIL_BACKEND=smtp    → llega al correo real
    try:
        from django.core.mail import send_mail
        send_mail(
            subject='Restablece tu contraseña — NegocIA',
            message=(
                f'Hola {user.username},\n\n'
                f'Recibimos una solicitud para restablecer tu contraseña.\n\n'
                f'Haz clic en el siguiente enlace (válido 24 horas):\n'
                f'{reset_url}\n\n'
                f'Si no solicitaste esto, ignora este mensaje.\n\n'
                f'El equipo de NegocIA'
            ),
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f"[RESET PASSWORD] Email enviado a {email} | URL: {reset_url}")
    except Exception as e:
        logger.error(f"[RESET PASSWORD] Fallo al enviar email a {email}: {e}")

    response_data = {
        'detail': 'Si ese email está registrado, recibirás las instrucciones en breve.'
    }
    # En DEBUG: exponer el link en la respuesta para testing sin servidor de email
    if django_settings.DEBUG:
        response_data['reset_url'] = reset_url

    return Response(response_data)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_confirm(request, uid, token):
    """
    Confirmación de restablecimiento de contraseña.
    
    Valida uid + token (generados por forgot_password) y actualiza la contraseña.
    Body: { new_password, confirm_password }
    """
    new_password     = request.data.get('new_password', '').strip()
    confirm_password = request.data.get('confirm_password', '').strip()

    if not new_password:
        return Response({'error': 'La nueva contraseña es requerida.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(new_password) < 6:
        return Response({'error': 'La contraseña debe tener al menos 6 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)
    if new_password != confirm_password:
        return Response({'error': 'Las contraseñas no coinciden.'}, status=status.HTTP_400_BAD_REQUEST)

    # Decodificar uid
    try:
        user_pk = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_pk)
    except (TypeError, ValueError, User.DoesNotExist):
        return Response({'error': 'Enlace de restablecimiento inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    # Validar token
    token_gen = PasswordResetTokenGenerator()
    if not token_gen.check_token(user, token):
        return Response({'error': 'El enlace expiró o ya fue usado. Solicita uno nuevo.'}, status=status.HTTP_400_BAD_REQUEST)

    # Cambiar contraseña
    user.set_password(new_password)
    user.save()

    return Response({'detail': 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.'})
