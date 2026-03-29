import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.transacciones.models import CategoriaTransaccion, MovimientoCategoria

cats = CategoriaTransaccion.objects.filter(nombre__icontains='apoyo')
print('Categorias encontradas:', [str(c) for c in cats])

if cats.exists():
    cat = cats.first()
    movs = MovimientoCategoria.objects.filter(categoria=cat).order_by('-fecha')
    print(f'Movimientos para {cat.nombre} ({movs.count()} total):')
    for m in movs[:10]:
        print(f'  [{m.fecha.strftime("%d/%m/%Y %H:%M:%S")}] {m.tipo_movimiento} | {m.campo_modificado} | {m.valor_anterior} -> {m.valor_nuevo}')
else:
    print('No se encontro la categoria Apoyo Familiar.')
    print('Todas las categorias:')
    for c in CategoriaTransaccion.objects.all():
        print(f'  - {c.nombre} ({c.tipo}) activo={c.activo}')
