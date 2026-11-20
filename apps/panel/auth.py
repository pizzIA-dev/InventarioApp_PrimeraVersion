"""
Autenticación del Panel de Control.

Capas de aislamiento respecto a la app de los negocios:
1. Tipo de token propio (`panel_access` / `panel_refresh`). simplejwt valida el
   claim `token_type`, así que un token de negocio no sirve aquí y un token del
   panel no sirve en /t/{schema}/ ni en /api/public/.
2. Solo se emite y solo se acepta en el schema public.
3. Cada petición re-verifica que el usuario siga activo y sea staff/superuser
   (quitarle el flag en el admin revoca el acceso al instante).
"""
from django.db import connection
from django_tenants.utils import get_public_schema_name
from rest_framework import permissions
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

PANEL_CLAIM = 'panel'


class PanelAccessToken(AccessToken):
    token_type = 'panel_access'


class PanelRefreshToken(RefreshToken):
    token_type = 'panel_refresh'
    access_token_class = PanelAccessToken
    # Claims que no se copian del refresh al access derivado
    no_copy_claims = RefreshToken.no_copy_claims


def es_admin_panel(user) -> bool:
    return bool(user and user.is_authenticated and user.is_active
                and (user.is_staff or user.is_superuser))


def tokens_panel(user) -> PanelRefreshToken:
    refresh = PanelRefreshToken.for_user(user)
    refresh[PANEL_CLAIM] = True
    refresh['username'] = user.username
    return refresh


def _en_schema_public() -> bool:
    return getattr(connection, 'schema_name', None) == get_public_schema_name()


class PanelJWTAuthentication(JWTAuthentication):
    """Solo acepta tokens `panel_access` y solo en el schema public."""

    def get_validated_token(self, raw_token):
        if not _en_schema_public():
            raise InvalidToken('El panel solo opera en el esquema público.')
        try:
            token = PanelAccessToken(raw_token)
        except Exception as exc:  # TokenError → 401 uniforme
            raise InvalidToken('Token de panel inválido o expirado.') from exc
        if not token.get(PANEL_CLAIM):
            raise InvalidToken('Token de panel inválido.')
        return token


class IsPanelAdmin(permissions.BasePermission):
    """Solo staff/superuser del schema public."""
    message = 'Acceso restringido al personal de la plataforma.'

    def has_permission(self, request, view):
        return _en_schema_public() and es_admin_panel(getattr(request, 'user', None))


class PanelAPIMixin:
    """Aplica la autenticación y el permiso del panel a una vista DRF."""
    authentication_classes = [PanelJWTAuthentication]
    permission_classes = [IsPanelAdmin]
