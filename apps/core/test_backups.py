"""
Respaldos: generar, descargar y restaurar (ida y vuelta completa).

Ejecutar:  python manage.py test apps.core.test_backups
"""
import io
import json
import zipfile
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.test import TestCase
from django_tenants.utils import schema_context
from rest_framework.test import APIClient

from apps.clientes_saas.models import Cliente as Tenant
from apps.core.jwt import refresh_para_usuario

User = get_user_model()
SCHEMA = 'testbackup'


class BackupsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        Tenant(schema_name=SCHEMA, nombre='Negocio Backup', owner_email='bk@test.pe').save()
        from apps.core.models import Empresa, PerfilUsuario
        with schema_context(SCHEMA):
            cls.empresa = Empresa.objects.create(nombre='Negocio Backup')
            cls.gerente = User.objects.create_user('g@bk.pe', 'g@bk.pe', 'Clave-123456')
            PerfilUsuario.objects.create(user=cls.gerente, rol='GERENTE', empresa=cls.empresa)
            cls.colab = User.objects.create_user('c@bk.pe', 'c@bk.pe', 'Clave-123456')
            PerfilUsuario.objects.create(user=cls.colab, rol='COLABORADOR', empresa=cls.empresa)

    def _cliente(self, user):
        with schema_context(SCHEMA):
            token = str(refresh_para_usuario(user, schema=SCHEMA).access_token)
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return c

    def _crear_datos(self):
        from apps.inventario.models import MovimientoStock, Producto
        from apps.ventas.models import DetalleVenta, Venta
        with schema_context(SCHEMA):
            p = Producto.objects.create(empresa=self.empresa, codigo='P1', nombre='Arroz',
                                        precio_compra=Decimal('3'), precio_venta=Decimal('5'),
                                        stock_inicial=Decimal('10'))
            v = Venta.objects.create(empresa=self.empresa, estado='CONFIRMADA', usuario=self.gerente)
            DetalleVenta.objects.create(empresa=self.empresa, venta=v, producto=p,
                                        cantidad=Decimal('2'), precio_venta=Decimal('5'))
            MovimientoStock.objects.create(empresa=self.empresa, producto=p, tipo='SALIDA', origen='VENTA',
                                           cantidad=Decimal('2'), usuario=self.gerente)
            p.refresh_from_db()
            return p, v

    def test_ciclo_completo_generar_descargar_restaurar(self):
        from apps.core.models import RegistroBackup
        from apps.inventario.models import MovimientoStock, Producto
        from apps.ventas.models import DetalleVenta, Venta

        producto, venta = self._crear_datos()
        self.assertEqual(producto.stock_actual, Decimal('8'))
        api = self._cliente(self.gerente)

        r = api.post(f'/t/{SCHEMA}/api/core/backups/generar/')
        self.assertEqual(r.status_code, 201, r.content)
        backup_id = r.data['id']

        r = api.get(f'/t/{SCHEMA}/api/core/backups/{backup_id}/descargar/')
        self.assertEqual(r.status_code, 200)
        with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
            contenido = json.loads(zf.read('datos.json'))
        self.assertEqual(contenido['schema'], SCHEMA)
        self.assertEqual(contenido['modelos']['ventas.DetalleVenta'], 1)
        self.assertNotIn('url', api.get(f'/t/{SCHEMA}/api/core/backups/').data[0])

        # Cambios posteriores al respaldo
        with schema_context(SCHEMA):
            Venta.objects.all().delete()
            Producto.objects.create(empresa=self.empresa, codigo='P2', nombre='Nuevo',
                                    precio_compra=1, precio_venta=2, stock_inicial=1)
            Producto.objects.filter(pk=producto.pk).update(stock_actual=99)

        r = api.post(f'/t/{SCHEMA}/api/core/backups/restore/', {'backup_id': backup_id}, format='json')
        self.assertEqual(r.status_code, 200, r.content)

        with schema_context(SCHEMA):
            self.assertEqual(list(Producto.objects.values_list('codigo', flat=True)), ['P1'])
            self.assertEqual(Producto.objects.get(codigo='P1').stock_actual, Decimal('8'))
            self.assertEqual(Venta.objects.count(), 1)
            self.assertEqual(DetalleVenta.objects.count(), 1)
            self.assertEqual(MovimientoStock.objects.count(), 1)
            # La secuencia quedó bien: se pueden crear registros nuevos sin chocar ids
            Producto.objects.create(empresa=self.empresa, codigo='P3', nombre='Post', precio_compra=1,
                                    precio_venta=2, stock_inicial=0)
            # Respaldo de seguridad previo + usuarios intactos
            self.assertTrue(RegistroBackup.objects.filter(pk=r.data['respaldo_seguridad_id']).exists())
            self.assertTrue(User.objects.filter(pk=self.gerente.pk).exists())

    def test_solo_gerente(self):
        api = self._cliente(self.colab)
        self.assertEqual(api.post(f'/t/{SCHEMA}/api/core/backups/generar/').status_code, 403)
        self.assertEqual(api.get(f'/t/{SCHEMA}/api/core/backups/').status_code, 403)

    def test_backup_formato_antiguo_no_se_restaura(self):
        from apps.core.models import RegistroBackup
        from apps.inventario.models import Producto
        self._crear_datos()
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w') as zf:
            zf.writestr('backup_1.json', '[]')
        with schema_context(SCHEMA):
            reg = RegistroBackup.objects.create(empresa=self.empresa, estado='EXITO', notas='viejo')
            reg.archivo.save('viejo.zip', ContentFile(buf.getvalue()), save=True)
        r = self._cliente(self.gerente).post(f'/t/{SCHEMA}/api/core/backups/restore/',
                                             {'backup_id': reg.id}, format='json')
        self.assertEqual(r.status_code, 400)
        with schema_context(SCHEMA):
            self.assertEqual(Producto.objects.count(), 1)  # nada se borró

    def test_toca_respaldo(self):
        from datetime import datetime, time, timedelta
        from types import SimpleNamespace
        from django.utils import timezone
        from apps.core.backup_service import toca_respaldo
        ahora = timezone.make_aware(datetime(2026, 11, 19, 4, 0))
        cfg = SimpleNamespace(activo=True, hora_ejecucion=time(3, 0), frecuencia='DIARIO', ultimo_respaldo=None)
        self.assertTrue(toca_respaldo(cfg, ahora))
        cfg.ultimo_respaldo = ahora - timedelta(hours=2)
        self.assertFalse(toca_respaldo(cfg, ahora))
        cfg.ultimo_respaldo = ahora - timedelta(days=1)
        self.assertTrue(toca_respaldo(cfg, ahora))
        cfg.hora_ejecucion = time(5, 0)
        self.assertFalse(toca_respaldo(cfg, ahora))


