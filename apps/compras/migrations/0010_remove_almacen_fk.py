# Generated manually - removes almacen FK from Compra
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('compras', '0009_compra_almacen'),
        ('inventario', '0011_remove_almacen_models'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='compra',
            name='almacen',
        ),
    ]