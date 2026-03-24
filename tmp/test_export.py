from apps.compras.models import Compra
from rest_framework.test import APIClient

client = APIClient()

print('--- Testing Global Export ---')
res_global = client.get('/api/compras/exportar_historial_global/')
print('Global Export Status:', res_global.status_code)

c = Compra.objects.first()
if c:
    print(f'\n--- Testing Individual Export for Compra #{c.id} ---')
    res_indv = client.get(f'/api/compras/{c.id}/exportar_historial/')
    print('Individual Export Status:', res_indv.status_code)

    print('\n--- Testing Note Text on State Transition ---')
    old_status = c.estado
    new_status = 'CANCELADA' if old_status == 'CONFIRMADA' else 'CONFIRMADA'
    c.estado = new_status
    c.save()
    mov = c.movimientos_estado.last()
    print('Generated Note Text:', mov.notas)
else:
    print('No Compras found in the database to test individual features.')
