from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_empresa_logo'),
        ('inventario', '0007_movimientostock_usuario'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Emptied: almacen models were added and removed (net-zero for new schemas)
        # Existing schemas already have correct state via django_migrations tracking
    ]
