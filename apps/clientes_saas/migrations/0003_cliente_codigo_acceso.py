import secrets
import string
from django.db import migrations, models


def generar_codigos_existentes(apps, schema_editor):
    """Genera código alfanumérico único a todos los tenants existentes."""
    Cliente = apps.get_model('clientes_saas', 'Cliente')
    chars = string.ascii_uppercase + string.digits
    for tenant in Cliente.objects.filter(codigo_acceso=''):
        while True:
            code = ''.join(secrets.choice(chars) for _ in range(8))
            if not Cliente.objects.filter(codigo_acceso=code).exists():
                tenant.codigo_acceso = code
                tenant.save(update_fields=['codigo_acceso'])
                break


class Migration(migrations.Migration):

    dependencies = [
        ('clientes_saas', '0002_owner_email'),
    ]

    operations = [
        migrations.AddField(
            model_name='cliente',
            name='codigo_acceso',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Código corto alfanumérico para que colaboradores accedan al negocio',
                max_length=8,
                unique=True,
            ),
            preserve_default=False,
        ),
        migrations.RunPython(generar_codigos_existentes, migrations.RunPython.noop),
    ]