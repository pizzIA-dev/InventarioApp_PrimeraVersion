"""
JWT atado al schema que lo emitió.

Problema que resuelve: con django-tenants cada schema tiene su propia tabla
auth_user y los ids se repiten (el Gerente suele ser user_id=1 en todos).
Un JWT sin información de schema emitido en /t/negocio-a/ servía en /t/negocio-b/
(o en el schema public) como el usuario con el mismo id de ese otro schema.

Solución: todo token lleva el claim `schema` y la autenticación lo rechaza si no
coincide con el schema activo de la petición (lo fija TenantFromPathMiddleware).
"""
from django.db import connection
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken

SCHEMA_CLAIM = 'schema'
MENSAJE_SCHEMA = 'El token no pertenece a este negocio. Inicia sesión nuevamente.'


def schema_actual() -> str:
    return getattr(connection, 'schema_name', None) or 'public'


def refresh_para_usuario(user, schema: str | None = None) -> RefreshToken:
    """Crea un refresh token (y su access derivado) con el claim de schema."""
    refresh = RefreshToken.for_user(user)
    refresh[SCHEMA_CLAIM] = schema or schema_actual()
    return refresh


class SchemaBoundJWTAuthentication(JWTAuthentication):
    """JWTAuthentication que exige que el token sea del schema activo."""

    def get_validated_token(self, raw_token):
        token = super().get_validated_token(raw_token)
        if token.get(SCHEMA_CLAIM) != schema_actual():
            raise InvalidToken(MENSAJE_SCHEMA)
        return token

# Nota: la vista de refresh vive en apps/core/auth_views.py (SchemaBoundTokenRefreshView).
# Este módulo no debe importar vistas de DRF: DRF lo importa al cargar su configuración.
