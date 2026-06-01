from django.core.management.base import BaseCommand
from django.core.exceptions import ObjectDoesNotExist


class Command(BaseCommand):
    help = 'Sincroniza username=email para todos los usuarios en todos los tenant schemas'

    def add_arguments(self, parser):
        parser.add_argument('--fix', action='store_true', help='Aplicar correcciones (sin --fix solo muestra)')
        parser.add_argument('--schema', type=str, default='', help='Filtrar por schema name')

    def handle(self, *args, **options):
        fix_mode = options['fix']
        schema_filter = options['schema'].lower()

        try:
            from apps.clientes_saas.models import Cliente
            from django_tenants.utils import schema_context
        except ImportError as e:
            self.stderr.write(f'Import error: {e}')
            return

        tenants = Cliente.objects.exclude(schema_name='public')
        if schema_filter:
            tenants = tenants.filter(schema_name__icontains=schema_filter)

        self.stdout.write(f'Tenants a procesar: {tenants.count()}')

        fixed = 0
        for tenant in tenants:
            self.stdout.write(f'[{tenant.schema_name}] {tenant.name}')
            try:
                with schema_context(tenant.schema_name):
                    from django.contrib.auth.models import User
                    try:
                        users = User.objects.all()
                        for u in users:
                            if u.username != u.email and u.email:
                                self.stdout.write(f'  MISMATCH: "{u.username}" != "{u.email}"')
                                if fix_mode:
                                    u.username = u.email
                                    u.save(update_fields=['username'])
                                    self.stdout.write(f'  -> CORREGIDO a "{u.email}"')
                                    fixed += 1
                            else:
                                self.stdout.write(f'  OK: username="{u.username}"')
                    except Exception as e:
                        self.stdout.write(f'  SKIP (tabla no disponible): {e}')
                        continue
            except Exception as e:
                self.stdout.write(f'  SKIP (schema error): {e}')
                continue

        if fix_mode:
            self.stdout.write(f'Total corregidos: {fixed}')
        self.stdout.write('Comando completado.')