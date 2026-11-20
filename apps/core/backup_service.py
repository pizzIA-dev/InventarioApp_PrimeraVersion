"""
Respaldos de un negocio (tenant).

Con django-tenants cada negocio vive en su propio schema, así que un respaldo es
la copia de TODAS las tablas de negocio de ese schema (no se filtra por empresa).

- Se respaldan todos los modelos de las apps de negocio (BACKUP_APPS). Si en el
  futuro se agregan modelos (p. ej. almacenes), entran solos.
- No se respaldan usuarios, perfiles, roles ni el propio historial de respaldos:
  restaurar no debe dejar a nadie sin acceso ni borrar la lista de respaldos.
- Restaurar: primero se genera un respaldo de seguridad del estado actual y luego,
  en una sola transacción, se vacían las tablas de negocio y se cargan las del
  respaldo. Si algo falla, no cambia nada.
"""
import io
import json
import zipfile

from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import serializers
from django.core.management.color import no_style
from django.db import connection, transaction
from django.utils import timezone

FORMATO_VERSION = 2
RETENCION = 7  # respaldos que se conservan por negocio
JSON_NOMBRE = 'datos.json'

BACKUP_APPS = [
    'inventario', 'ventas', 'compras', 'proveedores', 'clientes',
    'capital', 'servicios', 'transacciones', 'fiados',
]


class BackupError(Exception):
    """Error de negocio que se muestra tal cual al usuario."""


def modelos_respaldables():
    """Modelos de negocio ordenados por dependencias (padres antes que hijos)."""
    app_list = []
    for label in BACKUP_APPS:
        config = apps.get_app_config(label)
        modelos = [m for m in config.get_models() if m._meta.managed and not m._meta.proxy]
        app_list.append((config, modelos))
    return serializers.sort_dependencies(app_list, allow_cycles=True)


# ─── Generación ──────────────────────────────────────────────────────────────

def _serializar():
    objetos = []
    conteo = {}
    for modelo in modelos_respaldables():
        datos = json.loads(serializers.serialize('json', modelo._base_manager.order_by('pk')))
        objetos.extend(datos)
        conteo[modelo._meta.label] = len(datos)
    return objetos, conteo


def generar_backup(empresa, *, origen='MANUAL', usuario=None):
    """
    Genera y guarda un respaldo completo del schema actual.
    origen: MANUAL | AUTOMATICO | PRE_RESTAURACION
    """
    from apps.core.models import ConfiguracionBackup, RegistroBackup

    ahora = timezone.now()
    try:
        objetos, conteo = _serializar()
        contenido = {
            'version': FORMATO_VERSION,
            'schema': connection.schema_name,
            'empresa': empresa.nombre,
            'generado_en': ahora.isoformat(),
            'origen': origen,
            'modelos': conteo,
            'objetos': objetos,
        }
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(JSON_NOMBRE, json.dumps(contenido, ensure_ascii=False, default=str))

        etiqueta = dict(RegistroBackup.ORIGEN_CHOICES).get(origen, origen)
        quien = f' por {usuario.username}' if getattr(usuario, 'username', None) else ''
        datos = buffer.getvalue()
        registro = RegistroBackup.objects.create(
            empresa=empresa, estado='EXITO', origen=origen,
            contenido=datos, tamano_bytes=len(datos),
            notas=f'{etiqueta}{quien}. {len(objetos)} registros de {len(conteo)} tablas.',
        )
    except Exception as exc:
        RegistroBackup.objects.create(empresa=empresa, estado='ERROR', origen=origen,
                                      notas=f'Error al generar: {exc}')
        raise BackupError(f'No se pudo generar el respaldo: {exc}') from exc

    ConfiguracionBackup.objects.filter(empresa=empresa).update(ultimo_respaldo=ahora)
    aplicar_retencion(empresa)
    return registro


def config_de(empresa):
    """Configuración de respaldos del negocio (por defecto: diario a las 03:00, activo)."""
    from apps.core.models import ConfiguracionBackup
    config, creado = ConfiguracionBackup.objects.get_or_create(empresa=empresa)
    if creado:
        # El default del modelo es el texto "03:00": recargar para tener un datetime.time real.
        config.refresh_from_db()
    return config


def aplicar_retencion(empresa):
    from apps.core.models import RegistroBackup
    viejos = (RegistroBackup.objects.filter(empresa=empresa).defer('contenido')
              .order_by('-fecha_creacion')[RETENCION:])
    for viejo in viejos:
        if viejo.archivo:
            try:
                viejo.archivo.delete(save=False)
            except Exception:
                pass
        viejo.delete()


# ─── Lectura ─────────────────────────────────────────────────────────────────