class RunBackupsCommandTests(TestCase):
    """El comando del cron: configuración por defecto, sin duplicados y aislamiento por negocio."""

    @classmethod
    def setUpTestData(cls):
        Tenant(schema_name='testcron', nombre='Negocio Cron', owner_email='cron@test.pe').save()
        from apps.core.models import Empresa
        with schema_context('testcron'):
            cls.empresa = Empresa.objects.create(nombre='Negocio Cron')

    def _correr(self, *args):
        from io import StringIO
        from django.core.management import call_command
        out = StringIO()
        call_command('run_backups', '--schema', 'testcron', *args, stdout=out, stderr=out)
        return out.getvalue()

    def test_crea_configuracion_por_defecto_y_no_duplica(self):
        from datetime import time
        from apps.core.models import ConfiguracionBackup, RegistroBackup
        # Hora 00:00 → siempre "ya pasó la hora" en el test
        with schema_context('testcron'):
            self.assertFalse(ConfiguracionBackup.objects.exists())
        self._correr('--dry-run')
        with schema_context('testcron'):
            cfg = ConfiguracionBackup.objects.get()
            self.assertTrue(cfg.activo)
            self.assertEqual(cfg.frecuencia, 'DIARIO')
            ConfiguracionBackup.objects.update(hora_ejecucion=time(0, 0))
            self.assertFalse(RegistroBackup.objects.exists())  # dry-run no genera

        salida = self._correr()
        self.assertIn('1 generados', salida)
        with schema_context('testcron'):
            r = RegistroBackup.objects.get()
            self.assertEqual(r.origen, 'AUTOMATICO')
            self.assertGreater(r.tamano_bytes, 0)
            self.assertIsNotNone(ConfiguracionBackup.objects.get().ultimo_respaldo)

        self.assertIn('0 generados', self._correr())  # mismo día: no duplica
        with schema_context('testcron'):
            self.assertEqual(RegistroBackup.objects.count(), 1)

    def test_retencion_conserva_siete(self):
        from apps.core.models import RegistroBackup
        for _ in range(9):
            self._correr('--forzar')
        with schema_context('testcron'):
            self.assertEqual(RegistroBackup.objects.count(), 7)

    def test_schema_inexistente_falla(self):
        from django.core.management import CommandError, call_command
        with self.assertRaises(CommandError):
            call_command('run_backups', '--schema', 'noexiste')
