from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('compras', '0008_razon_cancelacion'),
        ('inventario', '0010_alter_movimientostock_origen'),
    ]

    operations = [
        # Emptied: almacen models were added and removed (net-zero for new schemas)
        # Existing schemas already have correct state via django_migrations tracking
    ]
