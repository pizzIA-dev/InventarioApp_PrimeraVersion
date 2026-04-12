import React, { useState, useEffect } from 'react';
import { DownloadOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';
import Pagination from '../Pagination';
import { comprasAPI } from '../../services/api';
import { message } from 'antd';

const GlobalKardexModal = ({ 
  visible, 
  onClose, 
  onFetchKardex, 
  kardexData, 
  loading, 
  currentPage, 
  totalPages,
  totalItems
}) => {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filterProveedor, setFilterProveedor] = useState('');
  const [filterProducto, setFilterProducto] = useState('');

  useEffect(() => {
    if (visible) {
      onFetchKardex(1, fechaDesde, fechaHasta, filterProveedor, filterProducto);
    }
  }, [visible]);

  if (!visible) return null;

  const handlePageChange = (page) => {
    onFetchKardex(page, fechaDesde, fechaHasta, filterProveedor, filterProducto);
  };

  const handleFilter = () => {
    onFetchKardex(1, fechaDesde, fechaHasta, filterProveedor, filterProducto);
  };

  const clearFilters = () => {
    setFechaDesde('');
    setFechaHasta('');
    setFilterProveedor('');
    setFilterProducto('');
    onFetchKardex(1, '', '', '', '');
  };

  const handleExport = async () => {
    try {
      const response = await comprasAPI.exportarHistorialGlobal({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        proveedor: filterProveedor,
        producto: filterProducto
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kardex_global_compras.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al exportar kardex global:", error);
      message.error("Error al generar el archivo Excel");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95vw' }}>
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <h3 className="modal-title">Kardex Global de Compras</h3>
            <p className="modal-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Historial detallado de todas las entradas de productos por compra
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DownloadOutlined /> Exportar Excel
            </button>
            <button className="modal-close" onClick={onClose}><CloseOutlined /></button>
          </div>
        </div>

        <div className="modal-body">
          {/* Advanced Filters */}
          <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
            <div className="grid grid-4" style={{ gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Producto</label>
                <input type="text" className="form-input" style={{ padding: '7px' }} value={filterProducto} onChange={(e) => setFilterProducto(e.target.value)} placeholder="Ej: Jabón..." />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Proveedor</label>
                <input type="text" className="form-input" style={{ padding: '7px' }} value={filterProveedor} onChange={(e) => setFilterProveedor(e.target.value)} placeholder="Ej: Distribuidora..." />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Desde</label>
                  <input type="date" className="form-input" style={{ padding: '7px' }} value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Hasta</label>
                  <input type="date" className="form-input" style={{ padding: '7px' }} value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" onClick={handleFilter} style={{ flex: 1, padding: '7px' }}>
                  <SearchOutlined /> Filtrar
                </button>
                <button className="btn btn-secondary" onClick={clearFilters} style={{ padding: '7px 14px' }}>
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
             <div style={{ fontSize: '14px', fontWeight: 600 }}>Registros de Entrada</div>
             <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{totalItems} registros encontrados</div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>Cargando registros del Kardex...</div>
          ) : (
            <>
              <div className="table-responsive" style={{ maxHeight: '48vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: 'nowrap', textAlign: 'left' }}>Fecha</th>
                      <th style={{ textAlign: 'left' }}>Comprobante</th>
                      <th style={{ textAlign: 'left' }}>Proveedor</th>
                      <th style={{ textAlign: 'left' }}>Producto</th>
                      <th style={{ textAlign: 'left' }}>Código</th>
                      <th style={{ width: '60px', textAlign: 'right' }}>Cant.</th>
                      <th style={{ width: '90px', textAlign: 'right' }}>P. Compra</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>Desc.</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>Imp.</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>Total Sugerido</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Estado</th>
                      <th style={{ textAlign: 'left' }}>Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardexData.length === 0 ? (
                      <tr><td colSpan="12" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No se encontraron registros en el historial global.</td></tr>
                    ) : (
                      kardexData.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {new Date(p.fecha).toLocaleDateString()} {new Date(p.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{p.tipo_comprobante || 'N/A'}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{p.numero_comprobante || `--`}</div>
                          </td>
                          <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.proveedor_nombre}>
                            {p.proveedor_nombre}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{p.producto_nombre || `ID: ${p.producto}`}</div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{p.producto_codigo || 'S/C'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.cantidad}</td>
                          <td style={{ textAlign: 'right' }}>S/. {Number(p.precio_compra).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--color-danger)' }}>-S/. {Number(p.descuento || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>S/. {Number(p.impuesto || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                            S/. {Number(p.total).toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${p.estado === 'CONFIRMADA' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                              {p.estado}
                            </span>
                          </td>
                          <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {p.usuario_nombre ? `${p.usuario_nombre} (${p.usuario_rol || '-'})` : 'Sistema'}
                          </td>
                        </tr>
                      ))
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

export default GlobalKardexModal;
