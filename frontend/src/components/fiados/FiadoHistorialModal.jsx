import { useState, useEffect } from 'react';
import { fiadosAPI } from '../../services/api';
import { message } from 'antd';
import Pagination from '../Pagination';

function FiadoHistorialModal({ visible, onClose, fiado }) {
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 15;

  useEffect(() => {
    if (visible && fiado) {
      setPage(1);
      setFechaDesde('');
      setFechaHasta('');
      fetchHistorial(1, '', '');
    } else {
      setHistorial([]);
    }
  }, [visible, fiado]);

  const fetchHistorial = async (p = 1, desde = '', hasta = '') => {
    setLoading(true);
    try {
      const params = {
        page: p,
        page_size: PAGE_SIZE,
        fecha_desde: desde,
        fecha_hasta: hasta
      };
      const response = await fiadosAPI.getHistorialFiado(fiado.id, params);
      setHistorial(response.data.results || []);
      setTotal(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching historial:', error);
      message.error('Error cargando el historial de la operación');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setPage(1);
    fetchHistorial(1, fechaDesde, fechaHasta);
  };

  const handleClearFilters = () => {
    setFechaDesde('');
    setFechaHasta('');
    setPage(1);
    fetchHistorial(1, '', '');
  };

  const handlePageChange = (p) => {
    setPage(p);
    fetchHistorial(p, fechaDesde, fechaHasta);
  };

  const handleExportar = async () => {
    try {
      const response = await fiadosAPI.exportarHistorialFiado(fiado.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_fiado_${fiado.id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar historial:', error);
      message.error("Error al exportar el documento excel");
    }
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return <span className="badge badge-danger" style={{ fontSize: '11px' }}>Pendiente</span>;
      case 'PAGADO_PARCIAL': return <span className="badge badge-warning" style={{ fontSize: '11px' }}>Abono Parcial</span>;
      case 'LIQUIDADO': return <span className="badge badge-success" style={{ fontSize: '11px' }}>Liquidado</span>;
      case 'CANCELADO': return <span className="badge" style={{ fontSize: '11px', background: 'var(--bg-secondary-btn)', color: 'var(--text-primary)' }}>Cancelado</span>;
      default: return <span className="badge" style={{ fontSize: '11px' }}>{estado}</span>;
    }
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: '960px', width: '95vw', padding: 0, background: 'var(--bg-card)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 600 }}>
            Historial: {fiado.cliente_nombre} (#{String(fiado.id).padStart(6, '0')})
          </h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={handleExportar} style={{ padding: '4px 12px', fontSize: '12px' }}>
              Exportar Excel
            </button>
            <button className="modal-close" onClick={onClose} style={{ position: 'relative', top: -2, right: 0, fontSize: '20px' }}>×</button>
          </div>
        </div>
        
        <div className="modal-body" style={{ padding: 0 }}>
          {/* Filters Bar - Matching Product Kardex Style */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)', textTransform: 'none', fontWeight: 400 }}>Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="form-input"
                style={{ padding: '5px 8px', fontSize: '13px', width: 'auto', minHeight: '32px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)', textTransform: 'none', fontWeight: 400 }}>Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="form-input"
                style={{ padding: '5px 8px', fontSize: '13px', width: 'auto', minHeight: '32px' }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleFilter} style={{ padding: '5px 14px', fontSize: '13px', minHeight: '32px' }}>
              Filtrar
            </button>
            <button className="btn btn-secondary" onClick={handleClearFilters} style={{ padding: '5px 14px', fontSize: '13px', minHeight: '32px' }}>
              Limpiar
            </button>
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
              {total} registro{total !== 1 ? 's' : ''} encontrados
            </span>
          </div>

          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '60vh' }}>
            <table style={{ minWidth: '800px', width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--bg-table-header)', position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Fecha y Hora</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Abono Registrado</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Saldo Restante</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estado</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Notas</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>Cargando historial...</td>
                  </tr>
                ) : historial.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                      No se encontraron movimientos.
                    </td>
                  </tr>
                ) : (
                  historial.map((h) => (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 16px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {new Date(h.fecha).toLocaleString('es-PE', { 
                          year: 'numeric', month: '2-digit', day: '2-digit', 
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        }).replace(',', '')}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 'bold' }}>
                        <span style={{ color: Number(h.abono) > 0 ? 'var(--color-success)' : 'inherit', fontSize: '12px' }}>
                          {Number(h.abono) > 0 ? `+ S/ ${Number(h.abono).toFixed(2)}` : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', color: Number(h.saldo_restante) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        S/ {Number(h.saldo_restante).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        {getEstadoBadge(h.estado_nuevo)}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {h.notes || h.notas || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && total > PAGE_SIZE && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
              <Pagination 
                currentPage={page}
                totalPages={Math.ceil(total / PAGE_SIZE)}
                onPageChange={handlePageChange}
                pageSize={PAGE_SIZE}
                totalItems={total}
                itemName="movimientos"
              />
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ padding: '12px 24px', borderTop: '1px solid var(--border-color)', justifyContent: 'flex-end', background: 'var(--bg-card)' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: '13px', padding: '6px 20px' }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default FiadoHistorialModal;
