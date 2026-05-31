from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0008_almacen_stockalmacen_trasladostock'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Emptied: almacen models were added and removed (net-zero for new schemas)
        # Existing schemas already have correct state via django_migrations tracking
    ]
