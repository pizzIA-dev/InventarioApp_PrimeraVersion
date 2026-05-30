# Generated manually - removes almacen FK from PerfilUsuario
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_alter_perfilusuario_almacen_configuracionbackup_and_more'),
        ('inventario', '0011_remove_almacen_models'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='perfilusuario',
            name='almacen',
        ),
    ]