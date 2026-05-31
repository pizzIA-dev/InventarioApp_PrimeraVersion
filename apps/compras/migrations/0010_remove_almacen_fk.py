from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('compras', '0009_compra_almacen'),
        ('inventario', '0011_remove_almacen_models'),
    ]

    operations = [
        # Emptied: almacen models were added and removed (net-zero for new schemas)
        # Existing schemas already have correct state via django_migrations tracking
    ]
