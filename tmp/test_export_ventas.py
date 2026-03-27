import os
import django
import sys

# Add the project root to sys.path
sys.path.append(r'd:\PROYECTOPROGRAMACION\ProyectoInventario')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ProyectoInventario.settings')
django.setup()

from apps.ventas.views import VentaViewSet
from rest_framework.test import APIRequestFactory

factory = APIRequestFactory()
request = factory.get('/api/ventas/exportar_historial_global/')
view = VentaViewSet.as_view({'get': 'exportar_historial_global'})

try:
    response = view(request)
    print(f"Status Code: {response.status_code}")
    print(f"Content Type: {response.get('Content-Type')}")
    if response.status_code != 200:
        print(f"Content: {response.content}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
