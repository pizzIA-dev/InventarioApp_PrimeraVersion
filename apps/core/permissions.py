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
        except getattr(request.user, 'perfil', None) is None:
            return False

class IsVendedorPlus(permissions.BasePermission):
    """
    Permite acceso a VENDEDORES y GERENTES.
    Usado para vistas donde ambos roles interactúan de forma conjunta.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.is_superuser or request.user.is_staff:
            return True
            
        try:
            rol = request.user.perfil.rol
            return rol in ['GERENTE', 'VENDEDOR']
        except getattr(request.user, 'perfil', None) is None:
            return False
