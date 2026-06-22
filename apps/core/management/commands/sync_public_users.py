"""
Management command: sync_public_users
Crea (o actualiza) en el schema PUBLIC un usuario "de plataforma" por cada
usuario administrador que exista en los schemas de tenant.

Úsalo una sola vez para migrar usuarios existentes. Después del registro,
cada negocio nuevo crea el usuario público automáticamente.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User as PublicUser
from django_tenants.utils import schema_context


class Command(BaseCommand):
    help = 'Crea usuarios de plataforma (schema público) para tenants existentes'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Solo mostrar qué haría, sin guardar')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        from apps.clientes_saas.models import Cliente

        tenants = Cliente.objects.exclude(schema_name='public')
        self.stdout.write(f'Tenants a procesar: {tenants.count()}')

        created = updated = skipped = errors = 0

        for tenant in tenants:
            self.stdout.write(f'\n[{tenant.schema_name}] {tenant.name}')
            try:
                with schema_context(tenant.schema_name):
                    from django.contrib.auth.models import User as TenantUser
                    try:
                        tenant_users = TenantUser.objects.all()
                    except Exception as e:
                        self.stdout.write(f'  SKIP (sin tabla auth_user): {e}')
                        skipped += 1
                        continue

                    for tu in tenant_users:
                        email = tu.email or tu.username
                        if not email:
                            continue
                        self.stdout.write(f'  -> Sincronizando: {email}')
                        if not dry_run:
                            try:
                                pub_user, was_created = PublicUser.objects.get_or_create(
                                    username=email,
                                    defaults={'email': email}
                                )
                                # Sincronizar email en caso de discrepancia
                                if pub_user.email != email:
                                    pub_user.email = email
                                    pub_user.save(update_fields=['email'])
                                # NOTA: No sincronizamos contraseña aquí porque
                                # no tenemos acceso al texto plano. El usuario
                                # tendrá que re-registrarse o cambiar contraseña
                                # para que quede sincronizada en el schema público.
                                if was_created:
                                    created += 1
                                    self.stdout.write(f'     CREADO en schema público')
                                else:
                                    updated += 1
                                    self.stdout.write(f'     YA EXISTE en schema público')
                            except Exception as e:
                                errors += 1
                                self.stdout.write(f'     ERROR: {e}')
            except Exception as e:
                self.stdout.write(f'  SKIP (schema error): {e}')
                skipped += 1
                continue

        self.stdout.write(f'\n=== Resumen ===')
        self.stdout.write(f'Creados:    {created}')
        self.stdout.write(f'Ya existían: {updated}')
        self.stdout.write(f'Skipped:    {skipped}')
        self.stdout.write(f'Errores:    {errors}')
        if dry_run:
            self.stdout.write('(dry-run: sin cambios guardados)')
        self.stdout.write('Listo.')