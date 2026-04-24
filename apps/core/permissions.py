from rest_framework import permissions


class IsGerente(permissions.BasePermission):
    """
    Permite acceso únicamente a los usuarios con rol de GERENTE.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Superusuarios o administradores de Django siempre tienen acceso total
        if request.user.is_superuser or request.user.is_staff:
            return True
        try:
            return request.user.perfil.rol == 'GERENTE'
        except AttributeError:
            return False


class IsVendedorPlus(permissions.BasePermission):
    """
    Permite acceso a COLABORADORES y GERENTES.
    Usado para vistas donde ambos roles interactúan de forma conjunta.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        try:
            rol = request.user.perfil.rol
            # 'COLABORADOR' es el nuevo nombre para 'VENDEDOR'; se acepta ambos durante migración
            return rol in ['GERENTE', 'VENDEDOR', 'COLABORADOR']
        except AttributeError:
            return False


class HasRBACScope(permissions.BasePermission):
    """
    Verifica que el usuario tenga un RolPersonalizado con el permiso exigido.
    Las vistas controladas por esto deben declarar 'required_scope = "modulo:accion"'.
    El Gerente general del tenant tiene pase libre.
    """
    message = "No tienes permiso para realizar esta acción. Requiere autorización empresarial."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            perfil = request.user.perfil
        except AttributeError:
            return False

        if perfil.rol == 'GERENTE':
            return True

        required_scope = getattr(view, 'required_scope', None)
        if not required_scope:
            return True  # Si la vista se olvida del scope, permite (fallback)

        if perfil.rol_custom:
            if required_scope in perfil.rol_custom.permisos:
                return True

        return False


class IsEmpresarioPlan(permissions.BasePermission):
    """
    Bloquea las funciones premium para tenants Emprendedores.
    """
    message = "Esta función requiere el Plan Empresario. Mejora tu suscripción contactando a ventas."

    def has_permission(self, request, view):
        if hasattr(request, 'tenant') and hasattr(request.tenant, 'suscripcion'):
            try:
                return request.tenant.suscripcion.plan.nombre == 'EMPRESARIO'
            except Exception:
                return False
        return False
