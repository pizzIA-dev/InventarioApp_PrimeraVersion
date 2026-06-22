from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_alter_perfilusuario_almacen_configuracionbackup_and_more'),
        ('inventario', '0011_remove_almacen_models'),
    ]

    operations = [
        # Emptied: almacen models were added and removed (net-zero for new schemas)
        # Existing schemas already have correct state via django_migrations tracking
    ]
