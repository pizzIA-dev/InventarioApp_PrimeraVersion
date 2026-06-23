from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('servicios', '0010_serviciocontratado'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicio',
            name='codigo',
            field=models.CharField(blank=True, db_index=True, max_length=50, null=True),
        ),
    ]