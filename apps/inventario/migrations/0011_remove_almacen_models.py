# Generated manually - removes Almacen, StockAlmacen, TrasladoStock, HistorialAsignacionAlmacen
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0010_alter_movimientostock_origen'),
    ]

    operations = [
        # First remove FK from MovimientoStock
        migrations.RemoveField(
            model_name='movimientostock',
            name='almacen',
        ),
        # Then remove the dependent models
        migrations.DeleteModel(
            name='HistorialAsignacionAlmacen',
        ),
        migrations.DeleteModel(
            name='StockAlmacen',
        ),
        migrations.DeleteModel(
            name='TrasladoStock',
        ),
        migrations.DeleteModel(
            name='Almacen',
        ),
    ]