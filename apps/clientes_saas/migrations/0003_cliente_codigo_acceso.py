import secrets
import string
from django.db import migrations, models


def generar_codigos_existentes(apps, schema_editor):
    """Genera codigo alfanumerico unico a todos los tenants existentes."""
    Cliente = apps.get_model('clientes_saas', 'Cliente')
    chars = string.ascii_uppercase + string.digits
    for tenant in Cliente.objects.all():
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
        # Paso 1: agregar el campo sin unique (para no fallar con valores vacios)
        migrations.AddField(
            model_name='cliente',
            name='codigo_acceso',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Codigo corto alfanumerico para que colaboradores accedan al negocio',
                max_length=8,
            ),
        ),
        # Paso 2: poblar codigos unicos en todos los tenants existentes
        migrations.RunPython(generar_codigos_existentes, migrations.RunPython.noop),
        # Paso 3: ahora que todos tienen valores, agregar la restriccion unique
        migrations.AlterField(
            model_name='cliente',
            name='codigo_acceso',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Codigo corto alfanumerico para que colaboradores accedan al negocio',
                max_length=8,
                unique=True,
            ),
        ),
    ]