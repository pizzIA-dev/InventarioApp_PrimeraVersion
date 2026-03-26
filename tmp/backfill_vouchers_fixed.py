from apps.ventas.models import Venta
from apps.servicios.models import VentaServicio

# Backfill Product Sales
ventas_simple = Venta.objects.filter(tipo_comprobante='SIMPLE', numero_comprobante_simple__isnull=True)
for v in ventas_simple:
    v.numero_comprobante_simple = v.numero_comprobante
    v.save()
print(f"Poblados {ventas_simple.count()} registros de Venta.")

# Backfill Service Sales
servicios_simple = VentaServicio.objects.filter(tipo_comprobante='SIMPLE', numero_comprobante_simple__isnull=True)
for s in servicios_simple:
    s.numero_comprobante_simple = s.numero_comprobante
    s.save()
print(f"Poblados {servicios_simple.count()} registros de VentaServicio.")
