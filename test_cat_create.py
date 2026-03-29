import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Create a category
data = json.dumps({'nombre': 'Test Cat Desaparecida', 'tipo': 'INGRESO', 'descripcion': 'Testeando', 'activo': True}).encode()
req = urllib.request.Request('http://127.0.0.1:8000/api/transacciones/categorias/', data=data, headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req, context=ctx)
cat = json.loads(res.read())
cat_id = cat['id']
print('Created category', cat_id)

# Patch to Inactivo
data = json.dumps({'activo': False}).encode()
req = urllib.request.Request(f'http://127.0.0.1:8000/api/transacciones/categorias/{cat_id}/', data=data, headers={'Content-Type': 'application/json'}, method='PATCH')
res = urllib.request.urlopen(req, context=ctx)
print('Patched category to Inactivo', res.getcode())

# Get History
req = urllib.request.Request(f'http://127.0.0.1:8000/api/transacciones/categorias/{cat_id}/historial/')
res = urllib.request.urlopen(req, context=ctx)
data = json.loads(res.read())
print('History count:', len(data['results']))
for m in data['results']:
    print(m['campo_modificado'], m['valor_anterior'], m['valor_nuevo'], m['estado_categoria'], m['notas'])
