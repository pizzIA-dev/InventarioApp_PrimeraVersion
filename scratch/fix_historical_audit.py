import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from apps.ventas.models import Venta, MovimientoEstadoVenta
from apps.servicios.models import VentaServicio, MovimientoEstadoVentaServicio
from apps.inventario.models import MovimientoStock
from apps.fiados.models import MovimientoFiado
from apps.clientes.models import MovimientoEstadoCliente

User = get_user_model()
gerente = User.objects.filter(username__icontains='gerente').first()

if not gerente:
    print("No se encontró usuario gerente")
    exit(1)

print(f"Asignando registros huerfanos al usuario: {gerente.username} (ID: {gerente.id})")

# 1. Ventas
v = Venta.objects.filter(usuario__isnull=True).update(usuario=gerente)
print(f"Ventas actualizadas: {v}")

m_v = MovimientoEstadoVenta.objects.filter(usuario__isnull=True).update(usuario=gerente)
print(f"Movimientos Estado Venta actualizados: {m_v}")

# 2. Servicios
vs = VentaServicio.objects.filter(usuario__isnull=True).update(usuario=gerente)
print(f"VentaServicio actualizados: {vs}")

m_vs = MovimientoEstadoVentaServicio.objects.filter(usuario__isnull=True).update(usuario=gerente)
print(f"Movimientos Estado VentaServicio actualizados: {m_vs}")

# 3. Inventario
m_s = MovimientoStock.objects.filter(usuario__isnull=True).update(usuario=gerente)
print(f"Movimientos Stock actualizados: {m_s}")

# 4. Fiados
m_f = MovimientoFiado.objects.filter(usuario__isnull=True).update(usuario=gerente)
print(f"Movimientos Fiados actualizados: {m_f}")

# 5. Clientes
m_c = MovimientoEstadoCliente.objects.filter(usuario__isnull=True).update(usuario=gerente)
print(f"Movimientos Estado Cliente actualizados: {m_c}")

print("Terminado.")
