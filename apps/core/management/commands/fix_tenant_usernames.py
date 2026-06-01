from django.core.management.base import BaseCommand
from apps.clientes_saas.models import Cliente
from django_tenants.utils import schema_context
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Muestra todos los tenants y sus usuarios, y corrige username=email donde no coincidan'

    def add_arguments(self, parser):
        parser.add_argument('--fix', action='store_true', help='Aplicar correcciones (sin --fix solo muestra)')
        parser.add_argument('--schema', type=str, default='', help='Filtrar por schema name')

    def handle(self, *args, **options):
        fix_mode = options['fix']
        schema_filter = options['schema'].lower()

        tenants = Cliente.objects.exclude(schema_name='public')
        if schema_filter:
            tenants = tenants.filter(schema_name__icontains=schema_filter)

        self.stdout.write(f'Tenants encontrados: {tenants.count()}')

        for tenant in tenants:
            self.stdout.write(f'\n[TENANT] schema={tenant.schema_name} | nombre={tenant.name}')
            with schema_context(tenant.schema_name):
                users = User.objects.all()
                self.stdout.write(f'  Usuarios: {users.count()}')
                for u in users:
                    match = u.username == u.email
                    status = 'OK' if match else 'MISMATCH'
                    self.stdout.write(f'  [{status}] id={u.id} | username="{u.username}" | email="{u.email}"')
                    if not match and fix_mode:
                        old_username = u.username
                        u.username = u.email
                        u.save(update_fields=['username'])
                        self.stdout.write(f'  -> CORREGIDO: "{old_username}" -> "{u.email}"')

        self.stdout.write('\nListo.')