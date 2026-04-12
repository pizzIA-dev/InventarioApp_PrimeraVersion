import os

def patch_clientes_views():
    filepath = r"d:\PROYECTOPROGRAMACION\ProyectoInventario\apps\clientes\views.py"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # --- 1. exportar_historial ---

    # Hoja 1: Estados (Headers line 340)
    content = content.replace(
        "headers_estados = ['Fecha', 'Tipo de Evento', 'Estado Anterior', 'Estado Nuevo', 'Notas']",
        "headers_estados = ['Fecha', 'Tipo de Evento', 'Estado Anterior', 'Estado Nuevo', 'Responsable', 'Notas']"
    )
    # Row (line 348)
    content = content.replace(
        """                e.estado_nuevo,
                e.notas
            ])""",
        """                e.estado_nuevo,
                f"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})" if e.usuario else "Sistema",
                e.notas
            ])"""
    )

    # Hoja 2: Productos (Headers line 357)
    content = content.replace(
        "'Código', 'Cant.', 'P. Unit. (S/.)', 'Subtotal (S/.)', 'Desc. (S/.)', 'Impuesto (S/.)', 'Total (S/.)'",
        "'Código', 'Cant.', 'P. Unit. (S/.)', 'Subtotal (S/.)', 'Desc. (S/.)', 'Impuesto (S/.)', 'Responsable', 'Total (S/.)'"
    )
    # Row (line 378)
    content = content.replace(
        """                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto)
            ])""",
        """                f"{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})" if v.usuario else "Sistema",
                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto)
            ])"""
    )

    # Hoja 3: Servicios (Headers line 387)
    content = content.replace(
        "'Servicio', 'Precio Serv. (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)'",
        "'Servicio', 'Precio Serv. (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Responsable', 'Total (S/.)'"
    )
    # Row (line 404)
    content = content.replace(
        "float(v.precio), float(v.descuento), float(v.impuesto), float(v.total)",
        "float(v.precio), float(v.descuento), float(v.impuesto), f'{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})' if v.usuario else 'Sistema', float(v.total)"
    )

    # --- 2. exportar_historial_global ---

    # Hoja 1: Estados (Headers line 458)
    content = content.replace(
        """        headers_estados = [
            'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente',
            'Estado Anterior', 'Estado Nuevo', 'Notas'
        ]""",
        """        headers_estados = [
            'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente',
            'Estado Anterior', 'Estado Nuevo', 'Responsable', 'Notas'
        ]"""
    )
    # Row (line 473)
    content = content.replace(
        """                l_t, l_n, comp_cliente, e.estado_anterior, e.estado_nuevo, e.notas
            ])""",
        """                l_t, l_n, comp_cliente, e.estado_anterior, e.estado_nuevo, f"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})" if e.usuario else "Sistema", e.notas
            ])"""
    )

    # Hoja 2: Productos (Headers line 478)
    content = content.replace(
        "'Producto', 'Código de Producto', 'Cantidad', 'Precio Unitario (S/.)', \n            'Subtotal (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)'",
        "'Producto', 'Código de Producto', 'Cantidad', 'Precio Unitario (S/.)', \n            'Subtotal (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Responsable', 'Total (S/.)'"
    )
    # Row (line 498)
    content = content.replace(
        """                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto)
            ])""",
        """                f"{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})" if v.usuario else "Sistema",
                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto)
            ])"""
    )

    # Hoja 3: Servicios (Headers line 507)
    content = content.replace(
        "'Estado', 'Servicio', 'Precio Serv. (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)'",
        "'Estado', 'Servicio', 'Precio Serv. (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Responsable', 'Total (S/.)'"
    )
    # Row (line 523)
    content = content.replace(
        "float(v.precio), float(v.descuento), float(v.impuesto), float(v.total)",
        "float(v.precio), float(v.descuento), float(v.impuesto), f'{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})' if v.usuario else 'Sistema', float(v.total)"
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

patch_clientes_views()
print("Clientes views patched.")
