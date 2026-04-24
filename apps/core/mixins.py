from rest_framework import status
from rest_framework.response import Response


class SoloGerenteDestroyMixin:
    """
    Mixin que restringe la eliminación permanente (DELETE) únicamente
    al Gerente (cuenta principal del tenant) o superusuario Django.
    Los colaboradores reciben un 403 con mensaje claro.
    """

    def destroy(self, request, *args, **kwargs):
        # Superusuarios de Django tienen acceso total
        if request.user.is_superuser:
            return super().destroy(request, *args, **kwargs)

        try:
            rol = request.user.perfil.rol
        except Exception:
            return Response(
                {'error': 'No tienes un perfil válido asignado.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if rol != 'GERENTE':
            return Response(
                {
                    'error': (
                        'Solo el Gerente puede eliminar registros de forma permanente. '
                        'Si necesitas anular este registro, usa la opción "Cancelar".'
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(request, *args, **kwargs)
