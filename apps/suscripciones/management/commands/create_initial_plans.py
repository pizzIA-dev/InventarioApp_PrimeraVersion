from django.core.management.base import BaseCommand
from apps.suscripciones.models import Plan

class Command(BaseCommand):
    help = 'Crea los planes iniciales de NegocIA si no existen'

    def handle(self, *args, **options):
        planes = [
            {
                'nombre': 'EMPRENDEDOR',
                'descripcion': 'Plan ideal para negocios que están comenzando. Incluye todas las funciones esenciales.',
                'precio_mensual': 39.90,
                'tiene_roles_avanzados': False,
                'cobra_por_asiento': False,
                'precio_asiento_extra': 0.00,
            },
            {
                'nombre': 'EMPRESARIO',
                'descripcion': 'Plan completo para negocios en crecimiento. Roles avanzados y usuarios ilimitados.',
                'precio_mensual': 79.90,
                'tiene_roles_avanzados': True,
                'cobra_por_asiento': True,
                'precio_asiento_extra': 15.00,
            },
        ]
        created = 0
        for p in planes:
            obj, was_created = Plan.objects.get_or_create(nombre=p['nombre'], defaults=p)
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"  Plan creado: {obj}"))
            else:
                self.stdout.write(f"  Plan ya existe: {obj}")
        self.stdout.write(self.style.SUCCESS(f"Planes listos ({created} nuevos)"))
