from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.models import PerfilUsuario
from apps.core.permissions import IsGerente


@api_view(['GET'])
@permission_classes([IsGerente])
def listar_usuarios(request):
    """
    Retorna la lista de usuarios con perfil VENDEDOR registrados.
    Solo accesible por GERENTE.
    """
    perfiles = PerfilUsuario.objects.select_related('user').filter(rol='VENDEDOR')
    data = [
        {
            'id': p.user.id,
            'username': p.user.username,
            'email': p.user.email,
            'is_active': p.user.is_active,
            'rol': p.rol,
            'date_joined': p.user.date_joined.strftime('%Y-%m-%d'),
        }
        for p in perfiles
    ]
    return Response(data)


@api_view(['POST'])
@permission_classes([IsGerente])
def crear_usuario(request):
    """
    Crea un nuevo usuario con rol VENDEDOR.
    Body esperado: { username, password, email (opcional) }
    Solo accesible por GERENTE.
    """
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    email = request.data.get('email', '').strip()

    if not username or not password:
        return Response(
            {'error': 'El nombre de usuario y la contraseña son obligatorios.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(password) < 6:
        return Response(
            {'error': 'La contraseña debe tener al menos 6 caracteres.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {'error': f'El usuario "{username}" ya existe.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(username=username, password=password, email=email)
    PerfilUsuario.objects.create(user=user, rol='VENDEDOR')

    return Response(
        {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_active': user.is_active,
            'rol': 'VENDEDOR',
            'date_joined': user.date_joined.strftime('%Y-%m-%d'),
        },
        status=status.HTTP_201_CREATED
    )


@api_view(['PATCH'])
@permission_classes([IsGerente])
def toggle_usuario(request, user_id):
    """
    Activa o desactiva un usuario Vendedor (soft delete).
    Solo accesible por GERENTE.
    """
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    # Impedir que el Gerente se desactive a sí mismo
    if user == request.user:
        return Response(
            {'error': 'No puedes desactivar tu propia cuenta.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.is_active = not user.is_active
    user.save()

    return Response({
        'id': user.id,
        'username': user.username,
        'is_active': user.is_active,
    })


@api_view(['PUT'])
@permission_classes([IsGerente])
def cambiar_password(request, user_id):
    """
    Permite al Gerente resetear la contraseña de un Vendedor.
    Body: { new_password }
    """
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    new_password = request.data.get('new_password', '').strip()
    if len(new_password) < 6:
        return Response(
            {'error': 'La nueva contraseña debe tener al menos 6 caracteres.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(new_password)
    user.save()
    return Response({'detail': 'Contraseña actualizada correctamente.'})
