import os

def patch_ventas_views():
    filepath = r"d:\PROYECTOPROGRAMACION\ProyectoInventario\apps\ventas\views.py"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update exportar headers
    content = content.replace(
        """        headers = [
            'ID', 'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente', 'Estado',
            'Subtotal (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)'
        ]""",
        """        headers = [
            'ID', 'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente', 'Estado',
            'Responsable', 'Subtotal (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)'
        ]"""
    )

    # Update exportar row
    content = content.replace(
        """            rows_ventas_item = [
                obj.id,
                timezone.localtime(obj.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE",
                obj.numero_comprobante_simple or "",
                legal_tipo,
                legal_num,
                obj.cliente_nombre or (obj.cliente.nombre if obj.cliente else 'Sin Cliente'),
                obj.get_estado_display(),
                gross_subtotal,
                total_descuento,
                float(obj.impuesto),
                float(obj.total)
            ]""",
        """            usuario_str = f"{obj.usuario.get_full_name() or obj.usuario.username} ({obj.usuario.perfil.get_rol_display() if hasattr(obj.usuario, 'perfil') else '-'})" if obj.usuario else "Sistema"
            rows_ventas_item = [
                obj.id,
                timezone.localtime(obj.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE",
                obj.numero_comprobante_simple or "",
                legal_tipo,
                legal_num,
                obj.cliente_nombre or (obj.cliente.nombre if obj.cliente else 'Sin Cliente'),
                obj.get_estado_display(),
                usuario_str,
                gross_subtotal,
                total_descuento,
                float(obj.impuesto),
                float(obj.total)
            ]"""
    )

    # 2. Update exportar_historial Sheet 1 (Estados) row injection
    content = content.replace(
        """                e.estado_nuevo,
                e.notas
            ] for e in estados""",
        """                e.estado_nuevo,
                f"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})" if e.usuario else "Sistema",
                e.notas
            ] for e in estados"""
    )
    
    # 3. Update exportar_historial Sheet 2 (Productos) headers
    content = content.replace(
        "'Producto', 'Código', 'Cant.', 'P. Unit. (S/.)', 'Subtotal (S/.)', 'Desc. (S/.)', 'Impuesto (S/.)', 'Total (S/.)'",
        "'Producto', 'Código', 'Cant.', 'P. Unit. (S/.)', 'Subtotal (S/.)', 'Desc. (S/.)', 'Impuesto (S/.)', 'Responsable', 'Total (S/.)'"
    )
    
    # Update row
    content = content.replace(
        """                float(v.impuesto),
                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto)
            ] for d in detalles""",
        """                float(v.impuesto),
                f"{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})" if v.usuario else "Sistema",
                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto)
            ] for d in detalles"""
    )

    # 4. Update exportar_historial_global Sheet 1 (Estados) row
    content = content.replace(
        """                e.estado_nuevo,
                e.notas
            ])""",
        """                e.estado_nuevo,
                f"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})" if e.usuario else "Sistema",
                e.notas
            ])"""
    )

    # 5. Update exportar_historial_global Sheet 2 (Productos) headers
    # (Using the same replacement as above, it should work if it's identical)
    
    # Update row
    content = content.replace(
        """                float(v.impuesto), 
                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto)
            ])""",
        """                float(v.impuesto),
                f"{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})" if v.usuario else "Sistema",
                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto)
            ])"""
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

patch_ventas_views()
print("Ventas views patched.")
