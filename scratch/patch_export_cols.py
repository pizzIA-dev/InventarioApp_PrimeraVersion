import os

def replace_in_file(filepath, matches):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    for old, new in matches:
        if old in content:
            content = content.replace(old, new)
        else:
            print(f"[{filepath}] No se encontro: {old[:30]}...")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# apps/ventas/views.py
replace_in_file(r'd:\PROYECTOPROGRAMACION\ProyectoInventario\apps\ventas\views.py', [
    (
        "'Responsable', 'Subtotal (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)'",
        "'Subtotal (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable'"
    ),
    (
        "obj.get_estado_display(),\n                usuario_str,\n                gross_subtotal,\n                total_descuento,\n                float(obj.impuesto),\n                float(obj.total)",
        "obj.get_estado_display(),\n                gross_subtotal,\n                total_descuento,\n                float(obj.impuesto),\n                float(obj.total),\n                usuario_str"
    ),
    (
        "'Estado Anterior', 'Estado Nuevo', 'Responsable', 'Notas'",
        "'Estado Anterior', 'Estado Nuevo', 'Notas', 'Responsable'"
    ),
    (
        "e.estado_nuevo,\n                f\"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})\" if e.usuario else \"Sistema\",\n                e.notas",
        "e.estado_nuevo,\n                e.notas,\n                f\"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})\" if e.usuario else \"Sistema\""
    ),
    (
        "'Impuesto (S/.)', 'Responsable', 'Total (S/.)'",
        "'Impuesto (S/.)', 'Total (S/.)', 'Responsable'"
    ),
    (
        "float(v.impuesto),\n                f\"{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})\" if v.usuario else \"Sistema\",\n                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto)",
        "float(v.impuesto),\n                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto),\n                f\"{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})\" if v.usuario else \"Sistema\""
    )
])

# apps/clientes/views.py
replace_in_file(r'd:\PROYECTOPROGRAMACION\ProyectoInventario\apps\clientes\views.py', [
    (
        "'Estado Anterior', 'Estado Nuevo', 'Responsable', 'Notas'",
        "'Estado Anterior', 'Estado Nuevo', 'Notas', 'Responsable'"
    ),
    (
        "e.estado_nuevo,\n                f\"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})\" if e.usuario else \"Sistema\",\n                e.notas",
        "e.estado_nuevo,\n                e.notas,\n                f\"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})\" if e.usuario else \"Sistema\""
    ),
    (
        "e.estado_nuevo, f\"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})\" if e.usuario else \"Sistema\", e.notas",
        "e.estado_nuevo, e.notas, f\"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})\" if e.usuario else \"Sistema\""
    ),
    (
        "'Impuesto (S/.)', 'Responsable', 'Total (S/.)'",
        "'Impuesto (S/.)', 'Total (S/.)', 'Responsable'"
    ),
    (
        "f\"{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})\" if v.usuario else \"Sistema\",\n                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto)",
        "(float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto),\n                f\"{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})\" if v.usuario else \"Sistema\""
    ),
    (
        "float(v.impuesto), f'{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})' if v.usuario else 'Sistema', float(v.total)",
        "float(v.impuesto), float(v.total), f'{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})' if v.usuario else 'Sistema'"
    )
])

# apps/servicios/views.py
replace_in_file(r'd:\PROYECTOPROGRAMACION\ProyectoInventario\apps\servicios\views.py', [
    (
        "'Estado', 'Responsable', 'Notas'",
        "'Estado', 'Notas', 'Responsable'"
    ),
    (
        "'Estado Anterior', 'Estado Nuevo', 'Responsable', 'Notas'",
        "'Estado Anterior', 'Estado Nuevo', 'Notas', 'Responsable'"
    ),
    (
        "e.estado_nuevo,\n                f\"{getattr(e.usuario, 'get_full_name', lambda: '')() or e.usuario.username} ({e.usuario.perfil.get_rol_display()})\" if e.usuario and hasattr(e.usuario, 'perfil') else \"Sistema\",\n                e.notas",
        "e.estado_nuevo,\n                e.notas,\n                f\"{getattr(e.usuario, 'get_full_name', lambda: '')() or e.usuario.username} ({e.usuario.perfil.get_rol_display()})\" if e.usuario and hasattr(e.usuario, 'perfil') else \"Sistema\""
    )
])

# apps/inventario/views.py
replace_in_file(r'd:\PROYECTOPROGRAMACION\ProyectoInventario\apps\inventario\views.py', [
    (
        "'Estado', 'Responsable', 'Referencia', 'Notas'",
        "'Estado', 'Referencia', 'Notas', 'Responsable'"
    ),
    (
        "'Estado', 'Responsable', 'Notas'",
        "'Estado', 'Notas', 'Responsable'"
    ),
    (
        "m.get_estado_display(),\n                f\"{m.usuario.get_full_name() or m.usuario.username} ({m.usuario.perfil.get_rol_display() if hasattr(m.usuario, 'perfil') else '-'})\" if m.usuario else \"Sistema\",\n                m.notas",
        "m.get_estado_display(),\n                m.notas,\n                f\"{m.usuario.get_full_name() or m.usuario.username} ({m.usuario.perfil.get_rol_display() if hasattr(m.usuario, 'perfil') else '-'})\" if m.usuario else \"Sistema\""
    ),
    (
        "m.get_estado_display(),\n                f\"{m.usuario.get_full_name() or m.usuario.username} ({m.usuario.perfil.get_rol_display() if hasattr(m.usuario, 'perfil') else '-'})\" if m.usuario else \"Sistema\",\n                m.referencia,\n                m.notas",
        "m.get_estado_display(),\n                m.referencia,\n                m.notas,\n                f\"{m.usuario.get_full_name() or m.usuario.username} ({m.usuario.perfil.get_rol_display() if hasattr(m.usuario, 'perfil') else '-'})\" if m.usuario else \"Sistema\""
    )
])

# apps/fiados/views.py
replace_in_file(r'd:\PROYECTOPROGRAMACION\ProyectoInventario\apps\fiados\views.py', [
    (
        "'Estado', 'Responsable', 'Notas'",
        "'Estado', 'Notas', 'Responsable'"
    ),
    (
        "'Estado Resultante', 'Responsable', 'Notas'",
        "'Estado Resultante', 'Notas', 'Responsable'"
    ),
    (
        "'Nuevo Estado', 'Responsable', 'Notas'",
        "'Nuevo Estado', 'Notas', 'Responsable'"
    ),
    (
        "e.estado_resultante,\n                f\"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})\" if e.usuario else \"Sistema\",\n                e.notas",
        "e.estado_resultante,\n                e.notas,\n                f\"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})\" if e.usuario else \"Sistema\""
    ),
    (
        "e.nuevo_estado,\n                f\"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})\" if e.usuario else \"Sistema\",\n                e.notas",
        "e.nuevo_estado,\n                e.notas,\n                f\"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})\" if e.usuario else \"Sistema\""
    ),
    (
        "p.estado,\n                f\"{p.usuario.get_full_name() or p.usuario.username} ({p.usuario.perfil.get_rol_display() if hasattr(p.usuario, 'perfil') else '-'})\" if p.usuario else \"Sistema\",\n                p.notas",
        "p.estado,\n                p.notas,\n                f\"{p.usuario.get_full_name() or p.usuario.username} ({p.usuario.perfil.get_rol_display() if hasattr(p.usuario, 'perfil') else '-'})\" if p.usuario else \"Sistema\""
    )
])

print('Rearranged columns in all backend view files')
