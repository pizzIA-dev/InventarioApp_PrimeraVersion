"""
Management command: seed_compras_servicios
Crea datos de ejemplo para Compra de Servicios en todos los tenants (o uno específico).
Uso:
    python manage.py seed_compras_servicios
    python manage.py seed_compras_servicios --tenant pizziaperu
"""
import random
import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from django_tenants.utils import tenant_context
from apps.clientes_saas.models import Cliente as TenantModel


class Command(BaseCommand):
    help = 'Crea datos de ejemplo para Compra de Servicios.'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=str, default=None)
        parser.add_argument('--count', type=int, default=8)

    def handle(self, *args, **options):
        target = options.get('tenant')
        count  = options.get('count', 8)

        tenants = TenantModel.objects.exclude(schema_name='public')
        if target:
            tenants = tenants.filter(schema_name=target)
            if not tenants.exists():
                self.stdout.write(self.style.ERROR(f'Tenant "{target}" no encontrado.'))
                return

        for tenant in tenants:
            self.stdout.write(f'  [{tenant.schema_name}] Procesando...')
            try:
                with tenant_context(tenant):
                    self._seed(tenant.schema_name, count)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  [{tenant.schema_name}] Error: {e}'))

    def _seed(self, schema_name, count):
        from apps.core.models import Empresa
        from apps.servicios.models import Servicio, CompraServicio
        from apps.proveedores.models import Proveedor

        empresa = Empresa.objects.first()
        if not empresa:
            self.stdout.write(self.style.WARNING(f'  Sin empresa interna, saltando.'))
            return

        servicios = list(Servicio.objects.filter(activo=True))
        proveedores = list(Proveedor.objects.exclude(identificador='00000000'))

        if not servicios:
            self.stdout.write(self.style.WARNING(f'  Sin servicios activos, saltando.'))
            return

        # Check if already has data:
        existing = CompraServicio.objects.count()
        if existing >= count:
            self.stdout.write(self.style.WARNING(f'  Ya tiene {existing} compras de servicio, saltando.'))
            return

        today = datetime.date.today()
        estados = ['TERMINADO', 'EN_PROGRESO', 'PENDIENTE', 'CANCELADO', 'TERMINADO', 'PENDIENTE', 'EN_PROGRESO', 'TERMINADO']
        precios = [120.00, 250.00, 380.00, 180.00, 95.00, 450.00, 320.00, 200.00]
        notas_list = [
            'Mantenimiento mensual del sistema',
            'Servicio de contabilidad externa',
            'Auditoria de inventario trimestral',
            'Servicio de limpieza industrial',
            'Disenio de carta digital',
            'Consultoria de marketing digital',
            'Capacitacion del personal de ventas',
            'Instalacion de software POS',
        ]

        created = 0
        for i in range(min(count, len(estados))):
            serv = random.choice(servicios)
            prov = random.choice(proveedores) if proveedores else None
            dias = random.randint(5, 90)
            fecha = today - datetime.timedelta(days=dias)
            try:
                CompraServicio.objects.create(
                    empresa=empresa,
                    servicio=serv,
                    servicio_nombre=serv.nombre,
                    proveedor=prov,
                    proveedor_nombre=prov.nombre if prov else None,
                    precio=Decimal(str(precios[i % len(precios)])),
                    estado=estados[i % len(estados)],
                    fecha_programada=fecha,
                    notas=notas_list[i % len(notas_list)],
                )
                created += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'    Error creando item {i}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'  [{schema_name}] Creados {created} compras de servicio.'))
