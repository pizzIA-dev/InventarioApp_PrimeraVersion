import React from 'react';

const FiadoDetailModal = ({ visible, fiado, onClose }) => {
  if (!visible || !fiado) return null;

  const isProducto = fiado.tipo === 'PRODUCTO';
  const detalles = isProducto ? (fiado.detalles_producto || []) : (fiado.detalles_servicio || []);

  const getEstadoBadge = (estado) => {
    switch(estado) {
      case 'PENDIENTE': return <span className="badge badge-danger">Pendiente</span>;
      case 'PAGADO_PARCIAL': return <span className="badge badge-warning">Abono Parcial</span>;
      case 'LIQUIDADO': return <span className="badge badge-success">Liquidado</span>;
      case 'CANCELADO': return <span className="badge badge-info">Cancelado</span>;
      default: return <span className="badge">{estado}</span>;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
        <div className="modal-header">
          <h3 className="modal-title">Detalle de Fiado #{fiado.id.toString().padStart(6, '0')}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="grid grid-2" style={{ marginBottom: '24px' }}>
            <div>
              <p><strong>Cliente:</strong> {fiado.cliente_nombre}</p>
              <p><strong>Tipo:</strong> <span className="badge badge-info">{fiado.tipo}</span></p>
              <p><strong>Estado:</strong> {getEstadoBadge(fiado.estado)}</p>
            </div>
            <div>
              <p><strong>Fecha Registro:</strong> {new Date(fiado.creado_en).toLocaleString()}</p>
              {fiado.fecha_limite && (
                <p><strong>Fecha Límite:</strong> <span style={{ color: new Date(fiado.fecha_limite) < new Date() && fiado.estado !== 'LIQUIDADO' ? 'var(--danger-color)' : 'inherit', fontWeight: '600' }}>
                  {new Date(fiado.fecha_limite + 'T12:00:00').toLocaleDateString()}
                </span></p>
              )}
              <p><strong>Saldo Pendiente:</strong> <span style={{ color: 'var(--danger-color)', fontWeight: '700' }}>S/. {Number(fiado.saldo_pendiente).toFixed(2)}</span></p>
            </div>
          </div>

          <h4 style={{ marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', fontSize: '16px', fontWeight: '600' }}>
            {isProducto ? 'Listado de Productos' : 'Listado de Servicios'}
          </h4>
          <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px' }}>{isProducto ? 'Producto' : 'Servicio'}</th>
                  {isProducto && <th style={{ width: '80px', textAlign: 'center' }}>Cant.</th>}
                  <th style={{ width: '120px', textAlign: 'right' }}>{isProducto ? 'P. Unidad' : 'Precio'}</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Desc.</th>
                  <th style={{ width: '120px', textAlign: 'right', paddingRight: '12px' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalles.map((d, index) => (
                  <tr key={index}>
                    <td style={{ padding: '10px 12px' }}>{isProducto ? (d.producto_nombre || `ID: ${d.producto}`) : (d.servicio_nombre || `ID: ${d.servicio}`)}</td>
                    {isProducto && <td style={{ textAlign: 'center' }}>{d.cantidad}</td>}
                    <td style={{ textAlign: 'right' }}>S/. {Number(isProducto ? d.precio_unidad : d.precio).toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>S/. {Number(d.descuento || 0).toFixed(2)}</td>
                    <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '12px' }}>S/. {Number(d.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ float: 'right', width: '280px', marginTop: '20px', background: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
              <span style={{ fontWeight: 600 }}>S/. {Number(fiado.subtotal || 0).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Impuestos (IGV):</span>
              <span style={{ fontWeight: 600 }}>S/. {Number(fiado.impuesto || 0).toFixed(2)}</span>
            </div>
            {Number(fiado.descuento || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'var(--danger-color)' }}>
                <span>Descuento Global:</span>
                <span style={{ fontWeight: 600 }}>- S/. {Number(fiado.descuento).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '5px', fontSize: '18px' }}>
              <span style={{ fontWeight: 700 }}>TOTAL DEUDA:</span>
              <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>S/. {Number(fiado.total || 0).toFixed(2)}</span>
            </div>
          </div>
          <div style={{ clear: 'both' }}></div>

          {fiado.notas && (
            <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderLeft: '4px solid var(--primary-color)', borderRadius: '4px' }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: 'var(--primary-color)' }}>Notas / Observaciones:</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{fiado.notas}</p>
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

export default FiadoDetailModal;
