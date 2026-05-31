from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_almacen_stockalmacen_trasladostock'),
        ('inventario', '0010_alter_movimientostock_origen'),
    ]

    operations = [
        # Emptied: almacen models were added and removed (net-zero for new schemas)
        # Existing schemas already have correct state via django_migrations tracking
    ]
