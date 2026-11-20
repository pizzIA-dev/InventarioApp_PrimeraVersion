"""
Respaldos automáticos de TODOS los negocios.

Recorre cada tenant (schema), revisa su ConfiguracionBackup y genera el respaldo
si corresponde según frecuencia y hora (hora local, America/Lima).

Programarlo cada hora, p. ej. un Cron Service de Railway con:
    python manage.py run_backups
"""
from django.core.management.base import BaseCommand
from django_tenants.utils import get_public_schema_name, tenant_context

from apps.clientes_saas.models import Cliente


class Command(BaseCommand):
    help = 'Genera los respaldos automáticos pendientes de todos los negocios.'

    def add_arguments(self, parser):
        parser.add_argument('--schema', default='', help='Procesar solo este negocio.')
        parser.add_argument('--forzar', action='store_true',
                            help='Generar aunque no toque por horario/frecuencia.')

    def handle(self, *args, **opts):
        from apps.core import backup_service
        from apps.core.models import ConfiguracionBackup

        tenants = Cliente.objects.exclude(schema_name=get_public_schema_name())
        if opts['schema']:
            tenants = tenants.filter(schema_name=opts['schema'])

        generados = errores = 0
        for tenant in tenants:
            with tenant_context(tenant):
                for config in ConfiguracionBackup.objects.select_related('empresa'):
                    if not (opts['forzar'] or backup_service.toca_respaldo(config)):
                        continue
                    try:
                        backup_service.generar_backup(config.empresa, origen='AUTOMATICO')
                        generados += 1
                        self.stdout.write(self.style.SUCCESS(f'[{tenant.schema_name}] respaldo generado'))
                    except backup_service.BackupError as exc:
                        errores += 1
                        self.stdout.write(self.style.ERROR(f'[{tenant.schema_name}] {exc}'))

        self.stdout.write(f'Listo: {generados} generados, {errores} con error.')
