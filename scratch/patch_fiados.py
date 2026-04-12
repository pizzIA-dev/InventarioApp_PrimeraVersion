import os

def patch_file():
    filepath = "apps/fiados/views.py"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. exportar_historial de FiadosClienteViewSet
    content = content.replace(
        """        headers = [
            'ID Fiado', 'Tipo Operación', 'Fecha Movimiento', 'Fecha Límite',
            'Total Deuda (S/.)', 'Abono Realizado (S/.)', 'Saldo Pendiente (S/.)', 
            'Estado', 'Notas'
        ]""",
        """        headers = [
            'ID Fiado', 'Tipo Operación', 'Fecha Movimiento', 'Fecha Límite',
            'Total Deuda (S/.)', 'Abono Realizado (S/.)', 'Saldo Pendiente (S/.)', 
            'Estado', 'Responsable', 'Notas'
        ]"""
    )
    content = content.replace(
        """                h.estado_nuevo,
                h.notes or ''""",
        """                h.estado_nuevo,
                f"{h.usuario.get_full_name() or h.usuario.username} ({h.usuario.perfil.get_rol_display() if hasattr(h.usuario, 'perfil') else '-'})" if hasattr(h, 'usuario') and h.usuario else "Sistema",
                h.notes or ''"""
    )

    # 2. exportar_historial de FiadoViewSet
    content = content.replace(
        """        headers = [
            'Fecha Movimiento', 'Fecha Límite', 'Total Deuda (S/.)', 
            'Abono Registrado (S/.)', 'Saldo Pendiente (S/.)', 
            'Estado Resultante', 'Notas'
        ]""",
        """        headers = [
            'Fecha Movimiento', 'Fecha Límite', 'Total Deuda (S/.)', 
            'Abono Registrado (S/.)', 'Saldo Pendiente (S/.)', 
            'Estado Resultante', 'Responsable', 'Notas'
        ]"""
    )
    content = content.replace(
        """                h.estado_nuevo,
                h.notas or ''""",
        """                h.estado_nuevo,
                f"{h.usuario.get_full_name() or h.usuario.username} ({h.usuario.perfil.get_rol_display() if hasattr(h.usuario, 'perfil') else '-'})" if hasattr(h, 'usuario') and h.usuario else "Sistema",
                h.notas or ''"""
    )

    # 3. exportar_historial_global de FiadoViewSet
    content = content.replace(
        """        headers = [
            'Fecha Movimiento', 'ID Fiado', 'Cliente', 'Tipo Fiado', 
            'Fecha Límite Fiado', 'Total Deuda (S/.)', 'Abono Realizado (S/.)', 
            'Saldo Pendiente (S/.)', 'Nuevo Estado', 'Notas'
        ]""",
        """        headers = [
            'Fecha Movimiento', 'ID Fiado', 'Cliente', 'Tipo Fiado', 
            'Fecha Límite Fiado', 'Total Deuda (S/.)', 'Abono Realizado (S/.)', 
            'Saldo Pendiente (S/.)', 'Nuevo Estado', 'Responsable', 'Notas'
        ]"""
    )
    content = content.replace(
        """                h.estado_nuevo,
                h.notes or ''""",
        """                h.estado_nuevo,
                f"{h.usuario.get_full_name() or h.usuario.username} ({h.usuario.perfil.get_rol_display() if hasattr(h.usuario, 'perfil') else '-'})" if hasattr(h, 'usuario') and h.usuario else "Sistema",
                h.notes or ''"""
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

patch_file()
print("Fiados patched successfully!")
