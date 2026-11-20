"""
Tests del Panel de Control y del aislamiento de tokens entre schemas.

Ejecutar:  python manage.py test apps.panel
(Requiere PostgreSQL: django-tenants crea un schema real por cada negocio de prueba.)
"""
from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django_tenants.utils import schema_context
from rest_framework.test import APIClient

from apps.clientes_saas.models import Cliente
from apps.core.jwt import refresh_para_usuario
from apps.panel import services
from apps.panel.auth import tokens_panel
from apps.panel.models import MovimientoSuscripcion, Pago
from apps.suscripciones import estado as estado_sus
from apps.suscripciones.models import Plan, Suscripcion

User = get_user_model()
HOY = estado_sus.hoy()


def sus_fake(activa=True, fecha_fin=None, estado_pago='PAGADO'):
    return SimpleNamespace(activa=activa, fecha_fin=fecha_fin, estado_pago=estado_pago)


class FechasTests(SimpleTestCase):
    def test_sumar_meses_ajusta_fin_de_mes(self):
        self.assertEqual(services.sumar_meses(date(2026, 1, 31), 1), date(2026, 2, 28))
        self.assertEqual(services.sumar_meses(date(2028, 1, 31), 1), date(2028, 2, 29))
        self.assertEqual(services.sumar_meses(date(2026, 11, 19), 2), date(2027, 1, 19))
        self.assertEqual(services.sumar_meses(date(2026, 3, 15), -3), date(2025, 12, 15))

    def test_periodo_por_defecto_un_mes_desde_hoy(self):
        ref = date(2026, 11, 19)
        self.assertEqual(services.calcular_periodo(None, ref=ref), (ref, date(2026, 12, 18)))

    def test_periodo_continua_si_quedan_dias(self):
        ref = date(2026, 11, 19)
        sus = sus_fake(fecha_fin=date(2026, 11, 25))
        self.assertEqual(services.calcular_periodo(sus, meses=1, ref=ref),
                         (date(2026, 11, 26), date(2026, 12, 25)))

    def test_periodo_vencido_arranca_hoy(self):
        ref = date(2026, 11, 19)
        sus = sus_fake(fecha_fin=date(2026, 10, 1))
        self.assertEqual(services.calcular_periodo(sus, dias=30, ref=ref),
                         (ref, ref + timedelta(days=29)))

    def test_fecha_fin_pasada_es_invalida(self):
        with self.assertRaises(services.OperacionInvalida):
            services.calcular_periodo(None, fecha_fin=date(2020, 1, 1), ref=date(2026, 11, 19))


class EstadoTests(SimpleTestCase):
    def test_estados(self):
        ref = date(2026, 11, 19)
        self.assertEqual(estado_sus.estado_de(None, ref), estado_sus.SIN_SUSCRIPCION)
        self.assertEqual(estado_sus.estado_de(sus_fake(activa=False), ref), estado_sus.SUSPENDIDA)
        self.assertEqual(estado_sus.estado_de(sus_fake(fecha_fin=date(2026, 11, 18)), ref), estado_sus.VENCIDA)
        self.assertEqual(estado_sus.estado_de(sus_fake(estado_pago='SANDBOX'), ref), estado_sus.SANDBOX)
        self.assertEqual(estado_sus.estado_de(sus_fake(fecha_fin=date(2026, 11, 22)), ref), estado_sus.POR_VENCER)
        self.assertEqual(estado_sus.estado_de(sus_fake(fecha_fin=date(2026, 12, 30)), ref), estado_sus.ACTIVA)
        self.assertFalse(estado_sus.tiene_acceso(sus_fake(fecha_fin=date(2026, 11, 18)), ref))
        self.assertTrue(estado_sus.tiene_acceso(sus_fake(fecha_fin=date(2026, 11, 19)), ref))


