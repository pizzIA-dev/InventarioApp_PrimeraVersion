import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.clientes.models import Cliente
from apps.ventas.models import Venta
from django.db import models
from django.db.models import Count, F

def analyze_data():
    print("--- Analyzing Clients ---")
    # Check for duplicates by numero_documento
    duplicates = Cliente.objects.values('numero_documento', 'empresa').annotate(count=Count('id')).filter(count__gt=1)
    print(f"Total duplicate documento sets: {duplicates.count()}")
    for dup in duplicates:
        clients = Cliente.objects.filter(numero_documento=dup['numero_documento'], empresa=dup['empresa'])
        print(f"Documento {dup['numero_documento']}: {dup['count']} records")
        for c in clients:
            sale_count = c.ventas.count()
            print(f"  - ID: {c.id}, Name: {c.nombre}, Sales: {sale_count}")

    print("\n--- Analyzing Ventas ---")
    # Total sales
    total_sales = Venta.objects.count()
    print(f"Total Sales: {total_sales}")

    # Sales without a linked Cliente object
    unlinked_sales = Venta.objects.filter(cliente__isnull=True)
    print(f"Unlinked Sales (cliente is null): {unlinked_sales.count()}")
    for v in unlinked_sales:
        print(f"  - Venta ID: {v.id}, Comprobante: {v.numero_comprobante_simple}, Client Name: {v.cliente_nombre}")

    # Sales with a linked Cliente but name mismatch (potential confusion)
    mismatched_sales = Venta.objects.filter(cliente__isnull=False).exclude(cliente_nombre__iexact=F('cliente__nombre'))
    # Wait, F expressions might be tricky with CharField nulls. Let's do it simply.
    mismatch_count = 0
    for v in Venta.objects.filter(cliente__isnull=False):
        if v.cliente_nombre and v.cliente.nombre.lower() != v.cliente_nombre.lower():
            mismatch_count += 1
            if mismatch_count <= 10:
                print(f"  - Mismatch: Venta {v.id} says '{v.cliente_nombre}' but linked to Cliente '{v.cliente.nombre}' (ID: {v.cliente.id})")
    
    print(f"Total name mismatches in linked sales: {mismatch_count}")

if __name__ == "__main__":
    analyze_data()
