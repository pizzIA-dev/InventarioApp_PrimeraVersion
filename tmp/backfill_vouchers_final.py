from apps.ventas.models import Venta
from apps.servicios.models import VentaServicio

ventas_simple = Venta.objects.filter(numero_comprobante_simple='')
for v in ventas_simple:
    v.numero_comprobante_simple = f"SMP-{v.id:06d}"
    v.save()
print(f"Poblados {ventas_simple.count()} registros de Venta.")

servicios_simple = VentaServicio.objects.filter(numero_comprobante_simple='')
for v in servicios_simple:
    v.numero_comprobante_simple = f"SMP-{v.id:06d}"
    v.save()
print(f"Poblados {servicios_simple.count()} registros de VentaServicio.")
