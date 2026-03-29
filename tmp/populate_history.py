from apps.transacciones.models import CategoriaTransaccion, Transaccion, MovimientoCategoria
from django.utils import timezone

print("Iniciando carga de historial inicial...")

# 1. Categorías
for cat in CategoriaTransaccion.objects.all():
    if not MovimientoCategoria.objects.filter(categoria=cat, campo_modificado='Creación').exists():
        MovimientoCategoria.objects.create(
            categoria=cat,
            tipo_movimiento='ESTADO',
            campo_modificado='Creación',
            valor_nuevo='Activo' if cat.activo else 'Inactivo',
            descripcion=f"Carga inicial de historial para {cat.nombre}."
        )

# 2. Transacciones
count = 0
for t in Transaccion.objects.all():
    if t.categoria and not MovimientoCategoria.objects.filter(transaccion_id=t.id).exists():
        mov = MovimientoCategoria(
            categoria=t.categoria,
            tipo_movimiento='TRANSACCION',
            campo_modificado='Registro de Movimiento',
            monto=t.monto,
            descripcion=f"{'Ingreso' if t.tipo == 'INGRESO' else 'Gasto'}: {t.descripcion}",
            referencia=t.referencia,
            transaccion_id=t.id,
            notas='Carga histórica'
        )
        mov.save()
        # Actualizar la fecha para que coincida con la de la transacción
        MovimientoCategoria.objects.filter(id=mov.id).update(fecha=t.fecha)
        count += 1

print(f"Carga completada. Se crearon {count} registros históricos.")
