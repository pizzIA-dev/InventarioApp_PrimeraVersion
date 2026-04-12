import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from apps.capital.models import MovimientoCapital
from apps.clientes.models import MovimientoEstadoCliente
from apps.compras.models import MovimientoEstadoCompra
from apps.fiados.models import HistorialFiado
from apps.inventario.models import MovimientoStock
from apps.proveedores.models import MovimientoProveedor
from apps.servicios.models import MovimientoServicio, MovimientoEstadoVentaServicio
from apps.transacciones.models import HistorialTransaccion, MovimientoCategoria
from apps.ventas.models import MovimientoEstadoVenta

User = get_user_model()
try:
    gerente = User.objects.get(username="gerente")
except User.DoesNotExist:
    # If no "gerente", just get the first user
    gerente = User.objects.first()

if not gerente:
    print("No users in DB!")
    exit()

models_list = [
    MovimientoCapital,
    MovimientoEstadoCliente,
    MovimientoEstadoCompra,
    HistorialFiado,
    MovimientoStock,
    MovimientoProveedor,
    MovimientoServicio, MovimientoEstadoVentaServicio,
    HistorialTransaccion, MovimientoCategoria,
    MovimientoEstadoVenta
]

print(f"Assigning historical records to user: {gerente.username}")

for model in models_list:
    updated = model.objects.filter(usuario__isnull=True).update(usuario=gerente)
    print(f"Updated {updated} records in {model.__name__}")
