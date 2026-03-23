import os
import django
import sys

# Setup django
sys.path.append(r'd:\PROYECTOPROGRAMACION\ProyectoInventario')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.proveedores.models import Proveedor, MovimientoProveedor

def seed_history():
    p = Proveedor.objects.first()
    if not p:
        print("No supplier found")
        return
    
    print(f"Adding 20 history records to supplier: {p.nombre}")
    for i in range(20):
        MovimientoProveedor.objects.create(
            proveedor=p,
            tipo='OTRO',
            descripcion=f'Prueba de paginación registro #{i+1}',
            activo_nuevo=p.activo,
            contrato_nuevo=p.tiene_contrato
        )
    print("Done")

if __name__ == "__main__":
    seed_history()
