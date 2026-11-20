"""
Respaldos automáticos de TODOS los negocios.

Recorre cada tenant (schema) y, para cada Empresa, genera el respaldo si le toca
según su configuración (frecuencia y hora local America/Lima). Los negocios que
nunca configuraron nada reciben la configuración por defecto: diario a las 03:00.

En producción lo ejecuta cada hora el servicio cron de Railway (railway.backups.toml):
    python manage.py run_backups

Opciones:
    --schema X   solo ese negocio
    --forzar     generar aunque no toque por horario/frecuencia
    --dry-run    solo informar qué se respaldaría
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django_tenants.utils import get_public_schema_name, schema_context, tenant_context

from apps.clientes_saas.models import Cliente

# Identificador del candado de PostgreSQL que evita dos ejecuciones simultáneas.
LOCK_ID = 7_301_2026


class Command(BaseCommand):
    help = 'Genera los respaldos automáticos pendientes de todos los negocios.'

    def add_arguments(self, parser):
        parser.add_argument('--schema', default='', help='Procesar solo este negocio.')
        parser.add_argument('--forzar', action='store_true',
                            help='Generar aunque no toque por horario/frecuencia.')
        parser.add_argument('--dry-run', action='store_true', help='No genera nada, solo informa.')

    def handle(self, *args, **opts):
        with schema_context(get_public_schema_name()):
            with connection.cursor() as cursor:
                cursor.execute('SELECT pg_try_advisory_lock(%s)', [LOCK_ID])
                if not cursor.fetchone()[0]:
                    self.stdout.write(self.style.WARNING('Ya hay otra ejecución de run_backups en curso. Se omite.'))
                    return
        try:
            generados, errores, omitidos = self._procesar(opts)
        finally:
            with schema_context(get_public_schema_name()):
                with connection.cursor() as cursor:
                    cursor.execute('SELECT pg_advisory_unlock(%s)', [LOCK_ID])

        resumen = f'run_backups: {generados} generados, {omitidos} sin respaldo pendiente, {errores} con error.'
        if errores:
            # Código de salida distinto de 0: Railway marca la ejecución como fallida.
            raise CommandError(resumen)
        self.stdout.write(self.style.SUCCESS(resumen))

    def _procesar(self, opts):
        from apps.core import backup_service
        from apps.core.models import Empresa

        tenants = Cliente.objects.exclude(schema_name=get_public_schema_name()).order_by('schema_name')
        if opts['schema']:
            tenants = tenants.filter(schema_name=opts['schema'])
            if not tenants.exists():
                raise CommandError(f'No existe el negocio "{opts["schema"]}".')

        generados = errores = omitidos = 0
        for tenant in tenants:
            try:
                with tenant_context(tenant):
                    for empresa in Empresa.objects.all():
                        config = backup_service.config_de(empresa)
                        if not (opts['forzar'] or backup_service.toca_respaldo(config)):
                            omitidos += 1
                            continue
                        if opts['dry_run']:
                            self.stdout.write(f'[{tenant.schema_name}] tocaría respaldo')
                            continue
                        registro = backup_service.generar_backup(empresa, origen='AUTOMATICO')
                        generados += 1
                        self.stdout.write(self.style.SUCCESS(
                            f'[{tenant.schema_name}] OK · {registro.tamano_bytes / 1024:.1f} KB · {registro.notas}'))
            except Exception as exc:  # un negocio con problemas no detiene a los demás
                errores += 1
                self.stderr.write(self.style.ERROR(f'[{tenant.schema_name}] ERROR: {exc}'))
        return generados, errores, omitidos
