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

# FiadoHistorialModal
replace_in_file(r'd:\PROYECTOPROGRAMACION\ProyectoInventario\frontend\src\components\fiados\FiadoHistorialModal.jsx', [
    (
        "<td colSpan=\"5\" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>Cargando historial...</td>",
        "<td colSpan=\"7\" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>Cargando historial...</td>"
    ),
    (
        "<td colSpan=\"5\" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>\n                      No se encontraron movimientos.\n                    </td>",
        "<td colSpan=\"7\" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>\n                      No se encontraron movimientos.\n                    </td>"
    ),
    (
        "<td style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-secondary)' }}>\n                         {h.usuario_nombre && h.usuario_rol ? `${h.usuario_nombre} (${h.usuario_rol})` : 'Sistema'}\n                      </td>\n                      <td style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-secondary)' }}>\n                        {h.notas || '-'}\n                      </td>",
        "<td style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-secondary)' }}>\n                        {h.notas || '-'}\n                      </td>\n                      <td style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-secondary)' }}>\n                         {h.usuario_nombre && h.usuario_rol ? `${h.usuario_nombre} (${h.usuario_rol})` : 'Sistema'}\n                      </td>"
    )
])

# ClienteFiadoHistorialModal
replace_in_file(r'd:\PROYECTOPROGRAMACION\ProyectoInventario\frontend\src\components\fiados\ClienteFiadoHistorialModal.jsx', [
    (
        "<th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Responsable</th>\n                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Notas</th>",
        "<th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Notas</th>\n                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Responsable</th>"
    ),
    (
        "<td colSpan=\"6\" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>Cargando historial global...</td>",
        "<td colSpan=\"8\" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>Cargando historial global...</td>"
    ),
    (
        "<td colSpan=\"6\" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>\n                      No se encontraron abonos o cargos en este cliente.\n                    </td>",
        "<td colSpan=\"8\" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>\n                      No se encontraron abonos o cargos en este cliente.\n                    </td>"
    ),
    (
        "<td style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-secondary)' }}>\n                         {h.usuario_nombre && h.usuario_rol ? `${h.usuario_nombre} (${h.usuario_rol})` : 'Sistema'}\n                      </td>\n                      <td style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-secondary)' }}>\n                        {h.notas || '-'}\n                      </td>",
        "<td style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-secondary)' }}>\n                        {h.notas || '-'}\n                      </td>\n                      <td style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-secondary)' }}>\n                         {h.usuario_nombre && h.usuario_rol ? `${h.usuario_nombre} (${h.usuario_rol})` : 'Sistema'}\n                      </td>"
    )
])

print('Fiados tables rearranged.')
