from django.db import migrations

def add_default_tipos(apps, schema_editor):
    Empresa = apps.get_model('core', 'Empresa')
    TipoCapital = apps.get_model('capital', 'TipoCapital')
    
    defaults = [
        # Dinero
        {'nombre': 'Efectivo', 'tipo': 'DINERO', 'descripcion': 'Dinero en caja o efectivo'},
        {'nombre': 'Cuentas Bancarias', 'tipo': 'DINERO', 'descripcion': 'Fondos en cuentas corrientes o de ahorros'},
        {'nombre': 'Caja Chica', 'tipo': 'DINERO', 'descripcion': 'Fondo destinado a gastos menores'},
        
        # Bienes
        {'nombre': 'Maquinaria y Equipo', 'tipo': 'BIEN', 'descripcion': 'Equipos industriales y máquinas del negocio'},
        {'nombre': 'Muebles y Enseres', 'tipo': 'BIEN', 'descripcion': 'Mobiliario de oficina y equipos diversos'},
        {'nombre': 'Vehículos', 'tipo': 'BIEN', 'descripcion': 'Transporte propiedad de la empresa'},
        {'nombre': 'Equipos de Cómputo', 'tipo': 'BIEN', 'descripcion': 'Laptops, computadoras y periféricos'},
    ]
    
    for empresa in Empresa.objects.all():
        for item in defaults:
            TipoCapital.objects.get_or_create(
                empresa=empresa,
                nombre=item['nombre'],
                tipo=item['tipo'],
                defaults={'descripcion': item['descripcion']}
            )

def remove_default_tipos(apps, schema_editor):
    TipoCapital = apps.get_model('capital', 'TipoCapital')
    TipoCapital.objects.filter(
        nombre__in=[
            'Efectivo', 'Cuentas Bancarias', 'Caja Chica',
            'Maquinaria y Equipo', 'Muebles y Enseres', 'Vehículos', 'Equipos de Cómputo'
        ]
    ).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('capital', '0001_initial'),
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_default_tipos, remove_default_tipos),
    ]
