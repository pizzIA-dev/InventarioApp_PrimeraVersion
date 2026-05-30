import os
import json
import zipfile
import tempfile
from datetime import datetime, time, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core import serializers
from apps.core.models import ConfiguracionBackup, RegistroBackup, Empresa
from django.core.files.base import ContentFile

class Command(BaseCommand):
    help = 'Genera backups estructurados para los tenants que tengan configurada la ejecución periódica.'

    def handle(self, *args, **options):
        # 1. Obtener la hora actual
        now = timezone.now()
        current_time = now.time()
        
        # 2. Filtrar configuraciones activas cuyo horario haya pasado en la última hora y que no tengan un respaldo hoy
        # Para ser económico, esto se correría vía crontab cada hora (ej: `0 * * * * python manage.py run_backups`)
        # Por lo que buscamos respaldos programados para la hora actual.
        configuraciones = ConfiguracionBackup.objects.filter(activo=True)

        for config in configuraciones:
            # Lógica simple de frecuencia
            if config.ultimo_respaldo:
                dias_pasados = (now.date() - config.ultimo_respaldo.date()).days
                if config.frecuencia == "DIARIO" and dias_pasados < 1:
                    continue
                if config.frecuencia == "SEMANAL" and dias_pasados < 7:
                    continue
                if config.frecuencia == "MENSUAL" and dias_pasados < 30:
                    continue
            
            # Verificamos si ya es hora
            if current_time >= config.hora_ejecucion:
                self.stdout.write(self.style.SUCCESS(f'Iniciando backup para {config.empresa.nombre}...'))
                self.run_backup_for_tenant(config)

    def run_backup_for_tenant(self, config):
        try:
            empresa = config.empresa
            timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
            filename = f"backup_{empresa.id}_{timestamp}.json"
            zip_filename = f"backup_{empresa.id}_{timestamp}.zip"
            
            # Recopilar datos (Esto asume la serialización de modelos clave)
            # En Django, usamos `serializers.serialize` con un queryset filtrado por empresa.
            from apps.inventario.models import Producto, MovimientoStock
            from apps.clientes.models import Cliente
            from apps.proveedores.models import Proveedor
            from apps.ventas.models import Venta
            from apps.compras.models import Compra
            
            models_to_backup = [
                Producto.objects.filter(empresa=empresa),
                Cliente.objects.filter(empresa=empresa),
                Proveedor.objects.filter(empresa=empresa),
                Venta.objects.filter(empresa=empresa),
                Compra.objects.filter(empresa=empresa),
            ]
            
            # Si el modelo MovimientoStock puede llegar a ser muy pesado, se podría segmentar.
            try:
                models_to_backup.append(MovimientoStock.objects.filter(empresa=empresa))
            except Exception as e:
                pass

            data = []
            for qs in models_to_backup:
                data += json.loads(serializers.serialize("json", qs))
            
            json_str = json.dumps(data, indent=2)

            # Crear ZIP en memoria
            with tempfile.SpooledTemporaryFile() as tmp:
                with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as archive:
                    archive.writestr(filename, json_str)
                tmp.seek(0)
                
                # Guardar el registro
                registro = RegistroBackup.objects.create(
                    empresa=empresa,
                    estado="EXITO",
                    notas=f"Respaldo generado automáticamente. {len(data)} registros exportados."
                )
                
                # Guardar el ZIP. Django (y Cloudinary) suben el ContentFile a la nube.
                registro.archivo.save(zip_filename, ContentFile(tmp.read()))
                
            config.ultimo_respaldo = timezone.now()
            config.save()
            self.stdout.write(self.style.SUCCESS(f'✅ Backup exitoso: {zip_filename}'))

            # Eliminar backups viejos para ahorrar costos (Retener últimos 7)
            viejos = RegistroBackup.objects.filter(empresa=empresa).order_by('-fecha_creacion')[7:]
            for v in viejos:
                if v.archivo:
                    v.archivo.delete(save=False)
                v.delete()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error backup: {str(e)}'))
            RegistroBackup.objects.create(
                empresa=config.empresa,
                estado="ERROR",
                notas=str(e)
            )
