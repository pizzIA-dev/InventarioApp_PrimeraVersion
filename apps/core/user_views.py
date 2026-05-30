from django.contrib.auth.models import User
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.models import PerfilUsuario, RolPersonalizado
from apps.core.permissions import IsGerente, IsEmpresarioPlan
from apps.core.serializers import RolPersonalizadoSerializer
from apps.core.constants import ROLES_COLABORADOR


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_profile(request):
    """
    Ruta para la carga inicial de React.
    Devuelve los datos de la cuenta logueada, la metadata del Tenant y el almac├®n asignado.
    """
    try:
        perfil = request.user.perfil
        empresa = perfil.empresa

        empresa_data = None
        if empresa:
            empresa_data = {
                'id': empresa.id,
                'nombre': empresa.nombre,
                'ruc': empresa.ruc,
                'logo': request.build_absolute_uri(empresa.logo.url) if empresa.logo else None,
            }

        data = {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'rol': perfil.rol,
            'rol_display': perfil.get_rol_display(),
            'rol_custom_nombre': perfil.rol_custom.nombre if perfil.rol_custom else None,
            'empresa': empresa_data,
            'empresa_nombre': empresa.nombre if empresa else None,
        }
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsGerente])
def actualizar_empresa(request):
    """
    Permite al Gerente editar los datos de su tenant/empresa (nombre, ruc, logo).
    Para manejo de archivos soporta FormData y request.FILES.
    """
    try:
        empresa = request.user.perfil.empresa
        if not empresa:
            return Response({'error': 'No tienes una empresa asociada para editar.'}, status=status.HTTP_400_BAD_REQUEST)

        nombre = request.data.get('nombre')
        ruc = request.data.get('ruc')
        logo = request.FILES.get('logo')

        if nombre:
            empresa.nombre = nombre
        if ruc is not None:
            empresa.ruc = ruc
        if logo:
            empresa.logo = logo

        empresa.save()

        return Response({
            'detail': 'Datos de empresa actualizados.',
            'empresa': {
                'id': empresa.id,
                'nombre': empresa.nombre,
                'ruc': empresa.ruc,
                'logo': request.build_absolute_uri(empresa.logo.url) if empresa.logo else None,
            }
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RolPersonalizadoViewSet(viewsets.ModelViewSet):
    """
    CRUD completo para los roles.
    Solamente disponible para Gerentes, y bloqueado de ra├¡z si no es Plan Empresario (Upsell Wall).
    """
    queryset = RolPersonalizado.objects.all()
    serializer_class = RolPersonalizadoSerializer
    permission_classes = [IsGerente, IsEmpresarioPlan]


@api_view(['GET'])
@permission_classes([IsGerente])
def listar_usuarios(request):
    """
    Lista todos los colaboradores del tenant con su almac├®n asignado.
    Solo accesible por GERENTE.
    """
    perfiles = (
        PerfilUsuario.objects
        .select_related('user', 'rol_custom')
        .filter(rol__in=['VENDEDOR', 'COLABORADOR'])
    )
    data = [
        {
            'id': p.user.id,
            'username': p.user.username,
            'email': p.user.email,
            'is_active': p.user.is_active,
            'rol': p.rol,
            'rol_display': p.get_rol_display(),
            'rol_custom_nombre': p.rol_custom.nombre if p.rol_custom else None,
            'rol_custom_id': p.rol_custom.id if p.rol_custom else None,
            'date_joined': p.user.date_joined.strftime('%Y-%m-%d'),
        }
        for p in perfiles
    ]
    return Response(data)


@api_view(['POST'])
@permission_classes([IsGerente])
def crear_usuario(request):
    """
    Crea un nuevo colaborador y le asocia opcionalmente un Rol Personalizado y un Almac├®n.
    """
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    email = request.data.get('email', '').strip()
    rol_custom_id = request.data.get('rol_custom_id', None)

    if not username or not password:
        return Response(
            {'error': 'El nombre de usuario y la contrase├▒a son obligatorios.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(password) < 6:
        return Response(
            {'error': 'La contrase├▒a debe tener al menos 6 caracteres.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {'error': f'El usuario "{username}" ya existe.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(username=username, password=password, email=email)

    # Rol custom opcional (Plan Empresario)
    rol_obj = None
    if rol_custom_id:
        try:
            rol_obj = RolPersonalizado.objects.get(id=rol_custom_id)
        except RolPersonalizado.DoesNotExist:
            pass


    perfil = PerfilUsuario.objects.create(
        user=user,
        rol='COLABORADOR',
        rol_custom=rol_obj,
    )

    return Response(
        {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_active': user.is_active,
            'rol': 'COLABORADOR',
            'rol_display': perfil.get_rol_display(),
            'rol_custom_nombre': rol_obj.nombre if rol_obj else None,
            'date_joined': user.date_joined.strftime('%Y-%m-%d'),
        },
        status=status.HTTP_201_CREATED
    )


@api_view(['PATCH'])
@permission_classes([IsGerente])
def toggle_usuario(request, user_id):
    """
    Activa o desactiva un colaborador (soft delete).
    Solo accesible por GERENTE.
    """
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

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
    Permite al Gerente resetear la contrase├▒a de un Colaborador.
    Body: { new_password }
    """
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    new_password = request.data.get('new_password', '').strip()
    if len(new_password) < 6:
        return Response(
            {'error': 'La nueva contrase├▒a debe tener al menos 6 caracteres.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(new_password)
    user.save()
    return Response({'detail': 'Contrase├▒a actualizada correctamente.'})


