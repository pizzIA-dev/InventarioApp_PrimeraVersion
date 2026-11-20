"""
Consolida el modelo legacy ClienteFiado en clientes.Cliente y lo elimina.

Desde la migración 0007 los fiados apuntan a clientes.Cliente; las filas de
ClienteFiado quedaron sin vínculo. Antes de borrar la tabla se copian a
clientes.Cliente las que no existan ya (mismo documento o, si no tiene, mismo nombre),
para que no se pierda ningún dato de contacto.
"""
import re

from django.db import migrations


def _tipo_documento(doc):
    return 'RUC' if re.fullmatch(r'\d{11}', doc or '') else 'DNI'


def migrar_clientes_fiado(apps, schema_editor):
    ClienteFiado = apps.get_model('fiados', 'ClienteFiado')
    Cliente = apps.get_model('clientes', 'Cliente')
    MovimientoEstadoCliente = apps.get_model('clientes', 'MovimientoEstadoCliente')

    for legacy in ClienteFiado.objects.all().order_by('id'):
        doc = (legacy.documento or '').strip()[:20]
        existentes = Cliente.objects.filter(empresa_id=legacy.empresa_id)
        if doc and existentes.filter(numero_documento=doc).exists():
            continue
        if not doc and existentes.filter(nombre__iexact=legacy.nombre.strip()).exists():
            continue

        numero = doc or f'FIADO-{legacy.id:06d}'
        if existentes.filter(numero_documento=numero).exists():
            numero = f'FIADO-{legacy.id:06d}'

        nuevo = Cliente.objects.create(
            empresa_id=legacy.empresa_id,
            nombre=legacy.nombre.strip()[:200],
            tipo_cliente='EMPRESA' if _tipo_documento(doc) == 'RUC' else 'PERSONA_NATURAL',
            tipo_documento=_tipo_documento(doc),
            numero_documento=numero,
            telefono=(legacy.telefono or '')[:20] or None,
            direccion=legacy.direccion,
            activo=legacy.activo,
        )
        nota = 'Migrado automáticamente desde "Clientes Fiados" (módulo legacy).'
        if legacy.notas:
            nota += f' Notas originales: {legacy.notas}'
        MovimientoEstadoCliente.objects.create(
            cliente=nuevo, estado_anterior='—', estado_nuevo='Activo' if legacy.activo else 'Inactivo',
            notas=nota[:1000],
        )


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0006_movimientoestadocliente_usuario'),
        ('fiados', '0008_alter_fiado_cliente_alter_historialfiado_cliente'),
    ]

    operations = [
        migrations.RunPython(migrar_clientes_fiado, migrations.RunPython.noop),
        migrations.DeleteModel(name='ClienteFiado'),
    ]
