import json
import zipfile
import tempfile
from django.db import transaction
from django.core import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from apps.core.models import ConfiguracionBackup, RegistroBackup
from apps.inventario.models import Producto, Almacen, MovimientoStock, StockAlmacen, TrasladoStock
from apps.clientes.models import Cliente
from apps.proveedores.models import Proveedor
from apps.ventas.models import Venta
from apps.compras.models import Compra

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def manage_backup_config(request):
    """
    Obtiene o actualiza la configuración de backups automáticos del Tenant.
    Solo accesible para el Gerente.
    """
    if request.user.perfil.rol != 'GERENTE':
        return Response({"error": "Solo el Gerente puede configurar los backups."}, status=status.HTTP_403_FORBIDDEN)
    
    empresa = request.user.perfil.empresa
    config, created = ConfiguracionBackup.objects.get_or_create(empresa=empresa)

    if request.method == 'GET':
        return Response({
            "frecuencia": config.frecuencia,
            "hora_ejecucion": config.hora_ejecucion.strftime("%H:%M") if config.hora_ejecucion else "03:00",
            "activo": config.activo,
            "ultimo_respaldo": config.ultimo_respaldo
        })

    if request.method == 'POST':
        config.frecuencia = request.data.get('frecuencia', config.frecuencia)
        hora = request.data.get('hora_ejecucion')
        if hora:
            config.hora_ejecucion = hora
        config.activo = request.data.get('activo', config.activo)
        config.save()
        return Response({"message": "Configuración de backup actualizada correctamente."})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_backups(request):
    """Lista todos los backups generados para esta empresa."""
    if request.user.perfil.rol != 'GERENTE':
        return Response({"error": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

    empresa = request.user.perfil.empresa
    backups = RegistroBackup.objects.filter(empresa=empresa).order_by('-fecha_creacion')
    data = []
    for b in backups:
        data.append({
            "id": b.id,
            "fecha_creacion": b.fecha_creacion,
            "estado": b.estado,
            "notas": b.notas,
            "url": b.archivo.url if b.archivo else None
        })
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def restore_backup(request):
    """
    Descomprime un backup ZIP y restaura la base de datos de este tenant.
    ADVERTENCIA: Destruye los datos actuales del tenant.
    """
    if request.user.perfil.rol != 'GERENTE':
        return Response({"error": "Acción crítica no autorizada."}, status=status.HTTP_403_FORBIDDEN)

    backup_id = request.data.get('backup_id')
    empresa = request.user.perfil.empresa

    try:
        registro = RegistroBackup.objects.get(id=backup_id, empresa=empresa)
    except RegistroBackup.DoesNotExist:
        return Response({"error": "Backup no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    if not registro.archivo:
        return Response({"error": "El archivo de backup ya no está disponible en la nube."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Descargar/Leer el ZIP desde el Storage
        with registro.archivo.open('rb') as f:
            with zipfile.ZipFile(f) as archive:
                # Asumimos que solo hay 1 archivo JSON adentro
                filename = archive.namelist()[0]
                with archive.open(filename) as json_file:
                    json_data = json_file.read().decode('utf-8')
        
        objects = list(serializers.deserialize('json', json_data))
        
        # Restauración Atómica
        with transaction.atomic():
            # 1. BORRAR DATOS ACTUALES (Cuidado extremo)
            MovimientoStock.objects.filter(empresa=empresa).delete()
            TrasladoStock.objects.filter(empresa=empresa).delete()
            StockAlmacen.objects.filter(almacen__empresa=empresa).delete()
            Venta.objects.filter(empresa=empresa).delete()
            Compra.objects.filter(empresa=empresa).delete()
            Producto.objects.filter(empresa=empresa).delete()
            Cliente.objects.filter(empresa=empresa).delete()
            Proveedor.objects.filter(empresa=empresa).delete()
            Almacen.objects.filter(empresa=empresa).delete()

            # 2. INSERTAR DATOS DEL BACKUP
            for obj in objects:
                # Asegurar que el objeto restaurado pertenezca a este tenant
                if hasattr(obj.object, 'empresa_id'):
                    obj.object.empresa_id = empresa.id
                obj.save()

        return Response({"message": "Restauración completada con éxito. El sistema ha vuelto al estado anterior."})

    except Exception as e:
        # Cualquier error hará Rollback automático de los delete()
        return Response({"error": f"Error crítico al restaurar: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
