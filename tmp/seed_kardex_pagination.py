import os
import django
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.clientes.models import Cliente, MovimientoEstadoCliente
from apps.ventas.models import Venta, MovimientoEstadoVenta

def seed_pagination_data():
    # 1. Seed 20 state changes for the first client
    cliente = Cliente.objects.first()
    if cliente:
        print(f"Seeding 20 state changes for client: {cliente.nombre}")
        for i in range(20):
            MovimientoEstadoCliente.objects.create(
                cliente=cliente,
                estado_anterior="Borrador",
                estado_nuevo="Activo",
                notas=f"Nota de prueba para paginación {i+1}",
                fecha=timezone.now() - timedelta(minutes=i)
            )
    else:
        print("No clients found.")

    # 2. Seed 20 state changes for the first sale
    venta = Venta.objects.first()
    if venta:
        print(f"Seeding 20 state changes for sale: {venta.id}")
        for i in range(20):
            # Using the related name or direct model
            MovimientoEstadoVenta.objects.create(
                venta=venta,
                estado_anterior="PENDIENTE",
                estado_nuevo="CONFIRMADA",
                notas=f"Nota de prueba para paginación de venta {i+1}",
                fecha=timezone.now() - timedelta(minutes=i)
            )
    else:
        print("No sales found.")

if __name__ == "__main__":
    seed_pagination_data()
