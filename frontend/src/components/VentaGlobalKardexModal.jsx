import React, { useState, useEffect } from 'react';
import { HistoryOutlined, CalendarOutlined, DownloadOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { ventasAPI, productosAPI, clientesAPI } from '../services/api';
import Pagination from './Pagination';
import SearchableSelect from './SearchableSelect';
import { message } from 'antd';

const VentaGlobalKardexModal = ({ visible, onClose }) => {
  const [historyProductos, setHistoryProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterProducto, setFilterProducto] = useState('');
  
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    if (visible) {
      fetchData();
      fetchProductos();
      fetchClientes();
    }
  }, [visible]);

  const fetchProductos = async () => {
    try {
      const res = await productosAPI.getAll();
      setProductos(res.data.results || res.data);
    } catch (err) { console.error(err); }
  };

  const fetchClientes = async () => {
    try {
      const res = await clientesAPI.getAll();
      setClientes(res.data.results || res.data);
    } catch (err) { console.error(err); }
  };

  const fetchData = async (p = 1, desde = '', hasta = '', cli = '', prod = '') => {
    setLoading(true);
    try {
      const params = { 
        page: p, 
        page_size: 15,
        fecha_desde: desde, 
        fecha_hasta: hasta,
        cliente: cli,
        producto: prod
      };
      const response = await ventasAPI.getKardexGlobalProductos(params);
      setHistoryProductos(response.data.results || response.data);
      setTotal(response.data.count || (response.data.results ? response.data.results.length : response.data.length));
      setTotalPages(Math.ceil((response.data.count || 0) / 15));
    } catch (error) {
      console.error("Error al cargar Kardex Global:", error);
      message.error("No se pudo cargar el Kardex Global");
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setPage(1);
    fetchData(1, fechaDesde, fechaHasta, filterCliente, filterProducto);
  };

  const handleClear = () => {
    setFechaDesde('');
    setFechaHasta('');
    setFilterCliente('');
    setFilterProducto('');
    setPage(1);
    fetchData(1, '', '', '', '');
  };

  const handlePageChange = (p) => {
    setPage(p);
    fetchData(p, fechaDesde, fechaHasta, filterCliente, filterProducto);
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1300px', width: '98vw' }}>
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <h3 className="modal-title">Detalle de Venta de Productos</h3>
            <p className="modal-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Historial detallado de todas las salidas de productos por venta
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
            <div className="grid grid-4" style={{ gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Producto</label>
                <SearchableSelect 
                  options={productos.map(p => ({ id: String(p.id), nombre: p.nombre, subtitle: p.codigo }))}
                  value={filterProducto}
                  onChange={setFilterProducto}
                  placeholder="Todos los productos"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Cliente</label>
                <SearchableSelect 
                  options={clientes.map(c => ({ id: String(c.id), nombre: c.nombre, subtitle: c.numero_documento }))}
                  value={filterCliente}
                  onChange={setFilterCliente}
                  placeholder="Todos los clientes"
                />
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
                <button className="btn btn-primary" onClick={handleFilter} style={{ flex: 1 }}>
                  <SearchOutlined /> Filtrar
                </button>
                <button className="btn btn-secondary" onClick={handleClear}>
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
             <div style={{ fontSize: '14px', fontWeight: 600 }}>Registros de Salida</div>
             <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{total} registros encontrados</div>
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div className="loader" style={{ marginBottom: '12px' }}></div>
                Cargando Detalle de Venta...
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
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
                      <th style={{ textAlign: 'right' }}>Cantidad</th>
                      <th style={{ textAlign: 'right' }}>P. Unitario</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                      <th style={{ textAlign: 'right' }}>Descuento</th>
                       <th style={{ textAlign: 'right' }}>Impuesto</th>
                      <th style={{ textAlign: 'right' }}>Total Venta</th>
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
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px' }}>{p.cantidad}</td>
                        <td style={{ textAlign: 'right' }}>S/. {Number(p.precio_unitario).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>S/. {Number(p.cantidad * p.precio_unitario).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-danger)' }}>-S/. {Number(p.descuento || 0).toFixed(2)}</td>
                         <td style={{ textAlign: 'right' }}>S/. {Number(p.impuesto || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>S/. {( (p.cantidad * p.precio_unitario) - (p.descuento || 0) + (Number(p.impuesto) || 0) ).toFixed(2)}</td>
                      </tr>
                    ))}
                    {historyProductos.length === 0 && (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No se encontraron registros de ventas con los filtros aplicados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

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
    </div>
  );
};

export default VentaGlobalKardexModal;
