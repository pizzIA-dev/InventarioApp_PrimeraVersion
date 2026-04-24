"""
core/signals.py

Garantiza que toda empresa (tenant) siempre tenga:
  • Un "Cliente General"   (numero_documento='00000000')
  • Un "Proveedor General" (identificador='00000000')

Se dispara automáticamente al crear una Empresa via `post_save`.
También puede llamarse manualmente a través de `ensure_defaults_for_empresa(empresa)`.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver


# ─── Función pública/reutilizable ────────────────────────────────────────────

def ensure_defaults_for_empresa(empresa):
    """
    Crea (si no existen) el Cliente General y el Proveedor General
    para la empresa indicada.

    Es idempotente: llamarla varias veces no genera duplicados.
    Se puede invocar desde cualquier lugar (views, management commands, etc.)
    """
    _ensure_cliente_general(empresa)
    _ensure_proveedor_general(empresa)


def _ensure_cliente_general(empresa):
    """
    Crea o reactiva el Cliente General.
    Usa get_or_create con el DNI centinela 00000000;
    si existía pero estaba inactivo, lo reactiva.
    """
    from apps.clientes.models import Cliente

    obj, created = Cliente.objects.get_or_create(
        empresa=empresa,
        numero_documento='00000000',
        defaults={
            'nombre': 'Cliente General',
            'tipo_cliente': 'PERSONA_NATURAL',
            'tipo_documento': 'DNI',
            'activo': True,
        }
    )
    # Si ya existía pero estaba inactivo, reactivarlo
    if not created and not obj.activo:
        obj.activo = True
        obj.save(update_fields=['activo'])


def _ensure_proveedor_general(empresa):
    """
    Crea o reactiva el Proveedor General.
    Usa get_or_create con el identificador centinela 00000000;
    si existía pero estaba inactivo, lo reactiva.
    """
    from apps.proveedores.models import Proveedor

    obj, created = Proveedor.objects.get_or_create(
        empresa=empresa,
        identificador='00000000',
        defaults={
            'nombre': 'Proveedor General',
            'tipo_proveedor': 'PERSONA_NATURAL',
            'tipo_documento': 'DNI',
            'categoria': 'MINORISTA',
            'activo': True,
        }
    )
    # Si ya existía pero estaba inactivo, reactivarlo
    if not created and not obj.activo:
        obj.activo = True
        obj.save(update_fields=['activo'])


# ─── Signal: dispara ensure al crear una Empresa nueva ───────────────────────

@receiver(post_save, sender='core.Empresa')
def on_empresa_created(sender, instance, created, **kwargs):
    """
    Cada vez que se crea una Empresa, garantiza que existan el
    Cliente General y el Proveedor General asociados.
    No hace nada si la empresa ya existía (created=False).
    """
    if created:
        ensure_defaults_for_empresa(instance)
