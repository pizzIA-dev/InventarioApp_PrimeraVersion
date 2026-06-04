from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0001_initial'),
        ('fiados', '0006_historialfiado_usuario'),
    ]

    operations = [
        # Step 1: Add new nullable FK to clientes.Cliente on Fiado
        migrations.AddField(
            model_name='fiado',
            name='cliente_new',
            field=models.ForeignKey(
                'clientes.Cliente',
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='fiados_new',
                null=True,
                blank=True,
            ),
        ),
        # Step 2: Add new nullable FK to clientes.Cliente on HistorialFiado
        migrations.AddField(
            model_name='historialfiado',
            name='cliente_new',
            field=models.ForeignKey(
                'clientes.Cliente',
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='historial_fiados_new',
                null=True,
                blank=True,
            ),
        ),
        # Step 3: Remove old ClienteFiado FK from Fiado
        migrations.RemoveField(
            model_name='fiado',
            name='cliente',
        ),
        # Step 4: Remove old ClienteFiado FK from HistorialFiado
        migrations.RemoveField(
            model_name='historialfiado',
            name='cliente',
        ),
        # Step 5: Rename the new fields to 'cliente'
        migrations.RenameField(
            model_name='fiado',
            old_name='cliente_new',
            new_name='cliente',
        ),
        migrations.RenameField(
            model_name='historialfiado',
            old_name='cliente_new',
            new_name='cliente',
        ),
    ]