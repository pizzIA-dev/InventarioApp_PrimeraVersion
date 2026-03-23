import os
import django
import sys

# Setup Django environment
sys.path.append('d:\\PROYECTOPROGRAMACION\\ProyectoInventario')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.proveedores.models import Proveedor
from apps.core.models import Empresa

def seed():
    # Attempt to find an enterprise, but don't fail if not found
    empresa = Empresa.objects.first()

    for i in range(1, 26): # Create 25 to ensure multiple pages (15 + 10)
        nombre = f"Proveedor de Prueba {i}"
        identificador = f"200000000{i:02d}"
        Proveedor.objects.get_or_create(
            nombre=nombre,
            identificador=identificador,
            defaults={
                'empresa': empresa,
                'contacto': f"Contacto {i}",
                'email': f"contacto{i}@prueba.com",
                'telefono': f"9998887{i:02d}",
                'activo': True,
                'tiene_contrato': i % 2 == 0
            }
        )
    print("Se han creado 25 proveedores de prueba con éxito.")

if __name__ == "__main__":
    seed()
