# Generated manually
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('servicios', '0009_compraservicio_movimientoestadocompraservicio'),
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ServicioContratado',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=200)),
                ('descripcion', models.TextField(blank=True, null=True)),
                ('precio_referencia', models.DecimalField(blank=True, decimal_places=2, help_text='Precio habitual de referencia (editable en cada compra)', max_digits=12, null=True)),
                ('activo', models.BooleanField(default=True)),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('empresa', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='servicios_contratados_catalogo', to='core.empresa')),
            ],
            options={
                'verbose_name': 'Servicio Contratado',
                'verbose_name_plural': 'Servicios Contratados',
                'ordering': ['nombre'],
            },
        ),
    ]
