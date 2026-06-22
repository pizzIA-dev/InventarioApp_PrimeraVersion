from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0007_movimientostock_usuario'),
    ]

    operations = [
        # Emptied: Almacen, StockAlmacen, TrasladoStock were added and removed (net-zero).
        # Existing schemas already have the correct state via django_migrations tracking.
        # New tenant schemas skip these tables entirely - they were never needed.
    ]
