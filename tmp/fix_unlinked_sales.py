import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.clientes.models import Cliente
from apps.ventas.models import Venta
from django.db import transaction

def fix_unlinked_sales():
    print("Starting comprehensive data correction for unlinked sales...")
    
    # 1. Get the primary Cliente General
    try:
        cliente_general = Cliente.objects.get(numero_documento='00000000', nombre='Cliente General')
        print(f"Found Cliente General: ID {cliente_general.id}")
    except Cliente.DoesNotExist:
        cliente_general = Cliente.objects.filter(numero_documento='00000000').first()
        if not cliente_general:
            print("Error: No cliente with DNI 00000000 found! Script aborted.")
            return
        print(f"Warning: Primary 'Cliente General' not found, using ID {cliente_general.id} ({cliente_general.nombre})")

    # 2. Find Sales where cliente is null
    unlinked_sales = Venta.objects.filter(cliente__isnull=True)
    count = unlinked_sales.count()
    print(f"Found {count} unlinked sales.")

    updated_count = 0
    with transaction.atomic():
        for venta in unlinked_sales:
            candidate = None
            if venta.cliente_nombre:
                # Try to find a client with this exact name
                candidate = Cliente.objects.filter(nombre__iexact=venta.cliente_nombre).first()
            
            target = candidate if candidate else cliente_general
            
            venta.cliente = target
            # Ensure cliente_nombre matches the target if it was empty or different casing
            if not venta.cliente_nombre or venta.cliente_nombre.lower() != target.nombre.lower():
                venta.cliente_nombre = target.nombre
                
            venta.save()
            updated_count += 1
            if candidate:
                 print(f"  - Linked Venta {venta.id} ('{venta.cliente_nombre}') to Cliente '{target.nombre}' (ID {target.id})")
            else:
                 print(f"  - Linked Venta {venta.id} (Empty/No match) to Cliente General (ID {target.id})")

    print(f"Successfully linked {updated_count} sales.")

if __name__ == "__main__":
    fix_unlinked_sales()
