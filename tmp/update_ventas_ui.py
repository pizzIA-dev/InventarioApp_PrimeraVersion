import sys
import os

path = r'd:\PROYECTOPROGRAMACION\ProyectoInventario\frontend\src\pages\Ventas.jsx'
if not os.path.exists(path):
    print(f"File not found: {path}")
    sys.exit(1)

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Update Table Header (Product Tab)
header_start = -1
for i, line in enumerate(lines):
    if '<thead>' in line and i > 700 and 'Nro' in lines[i+2]:
        header_start = i
        break

if header_start != -1:
    new_header = [
        '            <thead>\n',
        '              <tr>\n',
        "                <th style={{ width: '110px' }}>Fecha</th>\n",
        "                <th style={{ width: '120px' }}>Comprobante</th>\n",
        '                <th>Cliente</th>\n',
        '                <th>Producto</th>\n',
        '                <th>Estado</th>\n',
        "                <th style={{ textAlign: 'right' }}>Total</th>\n",
        "                <th style={{ width: '120px' }}>Acciones</th>\n",
        '              </tr>\n',
        '            </thead>\n'
    ]
    lines[header_start:header_start+11] = new_header
    print("Header updated")

# 2. Update Table Rows (Product Tab)
row_map_start = -1
for i, line in enumerate(lines):
  if '{paginatedVentas.map((venta) => (' in line:
    row_map_start = i
    break

if row_map_start != -1:
  # Find the end of the row
  row_end = -1
  for i in range(row_map_start, len(lines)):
    if '</tr>' in lines[i]:
      row_end = i
      break
  
  if row_end != -1:
    # <tr> starts at row_map_start + 1
    # </tr> ends at row_end
    new_row = [
        '                <tr key={venta.id}>\n',
        '                  <td>{new Date(venta.creado_en).toLocaleDateString()}</td>\n',
        "                  <td>{venta.numero_comprobante || 'S/N'}</td>\n",
        "                  <td>{venta.cliente_nombre || 'Cliente General'}</td>\n",
        '                  <td style={{ textAlign: "center" }}>\n',
        '                    <button \n',
        '                      className="btn btn-secondary" \n',
        '                      style={{ padding: "4px 8px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}\n',
        '                      onClick={() => openDetailModal(venta)}\n',
        '                      title="Ver Detalle"\n',
        '                    >\n',
        '                      <OrderedListOutlined />\n',
        '                      <span>Productos</span>\n',
        '                    </button>\n',
        '                  </td>\n',
        '                  <td>\n',
        '                    <span className={`badge ${\n',
        '                      venta.estado === "CONFIRMADA" ? "badge-success" :\n',
        '                      venta.estado === "CANCELADA" ? "badge-danger" : "badge-warning"\n',
        '                    }`}>\n',
        '                      {venta.estado}\n',
        '                    </span>\n',
        '                  </td>\n',
        '                  <td style={{ textAlign: "right", fontWeight: "bold" }}>S/. {Number(venta.total || 0).toFixed(2)}</td>\n',
        '                  <td style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>\n',
        '                    {venta.estado === "BORRADOR" && (\n',
        '                      <button className="btn btn-success" onClick={() => handleConfirmar(venta.id)} title="Confirmar venta">\n',
        '                        <CheckOutlined />\n',
        '                      </button>\n',
        '                    )}\n',
        '                    <button className="btn btn-secondary" onClick={() => openModal("edit", venta)} title="Editar">\n',
        '                      <EditOutlined />\n',
        '                    </button>\n',
        '                    <button className="btn btn-danger" onClick={() => handleDeleteClick(venta)} title="Eliminar">\n',
        '                      <DeleteOutlined />\n',
        '                    </button>\n',
        '                  </td>\n',
        '                </tr>\n'
    ]
    lines[row_map_start+1:row_end+1] = new_row
    print("Row map updated")

# 3. Add Detail Modal
modal_insert_point = -1
for i, line in enumerate(lines):
    if 'export default Ventas;' in line:
        modal_insert_point = i - 1
        break

