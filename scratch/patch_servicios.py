import os

def patch_file():
    filepath = "apps/servicios/views.py"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. exportar_kardex (line 161)
    content = content.replace(
        "headers = ['Fecha', 'Tipo', 'Costo de Servicio Anterior (S/.)', 'Costo de Servicio Nuevo (S/.)', 'Precio de Servicio Anterior (S/.)', 'Precio de Servicio Nuevo (S/.)', 'Estado', 'Notas']",
        "headers = ['Fecha', 'Tipo', 'Costo de Servicio Anterior (S/.)', 'Costo de Servicio Nuevo (S/.)', 'Precio de Servicio Anterior (S/.)', 'Precio de Servicio Nuevo (S/.)', 'Estado', 'Responsable', 'Notas']"
    )
    content = content.replace(
        """            if mv.activo_nuevo is True:
                estado_str = f"Activo desde {fecha_str}"
            elif mv.activo_nuevo is False:
                estado_str = f"Inactivo desde {fecha_str}"
            else:
                estado_str = '-'""",
        """            if mv.activo_nuevo is True:
                estado_str = f"Activo desde {fecha_str}"
            elif mv.activo_nuevo is False:
                estado_str = f"Inactivo desde {fecha_str}"
            else:
                estado_str = '-'
                
            usuario_str = f"{mv.usuario.get_full_name() or mv.usuario.username} ({mv.usuario.perfil.get_rol_display() if hasattr(mv.usuario, 'perfil') else '-'})" if hasattr(mv, 'usuario') and mv.usuario else "Sistema"
"""
    )
    content = content.replace(
        """                estado_str,
                mv.notas or ''""",
        """                estado_str,
                usuario_str,
                mv.notas or ''"""
    )

    # 2. exportar_historial_global (kardex)
    content = content.replace(
        "headers = ['Fecha', 'Servicio', 'Descripción', 'Tipo', 'Costo Anterior (S/.)', 'Costo Nuevo (S/.)', 'Precio Anterior (S/.)', 'Precio Nuevo (S/.)', 'Estado', 'Notas']",
        "headers = ['Fecha', 'Servicio', 'Descripción', 'Tipo', 'Costo Anterior (S/.)', 'Costo Nuevo (S/.)', 'Precio Anterior (S/.)', 'Precio Nuevo (S/.)', 'Estado', 'Responsable', 'Notas']"
    )

    # 3. exportar_historial (ventas)
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
    content = content.replace(
        """                e.estado_nuevo,
                e.notas or ''""",
        """                e.estado_nuevo,
                f"{e.usuario.get_full_name() or e.usuario.username} ({e.usuario.perfil.get_rol_display() if hasattr(e.usuario, 'perfil') else '-'})" if hasattr(e, 'usuario') and e.usuario else "Sistema",
                e.notas or ''"""
    )

    # 4. exportar_historial_global (ventas, line 518)
    content = content.replace(
        """        headers_estados = [
            'Fecha', 'Comprobante Simple', 'Comprobante', 'Cliente',
            'Estado Anterior', 'Estado Nuevo', 'Notas'
        ]""",
        """        headers_estados = [
            'Fecha', 'Comprobante Simple', 'Comprobante', 'Cliente',
            'Estado Anterior', 'Estado Nuevo', 'Responsable', 'Notas'
        ]"""
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

patch_file()
print("Servicios patched successfully!")
