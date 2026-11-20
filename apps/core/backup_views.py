"""
Respaldos del negocio (solo Gerente). La lógica vive en apps/core/backup_service.py.
"""
import logging

from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core import backup_service
from apps.core.models import ConfiguracionBackup, RegistroBackup

logger = logging.getLogger(__name__)


def _empresa_si_gerente(request):
    """Devuelve la empresa del Gerente, o None si el usuario no es Gerente."""
    perfil = getattr(request.user, 'perfil', None)
    if perfil is None or perfil.rol != 'GERENTE' or perfil.empresa is None:
        return None
    return perfil.empresa


def _no_autorizado():
    return Response({'error': 'Solo el Gerente puede gestionar los respaldos.'},
                    status=status.HTTP_403_FORBIDDEN)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def manage_backup_config(request):
    """Obtiene o actualiza la configuración de respaldos automáticos."""
    empresa = _empresa_si_gerente(request)
    if empresa is None:
        return _no_autorizado()
    config, _ = ConfiguracionBackup.objects.get_or_create(empresa=empresa)

    if request.method == 'POST':
        frecuencia = request.data.get('frecuencia', config.frecuencia)
        if frecuencia not in ('DIARIO', 'SEMANAL', 'MENSUAL'):
            return Response({'error': 'Frecuencia inválida.'}, status=status.HTTP_400_BAD_REQUEST)
        config.frecuencia = frecuencia
        if request.data.get('hora_ejecucion'):
            config.hora_ejecucion = request.data['hora_ejecucion']
        if 'activo' in request.data:
            config.activo = bool(request.data['activo'])
        config.save()
        return Response({'message': 'Configuración de respaldos actualizada correctamente.'})

    return Response({
        'frecuencia': config.frecuencia,
        'hora_ejecucion': config.hora_ejecucion.strftime('%H:%M') if config.hora_ejecucion else '03:00',
        'activo': config.activo,
        'ultimo_respaldo': config.ultimo_respaldo,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_backups(request):
    """Lista los respaldos del negocio (sin URLs directas: se descargan por la API)."""
    empresa = _empresa_si_gerente(request)
    if empresa is None:
        return _no_autorizado()
    data = [{
        'id': b.id,
        'fecha_creacion': b.fecha_creacion,
        'estado': b.estado,
        'notas': b.notas,
        'descargable': bool(b.archivo),
    } for b in RegistroBackup.objects.filter(empresa=empresa).order_by('-fecha_creacion')]
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generar_backup(request):
    """Genera un respaldo manual inmediato."""
    empresa = _empresa_si_gerente(request)
    if empresa is None:
        return _no_autorizado()
    try:
        registro = backup_service.generar_backup(empresa, origen='MANUAL', usuario=request.user)
    except backup_service.BackupError as exc:
        logger.exception('Error generando respaldo manual')
        return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response({'message': 'Respaldo generado correctamente.', 'id': registro.id, 'notas': registro.notas},
                    status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def descargar_backup(request, backup_id):
    """Descarga el ZIP de un respaldo (requiere sesión de Gerente del negocio)."""
    empresa = _empresa_si_gerente(request)
    if empresa is None:
        return _no_autorizado()
    registro = RegistroBackup.objects.filter(id=backup_id, empresa=empresa).first()
    if registro is None or not registro.archivo:
        return Response({'error': 'Respaldo no disponible.'}, status=status.HTTP_404_NOT_FOUND)
    with registro.archivo.open('rb') as f:
        contenido = f.read()
    nombre = registro.archivo.name.rsplit('/', 1)[-1]
    response = HttpResponse(contenido, content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="{nombre}"'
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def restore_backup(request):
    """
    Reemplaza los datos del negocio por los de un respaldo.
    Antes genera automáticamente un respaldo de seguridad del estado actual.
    """
    empresa = _empresa_si_gerente(request)
    if empresa is None:
        return Response({'error': 'Acción crítica no autorizada.'}, status=status.HTTP_403_FORBIDDEN)

    registro = RegistroBackup.objects.filter(id=request.data.get('backup_id'), empresa=empresa).first()
    if registro is None:
        return Response({'error': 'Respaldo no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    if registro.estado != 'EXITO':
        return Response({'error': 'Ese respaldo terminó con error y no se puede restaurar.'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        resultado = backup_service.restaurar_backup(registro, usuario=request.user)
    except backup_service.BackupError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception('Error restaurando respaldo %s', registro.id)
        return Response({'error': f'Error al restaurar; no se modificó ningún dato. Detalle: {exc}'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({
        'message': (f'Restauración completada: {resultado["restaurados"]} registros. '
                    'Se guardó un respaldo de seguridad del estado anterior.'),
        **resultado,
    })
