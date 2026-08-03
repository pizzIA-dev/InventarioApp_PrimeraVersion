import secrets
import string
from django.db import models
from django_tenants.models import TenantMixin, DomainMixin


def _generar_codigo_acceso():
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(8))


class Cliente(TenantMixin):
    """
    Tenant raiz del sistema multi-tenant.
    Cada 'Cliente' es un negocio suscrito con su propio schema de PostgreSQL.
    """
    nombre = models.CharField(max_length=100)
    # Email del propietario/Gerente principal - identifica quien registro el negocio
    owner_email = models.EmailField(
        unique=True,
        null=True,  # nullable para retro-compatibilidad con tenants existentes
        blank=True,
        help_text="Email del Gerente principal que creo y administra este tenant."
    )
    codigo_acceso = models.CharField(
        max_length=8, unique=True, blank=True, default='',
        help_text='Codigo corto alfanumerico para que colaboradores accedan al negocio'
    )
    creado_en = models.DateField(auto_now_add=True)

    # Schema se crea y sincroniza automaticamente al guardar
    auto_create_schema = True

    def save(self, *args, **kwargs):
        if not self.codigo_acceso:
            chars = string.ascii_uppercase + string.digits
            while True:
                code = _generar_codigo_acceso()
                if not Cliente.objects.filter(codigo_acceso=code).exists():
                    self.codigo_acceso = code
                    break
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Tenant (Negocio)"
        verbose_name_plural = "Tenants (Negocios)"

    def __str__(self):
        return f"{self.nombre} ({self.schema_name})"


class Domain(DomainMixin):
    """Dominio/subdominio asociado a un tenant."""
    pass