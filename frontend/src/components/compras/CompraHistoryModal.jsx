import React, { useState, useEffect } from 'react';
import Pagination from '../Pagination';
import { HistoryOutlined, OrderedListOutlined, DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { comprasAPI } from '../../services/api';
import { message } from 'antd';

const CompraHistoryModal = ({ 
  visible, 
  compra, 
  onClose, 
  onFetchHistory, 
  onFetchKardex,
  historyData,
  kardexData,
  loading,
  currentPage,
  totalPages,
  totalItems
}) => {
  const [activeTab, setActiveTab] = useState('estados'); // 'estados', 'productos'
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    if (visible && compra) {
      if (activeTab === 'estados') {
        onFetchHistory(compra.id, 1, fechaDesde, fechaHasta);
      } else {
        onFetchKardex(compra.id, 1, fechaDesde, fechaHasta);
      }
    }
  }, [visible, activeTab, compra, fechaDesde, fechaHasta]);

  if (!visible || !compra) return null;

  const handlePageChange = (page) => {
    if (activeTab === 'estados') {
      onFetchHistory(compra.id, page, fechaDesde, fechaHasta);
    } else {
      onFetchKardex(compra.id, page, fechaDesde, fechaHasta);
    }
  };

  const handleExport = async () => {
    try {
      const response = await comprasAPI.exportarHistorialIndividual(compra.id);
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_compra_${compra.numero_comprobante || compra.id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al exportar historial:", error);
      message.error("Error al generar el archivo Excel");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px', width: '95vw' }}>
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <h3 className="modal-title">Historial de Compra</h3>
            <p className="modal-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              {compra.numero_comprobante || `#${compra.id}`} - {compra.proveedor_nombre || 'Proveedor General'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DownloadOutlined /> Exportar Excel
            </button>
            <button className="modal-close" onClick={onClose}><CloseOutlined /></button>
          </div>
        </div>

        <div className="modal-body" style={{ paddingTop: '0' }}>
          {/* Filters Bar */}
          <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Desde</label>
              <input type="date" className="form-input" style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }} value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Hasta</label>
              <input type="date" className="form-input" style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }} value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => activeTab === 'estados' ? onFetchHistory(compra.id, 1, fechaDesde, fechaHasta) : onFetchKardex(compra.id, 1, fechaDesde, fechaHasta)} 
                style={{ padding: '5px 14px', fontSize: '13px' }}
              >
                Filtrar
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => { setFechaDesde(''); setFechaHasta(''); }} 
                style={{ padding: '5px 14px', fontSize: '13px' }}
              >
                Limpiar
              </button>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'center' }}>
              {totalItems} registro{totalItems !== 1 ? 's' : ''} encontrados
            </div>
          </div>

          {/* Styled Tabs (Underline style) */}
          <div className="tabs" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '24px' }}>
            <button 
              className={`tab-item ${activeTab === 'estados' ? 'active' : ''}`}
              onClick={() => setActiveTab('estados')}
              style={{ 
                padding: '12px 4px', background: 'none', border: 'none', 
                color: activeTab === 'estados' ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'estados' ? '600' : '400',
                borderBottom: activeTab === 'estados' ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <HistoryOutlined /> Historial de Estados
            </button>
            <button 
              className={`tab-item ${activeTab === 'productos' ? 'active' : ''}`}
              onClick={() => setActiveTab('productos')}
              style={{ 
                padding: '12px 4px', background: 'none', border: 'none', 
                color: activeTab === 'productos' ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'productos' ? '600' : '400',
                borderBottom: activeTab === 'productos' ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <OrderedListOutlined /> Detalle de Compra de Productos
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Cargando información...</div>
          ) : (
            <>
              <div className="table-responsive" style={{ maxHeight: '48vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', minWidth: '1300px' }}>
                  <thead>
                    {activeTab === 'estados' ? (
                      <tr>
                        <th style={{ whiteSpace: 'nowrap', textAlign: 'left' }}>Fecha</th>
                        <th style={{ textAlign: 'left' }}>Estado Anterior</th>
                        <th style={{ textAlign: 'left' }}>Estado Nuevo</th>
                        <th style={{ textAlign: 'left' }}>Notas</th>
                        <th style={{ textAlign: 'left' }}>Responsable</th>
                      </tr>
                    ) : (
                      <tr>
                        <th style={{ whiteSpace: 'nowrap', textAlign: 'left' }}>Fecha</th>
                        <th style={{ textAlign: 'left' }}>Tipo de comprobante</th>
                        <th style={{ textAlign: 'left' }}>Comprobante</th>
                        <th style={{ textAlign: 'left' }}>Proveedor</th>
                        <th style={{ textAlign: 'left' }}>Producto</th>
                        <th style={{ textAlign: 'left' }}>Código de Producto</th>
                        <th style={{ textAlign: 'right' }}>Cantidad</th>
                        <th style={{ textAlign: 'right' }}>Precio de compra</th>
                        <th style={{ textAlign: 'right' }}>Descuento</th>
                        <th style={{ textAlign: 'right' }}>Impuesto</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th style={{ textAlign: 'left' }}>Responsable</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {activeTab === 'estados' ? (
                        historyData.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay movimientos registrados.</td></tr>
                        ) : (
                        historyData.map((h, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  {new Date(h.fecha).toLocaleDateString()} {new Date(h.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td>
                                    <span className={`badge ${
                                        ['CONFIRMADA', 'COMPLETADA'].includes(h.estado_anterior) ? 'badge-success' :
                                        ['CANCELADA', 'ANULADA'].includes(h.estado_anterior) ? 'badge-danger' : 'badge-warning'
                                    }`} style={{ fontSize: '10px' }}>
                                        {h.estado_anterior || 'N/A'}
                                    </span>
                                </td>
                                <td>
                                    <span className={`badge ${
                                        ['CONFIRMADA', 'COMPLETADA'].includes(h.estado_nuevo) ? 'badge-success' :
                                        ['CANCELADA', 'ANULADA'].includes(h.estado_nuevo) ? 'badge-danger' : 'badge-warning'
                                    }`} style={{ fontSize: '10px' }}>
                                        {h.estado_nuevo}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{h.notas || 'Sin registro adicional'}</td>
                                <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                   {h.usuario_nombre ? `${h.usuario_nombre} (${h.usuario_rol || '-'})` : 'Sistema'}
                                </td>
                            </tr>
                        )))
                    ) : (
                        kardexData.length === 0 ? (
                            <tr><td colSpan="12" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No hay productos registrados en esta compra.</td></tr>
                        ) : (
                        kardexData.map((p, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  {new Date(p.fecha).toLocaleDateString()} {new Date(p.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td>{p.tipo_comprobante}</td>
                                <td>{p.numero_comprobante}</td>
                                <td>{p.proveedor_nombre}</td>
                                <td style={{ fontWeight: 600 }}>{p.producto_nombre || `ID: ${p.producto}`}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{p.producto_codigo || 'S/C'}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.cantidad}</td>
                                <td style={{ textAlign: 'right' }}>S/. {Number(p.precio_compra).toFixed(2)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--color-danger)' }}>-S/. {Number(p.descuento).toFixed(2)}</td>
                                <td style={{ textAlign: 'right' }}>S/. {Number(p.impuesto || 0).toFixed(2)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>S/. {Number(p.total).toFixed(2)}</td>
                                <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                   {p.usuario_nombre ? `${p.usuario_nombre} (${p.usuario_rol || '-'})` : 'Sistema'}
                                </td>
                            </tr>
                        )))
                    )}
                  </tbody>
                </table>
              </div>
              
              {!loading && totalPages > 1 && (
                <div style={{ marginTop: '20px' }}>
                  <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={handlePageChange}
                    pageSize={10}
                    totalItems={totalItems}
                    itemName="registros"
                  />
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default CompraHistoryModal;