def bytes_zip(registro):
    """Bytes del ZIP: desde la base (actual) o desde el archivo (respaldos antiguos)."""
    if registro.contenido:
        return bytes(registro.contenido)
    if registro.archivo:
        with registro.archivo.open('rb') as f:
            return f.read()
    raise BackupError('El contenido de este respaldo ya no está disponible.')


def leer_backup(registro):
    """Devuelve el contenido (dict) de un respaldo, validando su formato."""
    try:
        zf = zipfile.ZipFile(io.BytesIO(bytes_zip(registro)))
    except zipfile.BadZipFile:
        raise BackupError('El archivo del respaldo está dañado.')
    with zf:
        if JSON_NOMBRE not in zf.namelist():
            raise BackupError('Este respaldo es de un formato antiguo e incompleto: no se puede '
                              'restaurar automáticamente. Puedes descargarlo para revisarlo.')
        contenido = json.loads(zf.read(JSON_NOMBRE).decode('utf-8'))
    if contenido.get('version') != FORMATO_VERSION:
        raise BackupError('Versión de respaldo no soportada.')
    if contenido.get('schema') != connection.schema_name:
        raise BackupError('Este respaldo pertenece a otro negocio.')
    return contenido


# ─── Restauración ────────────────────────────────────────────────────────────

def _usuarios_existentes():
    return set(get_user_model()._base_manager.values_list('pk', flat=True))


def _limpiar_referencias_a_usuarios(obj, usuarios):
    """Si el respaldo menciona un usuario que ya no existe, se deja el campo vacío."""
    user_model = get_user_model()
    for campo in obj._meta.concrete_fields:
        if campo.is_relation and campo.related_model is user_model:
            valor = getattr(obj, campo.attname)
            if valor is not None and valor not in usuarios:
                setattr(obj, campo.attname, None)


def restaurar_backup(registro, *, usuario=None):
    """Reemplaza los datos de negocio del schema actual por los del respaldo."""
    contenido = leer_backup(registro)  # valida antes de tocar nada
    modelos = modelos_respaldables()
    etiquetas_validas = {m._meta.label_lower for m in modelos}

    # Red de seguridad: copia del estado actual antes de reemplazarlo
    seguridad = generar_backup(registro.empresa, origen='PRE_RESTAURACION', usuario=usuario)

    usuarios = _usuarios_existentes()
    empresa_id = registro.empresa_id
    objetos = [o for o in contenido['objetos'] if o.get('model') in etiquetas_validas]

    with transaction.atomic():
        tablas = ', '.join(connection.ops.quote_name(m._meta.db_table) for m in modelos)
        with connection.cursor() as cursor:
            # PostgreSQL no permite TRUNCATE con validaciones de FK diferidas pendientes en la
            # transacción: se ejecutan ya y luego se vuelven a diferir para cargar en cualquier orden.
            cursor.execute('SET CONSTRAINTS ALL IMMEDIATE')
            # Sin CASCADE: si alguna tabla fuera del respaldo apuntara a estas, falla y no se borra nada.
            cursor.execute(f'TRUNCATE {tablas} RESTART IDENTITY')
            cursor.execute('SET CONSTRAINTS ALL DEFERRED')

        for des in serializers.deserialize('json', json.dumps(objetos), ignorenonexistent=True):
            obj = des.object
            _limpiar_referencias_a_usuarios(obj, usuarios)
            if hasattr(obj, 'empresa_id'):
                obj.empresa_id = empresa_id
            des.save()  # save "raw": no recalcula stock ni genera historial

        with connection.cursor() as cursor:
            for sql in connection.ops.sequence_reset_sql(no_style(), modelos):
                cursor.execute(sql)

    return {'restaurados': len(objetos), 'respaldo_seguridad_id': seguridad.id}


# ─── Automáticos ─────────────────────────────────────────────────────────────

def toca_respaldo(config, ahora=None):
    """¿Corresponde un respaldo automático para esta configuración ahora?"""
    ahora = timezone.localtime(ahora or timezone.now())
    if not config.activo:
        return False
    if ahora.time() < config.hora_ejecucion:
        return False
    if not config.ultimo_respaldo:
        return True
    dias = (ahora.date() - timezone.localtime(config.ultimo_respaldo).date()).days
    minimo = {'DIARIO': 1, 'SEMANAL': 7, 'MENSUAL': 30}.get(config.frecuencia, 1)
    return dias >= minimo


def storage_respaldos():
    """
    Storage del campo legacy `archivo` (respaldos generados antes de guardarlos en la BD).
    Cloudinary "raw" si está configurado; si no, una carpeta privada local.
    """
    api_key = getattr(settings, 'CLOUDINARY_STORAGE', {}).get('API_KEY')
    if api_key and api_key != 'placeholder':
        from cloudinary_storage.storage import RawMediaCloudinaryStorage
        return RawMediaCloudinaryStorage()
    from django.core.files.storage import FileSystemStorage
    return FileSystemStorage(location=settings.BASE_DIR / 'private_media')
