"""
Servicio de integracion con Culqi Payment Gateway.
Documentacion: https://docs.culqi.com/

Modo sandbox: usar tarjetas de prueba de Culqi
- Visa exitosa: 4111111111111111
- Mastercard exitosa: 5111111111111118
- Tarjeta rechazada: 4000000000000002
"""
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class CulqiService:
    """
    Wrapper del SDK de Culqi para cobros simples (no recurrentes).

    Flujo:
    1. Frontend carga culqi.js y abre el checkout modal
    2. Usuario ingresa tarjeta -> Culqi devuelve un token al frontend
    3. Frontend envia el token al backend
    4. Backend llama CulqiService.crear_cobro(token, amount, email)
    5. Si OK -> crear tenant. Si falla -> error al usuario.
    """

    def __init__(self):
        self.secret_key = settings.CULQI_SECRET_KEY
        self.public_key = settings.CULQI_PUBLIC_KEY
        self.is_sandbox  = 'test' in self.secret_key or self.secret_key == 'sk_test_placeholder'

    def crear_cobro(self, source_id: str, amount_centimos: int, email: str, descripcion: str) -> dict:
        """
        Crea un cobro en Culqi.

        Args:
            source_id:       Token generado por culqi.js en el frontend
            amount_centimos: Monto en centimos (S/39 = 3900, $12 = 1200)
            email:           Email del comprador
            descripcion:     Descripcion del producto/plan

        Returns:
            dict con 'success', 'charge_id', 'message'
        """
        try:
            import culqi
            culqi.api_key = self.secret_key

            charge = culqi.Charge.create({
                'amount':        amount_centimos,
                'currency_code': 'PEN',
                'email':         email,
                'source_id':     source_id,
                'description':   descripcion,
                'capture':       True,
            })

            if charge.get('id'):
                logger.info(f"[CULQI] Cobro exitoso: {charge.get('id')} | {email}")
                return {'success': True, 'charge_id': charge.get('id'), 'message': 'Pago procesado'}
            else:
                msg = charge.get('user_message', 'Tarjeta rechazada')
                logger.warning(f"[CULQI] Cobro rechazado: {msg} | {email}")
                return {'success': False, 'charge_id': None, 'message': msg}

        except Exception as e:
            logger.error(f"[CULQI] Error al cobrar: {e} | {email}")
            return {'success': False, 'charge_id': None, 'message': str(e)}

    def sandbox_bypass(self, email: str, plan_nombre: str) -> dict:
        """
        En modo sandbox/placeholder, permitir registro sin pago real para testing.
        """
        logger.info(f"[CULQI SANDBOX BYPASS] Registro sin pago: {email} | {plan_nombre}")
        return {'success': True, 'charge_id': 'sandbox_bypass', 'message': 'Sandbox - sin cobro real'}