if modal_insert_point != -1:
    modal_code = [
        '      {/* Modal de Detalle de Venta */}\n',
        '      {detailModalVisible && selectedVentaForDetail && (\n',
        '        <div className="modal-overlay" onClick={closeDetailModal} style={{ zIndex: 1100 }}>\n',
        '          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "900px" }}>\n',
        '            <div className="modal-header">\n',
        '              <h3 className="modal-title">Detalle de Venta #{selectedVentaForDetail.id}</h3>\n',
        '              <button className="modal-close" onClick={closeDetailModal}>×</button>\n',
        '            </div>\n',
        '            <div className="modal-body" style={{ padding: "24px" }}>\n',
        '              <div className="grid grid-2" style={{ marginBottom: "24px", background: "var(--bg-body)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>\n',
        '                <div>\n',
        '                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Cliente</div>\n',
        '                  <div style={{ fontWeight: "bold", fontSize: "16px" }}>{selectedVentaForDetail.cliente_nombre || "Cliente General"}</div>\n',
        '                </div>\n',
        '                <div style={{ textAlign: "right" }}>\n',
        '                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Comprobante</div>\n',
        '                  <div style={{ fontWeight: "bold" }}>{selectedVentaForDetail.tipo_comprobante || "VENTA"}: {selectedVentaForDetail.numero_comprobante || "S/N"}</div>\n',
        '                  <div style={{ fontSize: "13px" }}>Fecha: {new Date(selectedVentaForDetail.creado_en).toLocaleDateString()}</div>\n',
        '                </div>\n',
        '              </div>\n',
        '\n',
        '              <div className="table-container" style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>\n',
        '                <table style={{ width: "100%", borderCollapse: "collapse" }}>\n',
        '                  <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--bg-table-header)" }}>\n',
        '                    <tr>\n',
        '                      <th style={{ padding: "12px", borderBottom: "2px solid var(--border-color)" }}>Producto</th>\n',
        '                      <th style={{ padding: "12px", borderBottom: "2px solid var(--border-color)", textAlign: "center" }}>Cant.</th>\n',
        '                      <th style={{ padding: "12px", borderBottom: "2px solid var(--border-color)", textAlign: "right" }}>P. Unitario</th>\n',
        '                      <th style={{ padding: "12px", borderBottom: "2px solid var(--border-color)", textAlign: "right" }}>Desc.</th>\n',
        '                      <th style={{ padding: "12px", borderBottom: "2px solid var(--border-color)", textAlign: "right" }}>Subtotal</th>\n',
        '                    </tr>\n',
        '                  </thead>\n',
        '                  <tbody>\n',
        '                    {selectedVentaForDetail.detalle?.map((item, idx) => {\n',
        '                      const prod = productos.find(p => p.id === item.producto);\n',
        '                      return (\n',
        '                        <tr key={idx}>\n',
        '                          <td style={{ padding: "12px", borderBottom: "1px solid var(--border-color)" }}>\n',
        '                            <div style={{ fontWeight: 500 }}>{prod?.nombre || "Producto"}</div>\n',
        '                            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Código: {prod?.codigo || "S/C"}</div>\n',
        '                          </td>\n',
        '                          <td style={{ padding: "12px", borderBottom: "1px solid var(--border-color)", textAlign: "center" }}>{item.cantidad}</td>\n',
        '                          <td style={{ padding: "12px", borderBottom: "1px solid var(--border-color)", textAlign: "right" }}>S/. {Number(item.precio_venta).toFixed(2)}</td>\n',
        '                          <td style={{ padding: "12px", borderBottom: "1px solid var(--border-color)", textAlign: "right" }}>S/. {Number(item.descuento || 0).toFixed(2)}</td>\n',
        '                          <td style={{ padding: "12px", borderBottom: "1px solid var(--border-color)", textAlign: "right" }}>S/. {((Number(item.cantidad) * Number(item.precio_venta)) - Number(item.descuento || 0)).toFixed(2)}</td>\n',
        '                        </tr>\n',
        '                      );\n',
        '                    })}\n',
        '                  </tbody>\n',
        '                </table>\n',
        '              </div>\n',
        '              <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>\n',
        '                 <div style={{ display: "flex", gap: "40px", fontSize: "14px" }}>\n',
        '                    <span style={{ color: "var(--text-secondary)" }}>Descuento Global:</span>\n',
        '                    <span style={{ fontWeight: 600 }}>S/. {Number(selectedVentaForDetail.descuento || 0).toFixed(2)}</span>\n',
        '                 </div>\n',
        '                 <div style={{ display: "flex", gap: "40px", fontSize: "14px" }}>\n',
        '                    <span style={{ color: "var(--text-secondary)" }}>Impuesto:</span>\n',
        '                    <span style={{ fontWeight: 600 }}>S/. {Number(selectedVentaForDetail.impuesto || 0).toFixed(2)}</span>\n',
        '                 </div>\n',
        '                 <div style={{ display: "flex", gap: "40px", fontSize: "18px", borderTop: "2px solid var(--border-color)", paddingTop: "8px", marginTop: "4px" }}>\n',
        '                    <span style={{ fontWeight: "bold" }}>Total:</span>\n',
        '                    <span style={{ fontWeight: "bold", color: "var(--accent, #1677ff)" }}>S/. {Number(selectedVentaForDetail.total).toFixed(2)}</span>\n',
        '                 </div>\n',
        '              </div>\n',
        '            </div>\n',
        '            <div className="modal-footer">\n',
        '              <button className="btn btn-secondary" onClick={closeDetailModal}>Cerrar</button>\n',
        '              <button className="btn btn-primary" onClick={() => window.print()}>\n',
        '                <DownloadOutlined /> Imprimir\n',
        '              </button>\n',
        '            </div>\n',
        '          </div>\n',
        '        </div>\n',
        '      )}\n'
    ]
    # Insert before the last div closing or before export
    # export default Ventas; is usually around the end.
    # The last closing tag of function skip.
    lines[modal_insert_point:modal_insert_point] = modal_code
    print("Modal added")

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("File written successfully")
