from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0010_alter_movimientostock_origen'),
        ('ventas', '0007_razon_cancelacion'),
    ]

    operations = [
        # Emptied: almacen models were added and removed (net-zero for new schemas)
        # Existing schemas already have correct state via django_migrations tracking
    ]
