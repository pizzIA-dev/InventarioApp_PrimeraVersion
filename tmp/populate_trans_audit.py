from apps.transacciones.models import Transaccion, HistorialTransaccion
from django.utils import timezone

print("Iniciando carga de historial de auditoría inicial para transacciones...")

count = 0
for t in Transaccion.objects.all():
    if not HistorialTransaccion.objects.filter(transaccion=t, campo_modificado='Creación').exists():
        cat_status = "Activa" if (t.categoria and t.categoria.activo) else "N/A/Inactiva"
        hist = HistorialTransaccion(
            transaccion=t,
            campo_modificado='Creación',
            valor_nuevo=f"Monto: {t.monto}",
            descripcion=f"Transacción creada en categoría '{t.categoria.nombre if t.categoria else 'N/A'}' ({cat_status}).",
            notas='Carga inicial de auditoría'
        )
        hist.save()
        # Sincronizar fecha con la creación de la transacción
        HistorialTransaccion.objects.filter(id=hist.id).update(fecha=t.creado_en)
        count += 1

print(f"Carga completada. Se crearon {count} registros de auditoría.")
