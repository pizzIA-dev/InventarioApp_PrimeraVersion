import React, { useState, useEffect } from 'react';
import { HistoryOutlined, CalendarOutlined, DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { serviciosAPI } from '../services/api';
import Pagination from './Pagination';
import { message } from 'antd';
import { AuthContext } from '../context/AuthContext';

const ServicioHistoryModal = ({ visible, onClose, servicio }) => {
  const { isVendedor } = React.useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    if (visible && servicio) {
      setPage(1);
      setFechaDesde('');
      setFechaHasta('');
      fetchKardex(servicio.id, 1);
    }
  }, [visible, servicio]);

  const fetchKardex = async (id, p = 1, desde = '', hasta = '') => {
    setLoading(true);
    try {
      const response = await serviciosAPI.getKardex(id, { page: p, page_size: 15, fecha_desde: desde, fecha_hasta: hasta });
      setHistory(response.data.results || response.data);
      setTotal(response.data.count || (response.data.results ? response.data.results.length : response.data.length));
      setTotalPages(Math.ceil((response.data.count || 0) / 15));
    } catch (error) {
      console.error("Error al cargar Kardex de servicio:", error);
      message.error("No se pudo cargar el historial de movimientos");
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setPage(1);
    fetchKardex(servicio.id, 1, fechaDesde, fechaHasta);
  };

  const handlePageChange = (p) => {
    setPage(p);
    fetchKardex(servicio.id, p, fechaDesde, fechaHasta);
  };

  const handleExport = async () => {
    try {
      const response = await serviciosAPI.exportarKardex(servicio.id, { fecha_desde: fechaDesde, fecha_hasta: fechaHasta });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kardex_servicio_${servicio.nombre.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error al exportar Kardex:", error);
      message.error("Error al exportar el Kardex");
    }
  };

  if (!visible || !servicio) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95vw' }}>
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <h3 className="modal-title">Kardex de Servicio</h3>
            <p className="modal-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              {servicio.nombre} - {servicio.categoria_nombre || 'Sin Categoría'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!isVendedor && (
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
              <button className="btn btn-secondary" onClick={() => { setFechaDesde(''); setFechaHasta(''); fetchKardex(servicio.id, 1, '', ''); }} style={{ padding: '5px 14px', fontSize: '13px' }}>Limpiar</button>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'center' }}>
              {total} registro{total !== 1 ? 's' : ''} encontrados
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando información...</div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '50vh', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <table style={{ fontSize: '13px', minWidth: '1000px', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: 'nowrap' }}>Fecha</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Tipo</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                      <th>Notas</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length > 0 ? history.map((h) => (
                      <tr key={h.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {new Date(h.fecha).toLocaleDateString() + ' ' + new Date(h.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {h.tipo === 'CREACION' ? 'Creación' : h.tipo === 'AJUSTE' ? 'Ajuste' : 'Cambio Estado'}
                        </td>
                        {!isVendedor && (
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                            {h.costo_anterior !== null ? `S/. ${Number(h.costo_anterior).toFixed(2)}` : '-'}
                          </td>
                        )}
                        {!isVendedor && (
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            S/. {Number(h.costo_nuevo).toFixed(2)}
                          </td>
                        )}
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {h.precio_anterior !== null ? `S/. ${Number(h.precio_anterior).toFixed(2)}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>
                          S/. {Number(h.precio_nuevo).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'left', minWidth: '180px' }}>
                          {h.activo_nuevo === true && (
                            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                              Activo desde {new Date(h.fecha).toLocaleDateString() + ' ' + new Date(h.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          )}
                          {h.activo_nuevo === false && (
                            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                              Inactivo desde {new Date(h.fecha).toLocaleDateString() + ' ' + new Date(h.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          )}
                          {(h.activo_nuevo === null || h.activo_nuevo === undefined) && '-'}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {isVendedor && h.notas && (h.notas.toLowerCase().includes('costo') || h.notas.toLowerCase().includes('compra')) 
                            ? 'Cambio de precio' 
                            : h.notas}
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                           {h.usuario_nombre && h.usuario_rol ? `${h.usuario_nombre} (${h.usuario_rol})` : 'Sistema'}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No hay movimientos registrados</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && totalPages > 1 && (
                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--border-color)', marginTop: '20px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                  >
                    Anterior
                  </button>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Página {page} de {totalPages}
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                  >
                    Siguiente
                  </button>
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

export default ServicioHistoryModal;
