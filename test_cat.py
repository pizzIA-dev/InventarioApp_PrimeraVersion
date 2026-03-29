import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('http://127.0.0.1:8000/api/transacciones/categorias/1/', data=json.dumps({'activo': False}).encode(), headers={'Content-Type': 'application/json'}, method='PATCH')
try:
    urllib.request.urlopen(req, context=ctx)
except Exception as e:
    pass

req = urllib.request.Request('http://127.0.0.1:8000/api/transacciones/categorias/1/historial/')
res = urllib.request.urlopen(req, context=ctx)
data = json.loads(res.read())
print('Results:', len(data['results']))
for m in data['results'][:3]:
    print('Campo:', m.get('campo_modificado'), '|', 'Estado:', m.get('estado_categoria'), '|', 'Notas:', m.get('notas'))
