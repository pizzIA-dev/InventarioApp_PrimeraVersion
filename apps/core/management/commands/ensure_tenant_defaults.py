"""
Management command: ensure_tenant_defaults

Recorre TODOS los tenants activos y garantiza que cada uno tenga
su Cliente General y su Proveedor General.

Útil para:
  • Tenants creados antes de que existiera el signal post_save.
  • Recuperación ante borrado accidental del cliente/proveedor general.
  • Scripts de migración o deployment.

Uso:
    python manage.py ensure_tenant_defaults
    python manage.py ensure_tenant_defaults --tenant emprendedor
"""
from django.core.management.base import BaseCommand
from django_tenants.utils import tenant_context
from apps.clientes_saas.models import Cliente as TenantModel
from apps.core.signals import ensure_defaults_for_empresa


class Command(BaseCommand):
    help = 'Garantiza que todos los tenants tengan Cliente General y Proveedor General.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant',
            type=str,
            default=None,
            help='Schema name del tenant específico (omitir para procesar todos).',
        )

    def handle(self, *args, **options):
        target = options.get('tenant')

        tenants = TenantModel.objects.exclude(schema_name='public')
        if target:
            tenants = tenants.filter(schema_name=target)
            if not tenants.exists():
                self.stdout.write(self.style.ERROR(f'Tenant "{target}" no encontrado.'))
                return

        total = tenants.count()
        self.stdout.write(f'Procesando {total} tenant(s)...\n')

        ok = 0
        errors = 0
        for tenant in tenants:
            try:
                with tenant_context(tenant):
                    from apps.core.models import Empresa
                    empresa = Empresa.objects.first()
                    if empresa is None:
                        self.stdout.write(
                            self.style.WARNING(f'  [{tenant.schema_name}] Sin Empresa interna, saltando.')
                        )
                        continue
                    ensure_defaults_for_empresa(empresa)
                    self.stdout.write(
                        self.style.SUCCESS(f'  [{tenant.schema_name}] [OK] Defaults garantizados.')
                    )
                    ok += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  [{tenant.schema_name}] [ERROR] {e}')
                )
                errors += 1

        self.stdout.write(f'\nResumen: {ok} OK, {errors} errores.')
