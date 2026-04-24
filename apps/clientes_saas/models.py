from django.db import models
from django_tenants.models import TenantMixin, DomainMixin


class Cliente(TenantMixin):
    """
    Tenant raíz del sistema multi-tenant.
    Cada 'Cliente' es un negocio suscrito con su propio schema de PostgreSQL.
    """
    nombre = models.CharField(max_length=100)
    # Email del propietario/Gerente principal — identifica quién registró el negocio
    owner_email = models.EmailField(
        unique=True,
        null=True,  # nullable para retro-compatibilidad con tenants existentes
        blank=True,
        help_text="Email del Gerente principal que creó y administra este tenant."
    )
    creado_en = models.DateField(auto_now_add=True)

    # Schema se crea y sincroniza automáticamente al guardar
    auto_create_schema = True

    class Meta:
        verbose_name = "Tenant (Negocio)"
        verbose_name_plural = "Tenants (Negocios)"

    def __str__(self):
        return f"{self.nombre} ({self.schema_name})"


class Domain(DomainMixin):
    """Dominio/subdominio asociado a un tenant."""
    pass