class PanelIntegracionTests(TestCase):
    """Usa dos negocios reales (schemas) para probar aislamiento y bloqueo."""

    @classmethod
    def setUpTestData(cls):
        cls.emprendedor = Plan.objects.get_or_create(nombre='EMPRENDEDOR', defaults={'precio_mensual': Decimal('39.90')})[0]
        cls.empresario = Plan.objects.get_or_create(nombre='EMPRESARIO', defaults={'precio_mensual': Decimal('79.90')})[0]

        cls.negocio_a = Cliente(schema_name='testnega', nombre='Negocio A', owner_email='a@test.pe')
        cls.negocio_a.save()
        cls.negocio_b = Cliente(schema_name='testnegb', nombre='Negocio B', owner_email='b@test.pe')
        cls.negocio_b.save()
        Suscripcion.objects.create(cliente=cls.negocio_a, plan=cls.emprendedor, estado_pago='SANDBOX')
        Suscripcion.objects.create(cliente=cls.negocio_b, plan=cls.emprendedor, estado_pago='SANDBOX')

        # Usuarios con el MISMO id en cada schema (caso real: el Gerente suele ser id=1)
        cls.gerente_a = cls._crear_gerente('testnega', 'gerente@a.pe')
        cls.gerente_b = cls._crear_gerente('testnegb', 'gerente@b.pe')

        # Usuarios del schema public: un admin del panel y un "gerente" sin privilegios
        cls.admin = User.objects.create_user('admin_negocia', 'admin@negocia.pe', 'Clave-admin-123', is_staff=True)
        cls.no_staff = User.objects.create_user('gerente@a.pe', 'gerente@a.pe', 'Clave-segura-123')

    @staticmethod
    def _crear_gerente(schema, email):
        from apps.core.models import Empresa, PerfilUsuario
        with schema_context(schema):
            user = User.objects.create_user(email, email, 'Clave-segura-123')
            empresa = Empresa.objects.create(nombre=f'Empresa {schema}', email=email)
            PerfilUsuario.objects.create(user=user, rol='GERENTE', empresa=empresa)
            return user

    def setUp(self):
        self.client = APIClient()

    def _panel(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens_panel(self.admin).access_token}')
        return self.client

    def _token_tenant(self, user, schema):
        with schema_context(schema):
            return str(refresh_para_usuario(user, schema=schema).access_token)

    # ── Login del panel ──────────────────────────────────────────────────────
    def test_login_staff_ok_y_no_staff_rechazado(self):
        r = self.client.post('/api/panel/auth/login/', {'username': 'admin_negocia', 'password': 'Clave-admin-123'})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertIn('access', r.data)
        r = self.client.post('/api/panel/auth/login/', {'username': 'gerente@a.pe', 'password': 'Clave-segura-123'})
        self.assertEqual(r.status_code, 400)

    def test_refresh_del_panel(self):
        refresh = str(tokens_panel(self.admin))
        r = self.client.post('/api/panel/auth/refresh/', {'refresh': refresh})
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {r.data["access"]}')
        self.assertEqual(self.client.get('/api/panel/auth/me/').status_code, 200)

    # ── Aislamiento de tokens ────────────────────────────────────────────────
    def test_token_de_negocio_no_sirve_en_el_panel(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self._token_tenant(self.gerente_a, "testnega")}')
        self.assertEqual(self.client.get('/api/panel/empresas/').status_code, 401)

    def test_token_publico_normal_no_sirve_en_el_panel(self):
        # Un token "de plataforma" (login de Gerentes) de un usuario staff tampoco entra
        token = str(refresh_para_usuario(self.admin, schema='public').access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(self.client.get('/api/panel/empresas/').status_code, 401)

    def test_token_del_panel_no_sirve_en_un_negocio(self):
        self._panel()
        self.assertEqual(self.client.get('/t/testnega/api/auth/me/').status_code, 401)

    def test_token_de_negocio_a_no_sirve_en_negocio_b(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self._token_tenant(self.gerente_a, "testnega")}')
        self.assertEqual(self.client.get('/t/testnega/api/auth/me/').status_code, 200)
        self.assertEqual(self.client.get('/t/testnegb/api/auth/me/').status_code, 401)

    def test_admin_que_pierde_staff_pierde_acceso(self):
        self._panel()
        User.objects.filter(pk=self.admin.pk).update(is_staff=False)
        self.assertEqual(self.client.get('/api/panel/empresas/').status_code, 403)

    # ── Empresas y suscripciones ─────────────────────────────────────────────
    def test_listado_y_filtro_por_estado(self):
        self._panel()
        r = self.client.get('/api/panel/empresas/', {'estado': 'sandbox'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual({e['schema_name'] for e in r.data['results']}, {'testnega', 'testnegb'})
        self.assertEqual(self.client.get('/api/panel/empresas/', {'search': 'Negocio B'}).data['count'], 1)

    def test_activar_registra_pago_extiende_y_audita(self):
        self._panel()
        r = self.client.post(f'/api/panel/empresas/{self.negocio_a.pk}/activar/', {
            'monto': '39.90', 'moneda': 'PEN', 'metodo_pago': 'YAPE', 'referencia': 'OP-1', 'meses': 1,
        }, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        sus = Suscripcion.objects.get(cliente=self.negocio_a)
        self.assertEqual(sus.estado_pago, 'PAGADO')
        self.assertEqual(sus.fecha_fin, services.sumar_meses(HOY, 1) - timedelta(days=1))
        self.assertEqual(r.data['estado'], estado_sus.ACTIVA)
        pago = Pago.objects.get(empresa=self.negocio_a)
        self.assertEqual(pago.periodo_fin, sus.fecha_fin)
        self.assertEqual(MovimientoSuscripcion.objects.get(empresa=self.negocio_a).accion, 'ACTIVACION')

        # Segundo pago: se suma al periodo vigente y se avisa la referencia repetida
        r = self.client.post(f'/api/panel/empresas/{self.negocio_a.pk}/activar/', {
            'monto': '39.90', 'referencia': 'OP-1', 'meses': 1,
        }, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['avisos'])
        fin_esperado = services.sumar_meses(sus.fecha_fin + timedelta(days=1), 1) - timedelta(days=1)
        self.assertEqual(Suscripcion.objects.get(cliente=self.negocio_a).fecha_fin, fin_esperado)
        self.assertEqual(MovimientoSuscripcion.objects.filter(empresa=self.negocio_a, accion='EXTENSION').count(), 1)

    def test_suspender_bloquea_al_instante_y_reactivar_devuelve_acceso(self):
        token_a = self._token_tenant(self.gerente_a, 'testnega')
        tenant_client = APIClient()
        tenant_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_a}')
        self.assertEqual(tenant_client.get('/t/testnega/api/auth/me/').status_code, 200)

        self._panel()
        self.assertEqual(self.client.post(f'/api/panel/empresas/{self.negocio_a.pk}/suspender/',
                                          {'notas': 'falta de pago'}).status_code, 200)
        r = tenant_client.get('/t/testnega/api/auth/me/')
        self.assertEqual(r.status_code, 402)
        self.assertEqual(r.json()['code'], 'SUSCRIPCION_INACTIVA')
        # El otro negocio no se ve afectado
        token_b = self._token_tenant(self.gerente_b, 'testnegb')
        self.assertEqual(APIClient().get('/t/testnegb/api/auth/me/',
                                         HTTP_AUTHORIZATION=f'Bearer {token_b}').status_code, 200)

        self.assertEqual(self.client.post(f'/api/panel/empresas/{self.negocio_a.pk}/reactivar/').status_code, 200)
        self.assertEqual(tenant_client.get('/t/testnega/api/auth/me/').status_code, 200)

    def test_vencida_bloquea(self):
        Suscripcion.objects.filter(cliente=self.negocio_b).update(fecha_fin=HOY - timedelta(days=1))
        token_b = self._token_tenant(self.gerente_b, 'testnegb')
        r = APIClient().get('/t/testnegb/api/auth/me/', HTTP_AUTHORIZATION=f'Bearer {token_b}')
        self.assertEqual(r.status_code, 402)

    def test_cambiar_plan_y_extender_sin_pago(self):
        self._panel()
        r = self.client.post(f'/api/panel/empresas/{self.negocio_b.pk}/cambiar-plan/',
                             {'plan_id': self.empresario.pk})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data['suscripcion']['plan']['nombre'], 'EMPRESARIO')
        r = self.client.post(f'/api/panel/empresas/{self.negocio_b.pk}/extender/', {'dias': 15})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Suscripcion.objects.get(cliente=self.negocio_b).fecha_fin, HOY + timedelta(days=14))
        self.assertFalse(Pago.objects.filter(empresa=self.negocio_b).exists())

    def test_duracion_ambigua_rechazada(self):
        self._panel()
        r = self.client.post(f'/api/panel/empresas/{self.negocio_a.pk}/activar/',
                             {'monto': '10', 'meses': 1, 'dias': 5}, format='json')
        self.assertEqual(r.status_code, 400)

    # ── Pagos, gastos, métricas ──────────────────────────────────────────────
    def test_metricas_y_reversion(self):
        self._panel()
        self.client.post(f'/api/panel/empresas/{self.negocio_a.pk}/activar/',
                         {'monto': '39.90', 'meses': 1}, format='json')
        self.client.post('/api/panel/gastos/', {'concepto': 'Railway', 'categoria': 'INFRAESTRUCTURA',
                                                'monto': '20.00', 'moneda': 'PEN', 'fecha': HOY.isoformat()})
        self.client.post('/api/panel/gastos/', {'concepto': 'Dominio', 'monto': '12.00', 'moneda': 'USD',
                                                'fecha': HOY.isoformat()})
        m = self.client.get('/api/panel/metricas/').data
        self.assertEqual(m['ingresos']['PEN'], Decimal('39.90'))
        self.assertEqual(m['gastos']['PEN'], Decimal('20.00'))
        self.assertEqual(m['balance']['PEN'], Decimal('19.90'))
        self.assertEqual(m['balance']['USD'], Decimal('-12.00'))
        self.assertEqual(m['mrr']['PEN'], Decimal('39.90'))
        self.assertEqual(m['suscripciones_pagantes'], 1)
        self.assertEqual(m['empresas']['total'], 2)
        self.assertEqual(len(m['serie_mensual']), 12)

        pago = Pago.objects.get(empresa=self.negocio_a)
        r = self.client.post(f'/api/panel/pagos/{pago.pk}/revertir/', {'motivo': 'transferencia rebotada'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.get('/api/panel/metricas/').data['ingresos']['PEN'], Decimal('0'))
        self.assertTrue(MovimientoSuscripcion.objects.filter(accion='REVERSION_PAGO').exists())

    def test_pagos_no_se_eliminan(self):
        self._panel()
        self.client.post(f'/api/panel/empresas/{self.negocio_a.pk}/activar/', {'monto': '5'}, format='json')
        pago = Pago.objects.get(empresa=self.negocio_a)
        self.assertEqual(self.client.delete(f'/api/panel/pagos/{pago.pk}/').status_code, 405)
        r = self.client.patch(f'/api/panel/pagos/{pago.pk}/', {'monto': '999', 'referencia': 'X'}, format='json')
        self.assertEqual(r.status_code, 200)
        pago.refresh_from_db()
        self.assertEqual(pago.monto, Decimal('5.00'))
        self.assertEqual(pago.referencia, 'X')


class CuentaStaffProtegidaTests(TestCase):
    def test_registro_no_cambia_password_de_un_admin(self):
        from apps.clientes_saas.views import _crear_usuario_plataforma
        admin = User.objects.create_user('jefe@negocia.pe', 'jefe@negocia.pe', 'Original-123', is_staff=True)
        _crear_usuario_plataforma('jefe@negocia.pe', 'Atacante-456')
        admin.refresh_from_db()
        self.assertTrue(admin.check_password('Original-123'))
