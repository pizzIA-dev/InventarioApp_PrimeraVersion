from django.db import migrations


def crear_proveedor_general(apps, schema_editor):
    Proveedor = apps.get_model('proveedores', 'Proveedor')
    Empresa = apps.get_model('core', 'Empresa')

    for empresa in Empresa.objects.all():
        Proveedor.objects.get_or_create(
            empresa=empresa,
            identificador='00000000',
            defaults={
                'nombre': 'Proveedor General',
                'tipo_proveedor': 'PERSONA_NATURAL',
                'tipo_documento': 'DNI',
                'categoria': 'MINORISTA',
                'activo': True,
            }
        )


class Migration(migrations.Migration):

    dependencies = [
        ('proveedores', '0007_alter_proveedor_identificador_and_more'),
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(crear_proveedor_general, migrations.RunPython.noop),
    ]
