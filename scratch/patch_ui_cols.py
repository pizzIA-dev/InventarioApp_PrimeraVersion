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

# ClienteHistoryModal
replace_in_file(r'd:\PROYECTOPROGRAMACION\ProyectoInventario\frontend\src\components\ClienteHistoryModal.jsx', [
    (
        "<td style={{ padding: '10px 12px', fontSize: '10px', color: 'var(--text-secondary)' }}>\n                               {record.usuario_nombre ? `${record.usuario_nombre} (${record.usuario_rol || '-'})` : 'Sistema'}\n                            </td>\n                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent)' }}>\n                              S/. { ( (record.cantidad ? (record.cantidad * record.precio_unitario) : Number(record.precio_servicio)) - (record.descuento || 0) + (Number(record.impuesto) || 0) ).toFixed(2) }\n                            </td>",
        "<td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent)' }}>\n                              S/. { ( (record.cantidad ? (record.cantidad * record.precio_unitario) : Number(record.precio_servicio)) - (record.descuento || 0) + (Number(record.impuesto) || 0) ).toFixed(2) }\n                            </td>\n                            <td style={{ padding: '10px 12px', fontSize: '10px', color: 'var(--text-secondary)' }}>\n                               {record.usuario_nombre ? `${record.usuario_nombre} (${record.usuario_rol || '-'})` : 'Sistema'}\n                            </td>"
    )
])

# VentaHistoryModal
replace_in_file(r'd:\PROYECTOPROGRAMACION\ProyectoInventario\frontend\src\components\VentaHistoryModal.jsx', [
    (
        "<th style={{ whiteSpace: 'nowrap' }}>Responsable</th>\n                        <th>Notas</th>",
        "<th>Notas</th>\n                        <th style={{ whiteSpace: 'nowrap' }}>Responsable</th>"
    ),
    (
        "<td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>\n                             {h.usuario_nombre && h.usuario_rol ? `${h.usuario_nombre} (${h.usuario_rol})` : 'Sistema'}\n                          </td>\n                          <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{h.notas}</td>",
        "<td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{h.notas}</td>\n                          <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>\n                             {h.usuario_nombre && h.usuario_rol ? `${h.usuario_nombre} (${h.usuario_rol})` : 'Sistema'}\n                          </td>"
    ),
    (
        "<th style={{ whiteSpace: 'nowrap' }}>Responsable</th>\n                          <th style={{ textAlign: 'right' }}>Total</th>",
        "<th style={{ textAlign: 'right' }}>Total</th>\n                          <th style={{ whiteSpace: 'nowrap' }}>Responsable</th>"
    ),
    (
        "<td style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>\n                               {s.usuario_nombre ? `${s.usuario_nombre} (${s.usuario_rol || '-'})` : 'Sistema'}\n                            </td>\n                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>S/. { ( (s.precio || 0) - (s.descuento || 0) + (Number(s.impuesto) || 0) ).toFixed(2) }</td>",
        "<td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>S/. { ( (s.precio || 0) - (s.descuento || 0) + (Number(s.impuesto) || 0) ).toFixed(2) }</td>\n                            <td style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>\n                               {s.usuario_nombre ? `${s.usuario_nombre} (${s.usuario_rol || '-'})` : 'Sistema'}\n                            </td>"
    ),
    (
        "<td style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>\n                               {p.usuario_nombre ? `${p.usuario_nombre} (${p.usuario_rol || '-'})` : 'Sistema'}\n                             </td>\n                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>S/. {( (p.cantidad * p.precio_unitario) - (p.descuento || 0) + (Number(p.impuesto) || 0) ).toFixed(2)}</td>",
        "<td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>S/. {( (p.cantidad * p.precio_unitario) - (p.descuento || 0) + (Number(p.impuesto) || 0) ).toFixed(2)}</td>\n                             <td style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>\n                               {p.usuario_nombre ? `${p.usuario_nombre} (${p.usuario_rol || '-'})` : 'Sistema'}\n                             </td>"
    )
])

# ServicioHistoryModal
replace_in_file(r'd:\PROYECTOPROGRAMACION\ProyectoInventario\frontend\src\components\ServicioHistoryModal.jsx', [
    (
        "<th style={{ whiteSpace: 'nowrap' }}>Responsable</th>\n                      <th>Notas</th>",
        "<th>Notas</th>\n                      <th style={{ whiteSpace: 'nowrap' }}>Responsable</th>"
    ),
    (
        "<td style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>\n                            {h.usuario_nombre ? `${h.usuario_nombre} (${h.usuario_rol || '-'})` : 'Sistema'}\n                          </td>\n                          <td style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{h.notas}</td>",
        "<td style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{h.notas}</td>\n                          <td style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>\n                            {h.usuario_nombre ? `${h.usuario_nombre} (${h.usuario_rol || '-'})` : 'Sistema'}\n                          </td>"
    )
])


print('UI tables rearranged.')
