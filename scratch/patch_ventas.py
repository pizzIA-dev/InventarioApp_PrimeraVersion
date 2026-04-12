import os

def patch_file():
    filepath = "apps/ventas/views.py"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. exportar_historial
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

    # 2. exportar_historial_global (kardex) line 469
    # check first where headers_estados is defined there
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
print("Ventas patched successfully!")
