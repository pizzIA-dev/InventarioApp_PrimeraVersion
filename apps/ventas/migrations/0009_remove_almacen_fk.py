# Generated manually - removes almacen FK from Venta
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ventas', '0008_venta_almacen'),
        ('inventario', '0011_remove_almacen_models'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='venta',
            name='almacen',
        ),
    ]