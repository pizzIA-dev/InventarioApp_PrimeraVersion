import React from 'react';

const CompraDetailModal = ({ visible, compra, onClose }) => {
  if (!visible || !compra) return null;

  const calcularSubtotalFila = (item) => {
    const cant = Number(item.cantidad || 0);
    const prec = Number(item.precio_compra || 0);
    const desc = Number(item.descuento || 0);
    const total = (cant * prec) - desc;
    return Math.max(0, total);
  };

  const totalCalculado = (compra.detalle || []).reduce((sum, d) => sum + calcularSubtotalFila(d), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Detalle de Compra: {compra.numero_comprobante || `#${compra.id}`}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="grid grid-2" style={{ marginBottom: '24px' }}>
            <div>
              <p><strong>Proveedor:</strong> {compra.proveedor_nombre || 'Proveedor General'}</p>
              <p><strong>Tipo:</strong> {compra.tipo_compra}</p>
              <p><strong>Estado:</strong> <span className={`badge ${compra.estado === 'CONFIRMADA' ? 'badge-success' : 'badge-warning'}`}>{compra.estado}</span></p>
            </div>
            <div>
              <p><strong>Fecha Registro:</strong> {new Date(compra.creado_en).toLocaleString()}</p>
              <p><strong>Comprobante:</strong> {compra.tipo_comprobante} {compra.numero_comprobante}</p>
              <p><strong>Responsable:</strong> {compra.usuario_nombre ? `${compra.usuario_nombre} (${compra.usuario_rol || '-'})` : 'Sistema'}</p>
            </div>
          </div>

          <h4 style={{ marginBottom: '12px' }}>Listado de Productos</h4>
          <div className="table-container" style={{ border: '1px solid var(--border-color)' }}>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style={{ width: '80px' }}>Cant.</th>
                  <th style={{ width: '100px' }}>P. Compra</th>
                  <th style={{ width: '80px' }}>Desc.</th>
                  <th style={{ width: '100px' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(compra.detalle || []).map((d, index) => (
                  <tr key={index}>
                    <td>{d.producto_nombre || `ID: ${d.producto}`}</td>
                    <td>{d.cantidad}</td>
                    <td>S/. {Number(d.precio_compra).toFixed(2)}</td>
                    <td>S/. {Number(d.descuento).toFixed(2)}</td>
                    <td style={{ fontWeight: 600 }}>S/. {calcularSubtotalFila(d).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ float: 'right', width: '250px', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 600 }}>S/. {totalCalculado.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Impuestos / Otros:</span>
              <span style={{ fontWeight: 600 }}>S/. {Number(compra.impuesto || 0).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border-color)', paddingTop: '10px', fontSize: '18px' }}>
              <span style={{ fontWeight: 700 }}>TOTAL:</span>
              <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>S/. {Number(compra.total || 0).toFixed(2)}</span>
            </div>
          </div>
          <div style={{ clear: 'both' }}></div>

          {compra.notas && (
            <div style={{ marginTop: '20px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>Notas:</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{compra.notas}</p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default CompraDetailModal;
