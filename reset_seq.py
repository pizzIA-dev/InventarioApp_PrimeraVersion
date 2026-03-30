import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.fiados.models import Fiado

def reset():
    max_id = Fiado.objects.all().order_by('-id').values_list('id', flat=True).first() or 0
    with connection.cursor() as cursor:
        cursor.execute("UPDATE sqlite_sequence SET seq = %s WHERE name = 'fiados_fiado'", [max_id])
    print(f"Secuencia de 'fiados_fiado' reseteada a {max_id}")
    print(f"IDs actuales: {list(Fiado.objects.values_list('id', flat=True).order_by('id'))}")

if __name__ == '__main__':
    reset()
