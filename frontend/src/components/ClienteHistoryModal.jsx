import { useState, useEffect } from 'react';
import { 
  HistoryOutlined, 
  ShoppingCartOutlined, 
  FileExcelOutlined, 
  SearchOutlined,
  CloseOutlined 
} from '@ant-design/icons';
import { clientesAPI } from '../services/api';
import Pagination from './Pagination';
import { message } from 'antd';

const ClienteHistoryModal = ({ visible, cliente, onClose }) => {
  const [activeTab, setActiveTab] = useState('estados'); // 'estados', 'productos', 'servicios'
  const [loading, setLoading] = useState(false);
  
  // States for History (Estados)
  const [historyEstados, setHistoryEstados] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // States for Kardex (Productos)
  const [productosKardex, setProductosKardex] = useState([]);
  const [productosPage, setProductosPage] = useState(1);
  const [productosTotal, setProductosTotal] = useState(0);
  const [productosTotalPages, setProductosTotalPages] = useState(1);
  // States for Kardex (Servicios)
  const [serviciosKardex, setServiciosKardex] = useState([]);
  const [serviciosPage, setServiciosPage] = useState(1);
  const [serviciosTotal, setServiciosTotal] = useState(0);
  const [serviciosTotalPages, setServiciosTotalPages] = useState(1);

  useEffect(() => {
    if (visible && cliente) {
      setHistoryPage(1);
      setProductosPage(1);
      setServiciosPage(1);
      setFechaDesde('');
      setFechaHasta('');
      setActiveTab('estados');
      fetchEstados(cliente.id, 1);
    }
  }, [visible, cliente]);

  const fetchEstados = async (clientId, p = 1, desde = '', hasta = '') => {
    setLoading(true);
    try {
      const params = { page: p, page_size: 15 };
      if (desde) params.fecha_desde = desde;
      if (hasta) params.fecha_hasta = hasta;
      
      const response = await clientesAPI.getHistoryEstados(clientId, params);
      const data = response.data;
      setHistoryEstados(data.results || []);
      setHistoryTotal(data.count || 0);
      setHistoryTotalPages(data.total_pages || 1);
      setHistoryPage(data.page || 1);
    } catch (error) {
      console.error('Error fetching estado history:', error);
      message.error('No se pudo cargar el historial de estados');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductos = async (clientId, p = 1, desde = '', hasta = '') => {
    setLoading(true);
    try {
      const params = { page: p, page_size: 15 };
      if (desde) params.fecha_desde = desde;
      if (hasta) params.fecha_hasta = hasta;
      
      const response = await clientesAPI.getKardexProductos(clientId, params);
      const data = response.data;
      setProductosKardex(data.results || []);
      setProductosTotal(data.count || 0);
      setProductosTotalPages(data.total_pages || 1);
      setProductosPage(data.page || 1);
    } catch (error) {
      console.error('Error fetching productos kardex:', error);
      message.error('No se pudo cargar el detalle de ventas');
    } finally {
      setLoading(false);
    }
  };
  const fetchServicios = async (clientId, p = 1, desde = '', hasta = '') => {
    setLoading(true);
    try {
      const params = { page: p, page_size: 15 };
      if (desde) params.fecha_desde = desde;
      if (hasta) params.fecha_hasta = hasta;
      
      const response = await clientesAPI.getKardexServicios(clientId, params);
      const data = response.data;
      setServiciosKardex(data.results || []);
      setServiciosTotal(data.count || 0);
      setServiciosTotalPages(data.total_pages || 1);
      setServiciosPage(data.page || 1);
    } catch (error) {
      console.error('Error fetching servicios kardex:', error);
      message.error('No se pudo cargar el detalle de servicios');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'estados') {
      fetchEstados(cliente.id, 1, fechaDesde, fechaHasta);
    } else if (tab === 'productos') {
      fetchProductos(cliente.id, 1, fechaDesde, fechaHasta);
    } else {
      fetchServicios(cliente.id, 1, fechaDesde, fechaHasta);
    }
  };

  const handleFilter = () => {
    if (activeTab === 'estados') {
      fetchEstados(cliente.id, 1, fechaDesde, fechaHasta);
    } else if (activeTab === 'productos') {
      fetchProductos(cliente.id, 1, fechaDesde, fechaHasta);
    } else {
      fetchServicios(cliente.id, 1, fechaDesde, fechaHasta);
    }
  };

  const handleClearFilters = () => {
    setFechaDesde('');
    setFechaHasta('');
    if (activeTab === 'estados') {
      fetchEstados(cliente.id, 1, '', '');
    } else if (activeTab === 'productos') {
      fetchProductos(cliente.id, 1, '', '');
    } else {
      fetchServicios(cliente.id, 1, '', '');
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      
      const response = await clientesAPI.exportarHistorial(cliente.id, params);
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kardex_cliente_${cliente.id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting history:', error);
      message.error('Error al exportar el historial del cliente.');
    }
  };

  if (!visible || !cliente) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', width: '95vw' }}>
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <h3 className="modal-title">Historial y Kardex de Cliente</h3>
            <p className="modal-subtitle">
              {cliente.nombre} ({cliente.numero_documento})
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={handleExport} style={{ padding: '4px 12px', fontSize: '12px' }}>
              Exportar Excel
            </button>
            <button className="modal-close" onClick={onClose}><CloseOutlined /></button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'estados' ? 'active' : ''}`}
            onClick={() => handleTabChange('estados')}
          >
            Historial de Estados
          </button>
          <button 
            className={`tab-btn ${activeTab === 'productos' ? 'active' : ''}`}
            onClick={() => handleTabChange('productos')}
          >
            Detalle de Venta de Productos
          </button>
          <button 
            className={`tab-btn ${activeTab === 'servicios' ? 'active' : ''}`}
            onClick={() => handleTabChange('servicios')}
          >
            Detalle de Venta de Servicios
          </button>
        </div>

        <div className="modal-body" style={{ minHeight: '400px', paddingTop: '0' }}>
          
          {/* Filter Bar */}
          <div style={{ padding: '12px 0 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Desde</label>
              <input 
                type="date" 
                className="form-input" 
                value={fechaDesde} 
                onChange={(e) => setFechaDesde(e.target.value)}
                style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }}
              />
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Hasta</label>
              <input 
                type="date" 
                className="form-input" 
                value={fechaHasta} 
                onChange={(e) => setFechaHasta(e.target.value)}
                style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={handleFilter} disabled={loading} style={{ padding: '5px 14px', fontSize: '13px' }}>
                <SearchOutlined /> Filtrar
              </button>
              <button className="btn btn-secondary" onClick={handleClearFilters} disabled={loading} style={{ padding: '5px 14px', fontSize: '13px' }}>
                Limpiar
              </button>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
              {activeTab === 'estados' ? historyTotal : activeTab === 'productos' ? productosTotal : serviciosTotal} registro{(activeTab === 'estados' ? historyTotal : activeTab === 'productos' ? productosTotal : serviciosTotal) !== 1 ? 's' : ''} encontrado{(activeTab === 'estados' ? historyTotal : activeTab === 'productos' ? productosTotal : serviciosTotal) !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-secondary)' }}>
              Cargando información...
            </div>
          ) : (
            <>
              {activeTab === 'estados' ? (
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <table className="table" style={{ width: '100%', minWidth: '800px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--bg-card)' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Fecha</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Estado Anterior</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Estado Nuevo</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Notas</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Responsable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyEstados.length > 0 ? (
                        historyEstados.map((mov) => {
                          const isCreacion = mov.estado_anterior === '—';
                          return (
                            <tr key={mov.id} style={isCreacion ? { background: 'rgba(24,144,255,0.05)' } : {}}>
                              <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                {new Date(mov.fecha).toLocaleDateString() + ' ' + new Date(mov.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                {isCreacion ? (
                                  <span className="badge badge-info" style={{ background: 'rgba(24,144,255,0.15)', color: '#1890ff', border: '1px solid rgba(24,144,255,0.4)' }}>
                                    Nuevo cliente
                                  </span>
                                ) : (
                                  <span className="badge" style={{ background: 'var(--bg-secondary-btn)', color: 'var(--text-secondary)' }}>{mov.estado_anterior}</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span className={`badge ${isCreacion ? 'badge-info' : mov.estado_nuevo === 'Activo' ? 'badge-success' : 'badge-danger'}`}
                                  style={isCreacion ? { background: 'rgba(24,144,255,0.15)', color: '#1890ff', border: '1px solid rgba(24,144,255,0.4)' } : {}}
                                >
                                  {mov.estado_nuevo}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '13px', color: isCreacion ? 'var(--text-primary)' : 'var(--text-secondary)', fontStyle: isCreacion ? 'italic' : 'normal' }}>{mov.notas}</td>
                              <td style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {mov.usuario_nombre ? `${mov.usuario_nombre} (${mov.usuario_rol || '-'})` : 'Sistema'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            No se encontraron registros de estados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === 'productos' ? (
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <table className="table" style={{ width: '100%', minWidth: '1500px', fontSize: '12px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--bg-card)' }}>
                      <tr>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Fecha</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>Tipo Comprobante Simple</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>Comprobante Simple</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>Tipo Comprobante</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Comprobante</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Cliente</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Producto</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Código</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Cant.</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>P. Unit.</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Subtotal</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Desc.</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Impuesto</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Responsable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosKardex.length > 0 ? (
                        productosKardex.map((record, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                              {new Date(record.fecha).toLocaleDateString() + ' ' + new Date(record.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: '600' }}>COMPROBANTE SIMPLE</td>
                            <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{record.numero_comprobante_simple}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--accent)', fontWeight: '600' }}>{record.tipo_comprobante}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--accent)', fontWeight: 'bold' }}>{record.comprobante}</td>
                            <td style={{ padding: '10px 12px' }}>{record.cliente}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: '500' }}>{record.producto_nombre}</div>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '11px' }}>{record.producto_codigo}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold' }}>{record.cantidad}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>S/. {Number(record.precio_unitario).toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>S/. {(record.cantidad * record.precio_unitario).toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-danger)' }}>
                              {record.descuento > 0 ? `-S/. ${Number(record.descuento).toFixed(2)}` : '-'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>S/. {Number(record.impuesto || 0).toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent)' }}>
                              S/. { ( (record.cantidad ? (record.cantidad * record.precio_unitario) : Number(record.precio_servicio)) - (record.descuento || 0) + (Number(record.impuesto) || 0) ).toFixed(2) }
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                               {record.usuario_nombre ? `${record.usuario_nombre} (${record.usuario_rol || '-'})` : 'Sistema'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="14" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            No hay registro de productos para este cliente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <table className="table" style={{ width: '100%', minWidth: '1200px', fontSize: '12px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--bg-card)' }}>
                      <tr>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Fecha</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>Tipo Comprobante Simple</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>Comprobante Simple</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>Tipo Comprobante</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Comprobante</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Cliente</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Servicio</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Precio Serv.</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Descuento</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Impuesto</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Responsable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviciosKardex.length > 0 ? (
                        serviciosKardex.map((record, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                              {new Date(record.fecha).toLocaleDateString() + ' ' + new Date(record.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: '600' }}>COMPROBANTE SIMPLE</td>
                            <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{record.numero_comprobante_simple}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--accent)', fontWeight: '600' }}>{record.tipo_comprobante}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--accent)', fontWeight: 'bold' }}>{record.comprobante}</td>
                            <td style={{ padding: '10px 12px' }}>{record.cliente}</td>
                            <td style={{ padding: '10px 12px' }}>{record.servicio_nombre}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>S/. {Number(record.precio_servicio).toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-danger)' }}>
                              {record.descuento > 0 ? `-S/. ${Number(record.descuento).toFixed(2)}` : '-'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>S/. {Number(record.impuesto || 0).toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent)' }}>
                              S/. { ( (record.cantidad ? (record.cantidad * record.precio_unitario) : Number(record.precio_servicio)) - (record.descuento || 0) + (Number(record.impuesto) || 0) ).toFixed(2) }
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                               {record.usuario_nombre ? `${record.usuario_nombre} (${record.usuario_rol || '-'})` : 'Sistema'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            No hay registro de servicios para este cliente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {(activeTab === 'estados' ? historyTotalPages : activeTab === 'productos' ? productosTotalPages : serviciosTotalPages) > 1 && (
                <div style={{ marginTop: '16px' }}>
                  <Pagination 
                    currentPage={activeTab === 'estados' ? historyPage : activeTab === 'productos' ? productosPage : serviciosPage}
                    totalPages={activeTab === 'estados' ? historyTotalPages : activeTab === 'productos' ? productosTotalPages : serviciosTotalPages}
                    onPageChange={(p) => {
                      if (activeTab === 'estados') {
                        setHistoryPage(p);
                        fetchEstados(cliente.id, p, fechaDesde, fechaHasta);
                      } else if (activeTab === 'productos') {
                        setProductosPage(p);
                        fetchProductos(cliente.id, p, fechaDesde, fechaHasta);
                      } else {
                        setServiciosPage(p);
                        fetchServicios(cliente.id, p, fechaDesde, fechaHasta);
                      }
                    }}
                    pageSize={15}
                    totalItems={activeTab === 'estados' ? historyTotal : activeTab === 'productos' ? productosTotal : serviciosTotal}
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

export default ClienteHistoryModal;
