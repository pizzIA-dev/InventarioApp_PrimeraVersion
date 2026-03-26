import React, { useState, useEffect } from 'react';
import { HistoryOutlined, CalendarOutlined, DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { ventasAPI, serviciosAPI } from '../services/api';
import Pagination from './Pagination';
import { message } from 'antd';

const VentaHistoryModal = ({ visible, onClose, venta, isServicio = false }) => {
  const [activeTab, setActiveTab] = useState('estados');
  const [historyEstados, setHistoryEstados] = useState([]);
  const [historyProductos, setHistoryProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    if (visible && venta) {
      setPage(1);
      setFechaDesde('');
      setFechaHasta('');
      if (isServicio) {
        setActiveTab('estados');
        fetchEstados(venta.id, 1);
      } else {
        setActiveTab('estados');
        fetchEstados(venta.id, 1);
      }
    }
  }, [visible, venta, isServicio]);

  const fetchEstados = async (id, p = 1, desde = '', hasta = '') => {
    setLoading(true);
    try {
      const apiCall = isServicio ? serviciosAPI.getHistoryEstadosVenta : ventasAPI.getHistoryEstados;
      const response = await apiCall(id, { page: p, page_size: 15, fecha_desde: desde, fecha_hasta: hasta });
      setHistoryEstados(response.data.results || response.data);
      setTotal(response.data.count || (response.data.results ? response.data.results.length : response.data.length));
      setTotalPages(Math.ceil((response.data.count || 0) / 15));
    } catch (error) {
      console.error("Error al cargar historial de estados:", error);
      message.error("No se pudo cargar el historial de estados");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductos = async (id, p = 1, desde = '', hasta = '') => {
    setLoading(true);
    try {
      const response = await ventasAPI.getKardexProductos(id, { page: p, page_size: 15, fecha_desde: desde, fecha_hasta: hasta });
      setHistoryProductos(response.data.results || response.data);
      setTotal(response.data.count || (response.data.results ? response.data.results.length : response.data.length));
      setTotalPages(Math.ceil((response.data.count || 0) / 15));
    } catch (error) {
      console.error("Error al cargar Kardex de productos:", error);
      message.error("No se pudo cargar el detalle de productos");
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setPage(1);
    if (activeTab === 'estados') fetchEstados(venta.id, 1, fechaDesde, fechaHasta);
    else fetchProductos(venta.id, 1, fechaDesde, fechaHasta);
  };

  const handlePageChange = (p) => {
    setPage(p);
    if (activeTab === 'estados') fetchEstados(venta.id, p, fechaDesde, fechaHasta);
    else fetchProductos(venta.id, p, fechaDesde, fechaHasta);
  };

  const handleExport = async () => {
    try {
      const response = await ventasAPI.exportarHistorial(venta.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_venta_${venta.numero_comprobante_simple || venta.id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error al exportar historial:", error);
      message.error("No se pudo exportar el historial");
    }
  };

  if (!visible || !venta) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95vw' }}>
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <h3 className="modal-title">Historial de {isServicio ? 'Servicio' : 'Venta'}</h3>
            <p className="modal-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              {venta.numero_comprobante || venta.numero_comprobante_simple || `#${venta.id}`} - {venta.cliente_nombre || (venta.cliente?.nombre || 'Cliente General')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!isServicio && (
              <button className="btn btn-secondary" onClick={handleExport} style={{ padding: '4px 12px', fontSize: '12px' }}>
                Exportar Excel
              </button>
            )}
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="modal-body" style={{ paddingTop: '0' }}>
          <div style={{ padding: '12px 0 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Desde</label>
              <input type="date" className="form-input" style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }} value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Hasta</label>
              <input type="date" className="form-input" style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }} value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={handleFilter} style={{ padding: '5px 14px', fontSize: '13px' }}>Filtrar</button>
              <button className="btn btn-secondary" onClick={() => { setFechaDesde(''); setFechaHasta(''); handleFilter(); }} style={{ padding: '5px 14px', fontSize: '13px' }}>Limpiar</button>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'center' }}>
              {total} registro{total !== 1 ? 's' : ''} encontrados
            </div>
          </div>

          {!isServicio && (
            <div className="tabs" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '24px' }}>
              <button 
                className={`tab-item ${activeTab === 'estados' ? 'active' : ''}`}
                onClick={() => { setActiveTab('estados'); setPage(1); fetchEstados(venta.id, 1, fechaDesde, fechaHasta); }}
                style={{ 
                  padding: '12px 4px', background: 'none', border: 'none', 
                  color: activeTab === 'estados' ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'estados' ? '600' : '400',
                  borderBottom: activeTab === 'estados' ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer', fontSize: '14px'
                }}
              >
                Historial de Estados
              </button>
              <button 
                className={`tab-item ${activeTab === 'productos' ? 'active' : ''}`}
                onClick={() => { setActiveTab('productos'); setPage(1); fetchProductos(venta.id, 1, fechaDesde, fechaHasta); }}
                style={{ 
                  padding: '12px 4px', background: 'none', border: 'none', 
                  color: activeTab === 'productos' ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'productos' ? '600' : '400',
                  borderBottom: activeTab === 'productos' ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer', fontSize: '14px'
                }}
              >
                Detalle de Venta de Productos
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando información...</div>
          ) : (
            <>
              {activeTab === 'estados' ? (
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '45vh', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <table style={{ fontSize: '13px', minWidth: '800px', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ whiteSpace: 'nowrap' }}>Fecha</th>
                        <th style={{ whiteSpace: 'nowrap' }}>Estado Anterior</th>
                        <th style={{ whiteSpace: 'nowrap' }}>Estado Nuevo</th>
                        <th>Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyEstados.map((h) => (
                        <tr key={h.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {new Date(h.fecha).toLocaleDateString() + ' ' + new Date(h.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td>
                            <span className={`badge ${
                              ['CONFIRMADA', 'TERMINADO'].includes(h.estado_anterior) ? 'badge-success' :
                              ['CANCELADA', 'CANCELADO'].includes(h.estado_anterior) ? 'badge-danger' : 
                              ['BORRADOR', 'PENDIENTE'].includes(h.estado_anterior) ? 'badge-warning' : 
                              h.estado_anterior === 'EN_PROGRESO' ? 'badge-info' : ''
                            }`} style={{ fontSize: '10px' }}>{h.estado_anterior}</span>
                          </td>
                          <td>
                            <span className={`badge ${
                              ['CONFIRMADA', 'TERMINADO'].includes(h.estado_nuevo) ? 'badge-success' :
                              ['CANCELADA', 'CANCELADO'].includes(h.estado_nuevo) ? 'badge-danger' : 
                              ['BORRADOR', 'PENDIENTE'].includes(h.estado_nuevo) ? 'badge-warning' : 
                              h.estado_nuevo === 'EN_PROGRESO' ? 'badge-info' : ''
                            }`} style={{ fontSize: '10px' }}>{h.estado_nuevo}</span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{h.notas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '45vh', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <table style={{ fontSize: '11px', minWidth: '1500px', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ whiteSpace: 'nowrap' }}>Fecha</th>
                        <th style={{ whiteSpace: 'nowrap' }}>Tipo Comprobante Simple</th>
                        <th style={{ whiteSpace: 'nowrap' }}>Comprobante Simple</th>
                        <th style={{ whiteSpace: 'nowrap' }}>Tipo Comprobante</th>
                        <th>Comprobante</th>
                        <th>Cliente</th>
                        <th>Producto</th>
                        <th>Código</th>
                        <th style={{ textAlign: 'right' }}>Cant.</th>
                        <th style={{ textAlign: 'right' }}>P. Unit.</th>
                        <th style={{ textAlign: 'right' }}>Desc.</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyProductos.map((p, idx) => (
                        <tr key={idx}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {new Date(p.fecha).toLocaleDateString() + ' ' + new Date(p.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td style={{ fontWeight: 600 }}>{p.tipo_comprobante_simple}</td>
                          <td style={{ fontWeight: 600 }}>{p.numero_comprobante_simple}</td>
                          <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{p.tipo_comprobante}</td>
                          <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{p.comprobante}</td>
                          <td>{p.cliente}</td>
                          <td style={{ fontWeight: 600 }}>{p.producto_nombre}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{p.producto_codigo}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.cantidad}</td>
                          <td style={{ textAlign: 'right' }}>S/. {Number(p.precio_unitario).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--color-danger)' }}>-S/. {Number(p.descuento || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>S/. {Number(p.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && totalPages > 1 && (
                <div style={{ marginTop: '20px' }}>
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={15} totalItems={total} itemName="registros" />
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .badge-info { 
          background-color: var(--color-info-bg); 
          color: var(--color-info); 
          border: 1px solid var(--color-info-border); 
        }
      `}} />
    </div>
  );
};

export default VentaHistoryModal;
