from django.db import models
from django.utils import timezone
from django.conf import settings
from apps.core.constants import ROL_CHOICES
from apps.core.backup_service import storage_respaldos

def tenant_logo_path(instance, filename):
    from django.db import connection
    # Aisla la carpeta de Media usando el nombre del esquema del Tenant actual
    schema_name = getattr(connection, 'schema_name', 'public')
    return f'negocia_saas/tenants/{schema_name}/logos/{filename}'

class Empresa(models.Model):
    nombre = models.CharField(max_length=255)
    ruc = models.CharField(max_length=30, blank=True, null=True)
    logo = models.ImageField(upload_to=tenant_logo_path, blank=True, null=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    telefono = models.CharField(max_length=50, blank=True, null=True)
    fecha_registro = models.DateTimeField(default=timezone.now)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'core_empresa'
        verbose_name_plural = 'Empresas'

    def __str__(self):
        return self.nombre


class RolPersonalizado(models.Model):
    """
    Motor RBAC para Plan Empresario. Permite crear roles dinámicos con
    scopes de acceso específicos guardados en JSON.
    Ej: permisos = ["inventario:read", "ventas:write"]
    """
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    permisos = models.JSONField(default=list)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'core_rol_personalizado'
        verbose_name_plural = 'Roles Personalizados'

    def __str__(self):
        return self.nombre


class PerfilUsuario(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='perfil')
    rol = models.CharField(
        max_length=20,
        choices=ROL_CHOICES,
        default='COLABORADOR'
    )
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='usuarios', null=True, blank=True)

    # Campo para RBAC Empresarial
    rol_custom = models.ForeignKey(
        RolPersonalizado,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='perfiles_asignados'
    )
    # Almacén asignado --- Solo Gerente puede reasignar
    class Meta:
        db_table = 'core_perfilusuario'
        verbose_name_plural = 'Perfiles de Usuario'

    def __str__(self):
        base = f"{self.user.username} - {self.get_rol_display()}"
        if self.rol_custom:
            base += f" ({self.rol_custom.nombre})"
        return base

    @property
    def is_gerente(self):
        return self.rol == 'GERENTE'

    @property
    def is_colaborador(self):
        return self.rol in ('COLABORADOR', 'VENDEDOR')  # VENDEDOR: retrocompat

class ConfiguracionBackup(models.Model):
    FRECUENCIA_CHOICES = [
        ("DIARIO", "Diario"),
        ("SEMANAL", "Semanal"),
        ("MENSUAL", "Mensual"),
    ]
    empresa = models.OneToOneField(Empresa, on_delete=models.CASCADE, related_name="configuracion_backup")
    frecuencia = models.CharField(max_length=20, choices=FRECUENCIA_CHOICES, default="DIARIO")
    hora_ejecucion = models.TimeField(default="03:00")
    activo = models.BooleanField(default=True)
    ultimo_respaldo = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "core_configuracion_backup"
        verbose_name_plural = "Configuraciones de Backup"

class RegistroBackup(models.Model):
    ORIGEN_CHOICES = [
        ("MANUAL", "Manual"),
        ("AUTOMATICO", "Automático"),
        ("PRE_RESTAURACION", "Seguridad (antes de restaurar)"),
    ]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="registro_backups")
    # El ZIP se guarda en la propia base (comprimido): así lo ven tanto el servicio web
    # como el cron de respaldos, que en Railway no comparten disco.
    contenido = models.BinaryField(null=True, blank=True, editable=False)
    tamano_bytes = models.PositiveIntegerField(default=0)
    origen = models.CharField(max_length=20, choices=ORIGEN_CHOICES, default="MANUAL")
    # Legacy: respaldos anteriores guardados como archivo (solo lectura/descarga).
    archivo = models.FileField(upload_to="backups/tenants/", storage=storage_respaldos, blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=[("EXITO", "Éxito"), ("ERROR", "Error")])
    notas = models.TextField(blank=True, null=True)

    @property
    def descargable(self):
        return bool(self.tamano_bytes) or bool(self.archivo)

    class Meta:
        db_table = "core_registro_backup"
        ordering = ["-fecha_creacion"]
