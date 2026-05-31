from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0008_almacen_stockalmacen_trasladostock'),
    ]

    operations = [
        # Emptied: HistorialAsignacionAlmacen was added and removed (net-zero for new schemas).
        # Existing schemas already have the correct state via django_migrations tracking.
    ]
