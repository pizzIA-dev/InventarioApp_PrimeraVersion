import { useState, useEffect, useContext } from 'react';
import { productosAPI, categoriasAPI } from '../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined, HistoryOutlined, CloseOutlined } from '@ant-design/icons';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';
import ProductFormModal from '../components/ProductFormModal';
import LoadingScreen from '../components/LoadingScreen';
import { AuthContext } from '../context/AuthContext';

function Productos() {
  const { isVendedor } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [filterCategoria, setFilterCategoria] = useState('ALL');
  const [filterStock, setFilterStock] = useState('ALL');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });

  // Products table pagination
  const PRODUCTS_PAGE_SIZE = 15;
  const [productsPage, setProductsPage] = useState(1);

  // History Modal States
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(15);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyFechaDesde, setHistoryFechaDesde] = useState('');
  const [historyFechaHasta, setHistoryFechaHasta] = useState('');

  const fetchHistory = async (productoId, pageArg = 1, fechaDesde = '', fechaHasta = '') => {
    const page = typeof pageArg === 'number' ? pageArg : 1;
    setLoadingHistory(true);
    try {
      const params = { page, page_size: historyPageSize };
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      const response = await productosAPI.getMovimientos(productoId, params);
      const data = response.data;
      setStockHistory(data.results || []);
      setHistoryTotal(data.count || 0);
      setHistoryTotalPages(data.total_pages || 1);
      setHistoryPage(data.page || 1);
    } catch (error) {
      console.error('Error fetching history:', error);
      alert('Error al cargar el historial del producto.');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // async-parallel: ambas peticiones se ejecutan en paralelo con Promise.all
  const fetchData = async () => {
    try {
      const [productosRes, categoriasRes] = await Promise.all([
        productosAPI.getAll(),
        categoriasAPI.getAll(),
      ]);
      setProductos(productosRes.data.results || productosRes.data);
      setCategorias(categoriasRes.data.results || categoriasRes.data);
    } catch (error) {
      console.error('Error fetching productos data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Alias para compatibilidad con los callbacks onSave de los modales
  const fetchProductos = fetchData;

  const openModal = (mode, producto = null) => {
    setModalMode(mode);
    setSelectedProducto(producto);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedProducto(null);
  };

  const handleDelete = async (id) => {
    try {
      await productosAPI.delete(confirmDialog.id);
      setConfirmDialog({ visible: false, id: null, nombre: '' });
      fetchProductos();
    } catch (error) {
      console.error('Error deleting producto:', error);
      alert('Error al eliminar el producto.');
    }
  };

  const handleExportDiario = async (periodo, anio) => {
    try {
      const response = await productosAPI.exportarDiarioMovimientos({ periodo, anio });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `diario_movimientos_${periodo}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar diario:', error);
      alert('Error al exportar el diario de movimientos.');
    }
  };

  const handleExportHistorialIndividual = async () => {
    try {
      const response = await productosAPI.exportarMovimientos(selectedHistoryProduct.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_${selectedHistoryProduct.codigo}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar historial:', error);
      alert('Error al exportar el historial del producto.');
    }
  };

  const handleDeleteClick = (producto) => {
    setConfirmDialog({ visible: true, id: producto.id, nombre: producto.nombre });
  };

  const handleViewHistory = async (producto) => {
    setSelectedHistoryProduct(producto);
    setHistoryModalVisible(true);
    setHistoryFechaDesde('');
    setHistoryFechaHasta('');
    fetchHistory(producto.id, 1, '', '');
  };

  const closeHistoryModal = () => {
    setHistoryModalVisible(false);
    setSelectedHistoryProduct(null);
    setStockHistory([]);
    setHistoryPage(1);
    setHistoryTotalPages(1);
    setHistoryFechaDesde('');
    setHistoryFechaHasta('');
  };

  const handleHistoryFilter = () => {
    fetchHistory(selectedHistoryProduct.id, 1, historyFechaDesde, historyFechaHasta);
  };

  const handleHistoryPageChange = (newPage) => {
    fetchHistory(selectedHistoryProduct.id, newPage, historyFechaDesde, historyFechaHasta);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleExportar = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await productosAPI.exportar(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `productos_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar productos:', error);
      alert('Error al exportar datos.');
    }
  };

  const filteredProductos = productos.filter(p => {
    // Search filter
    const searchMatch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const estadoMatch = filterEstado === 'ALL' ? true :
                        filterEstado === 'ACTIVO' ? p.activo :
                        filterEstado === 'INACTIVO' ? !p.activo : true;
    
    // Category filter
    const categoriaMatch = filterCategoria === 'ALL' ? true :
                           String(p.categoria) === filterCategoria;
    
    // Stock filter
    const stockMatch = filterStock === 'ALL' ? true : 
                       filterStock === 'OUT' ? p.stock_actual <= 0 : 
                       filterStock === 'IN_STOCK' ? p.stock_actual > 0 : true;
    
    return searchMatch && estadoMatch && categoriaMatch && stockMatch;
  });

  // Pagination derived values - resets to page 1 when filters change
  const productsTotalPages = Math.max(1, Math.ceil(filteredProductos.length / PRODUCTS_PAGE_SIZE));
  const safeProductsPage = Math.min(productsPage, productsTotalPages);
  const paginatedProductos = filteredProductos.slice(
    (safeProductsPage - 1) * PRODUCTS_PAGE_SIZE,
    safeProductsPage * PRODUCTS_PAGE_SIZE
  );

  // Reset to page 1 when any filter changes
  const handleSearchChange = (val) => { setSearchTerm(val); setProductsPage(1); };
  const handleFilterEstadoChange = (val) => { setFilterEstado(val); setProductsPage(1); };
  const handleFilterCategoriaChange = (val) => { setFilterCategoria(val); setProductsPage(1); };
  const handleFilterStockChange = (val) => { setFilterStock(val); setProductsPage(1); };

  if (loading) {
    return <LoadingScreen message="CARGANDO PRODUCTOS..." />;
  }

  return (
    <div>
      <ConfirmDialog
        visible={confirmDialog.visible}
        title="Eliminar Producto"
        message={`¿Estás seguro de que deseas eliminar "${confirmDialog.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDialog({ visible: false, id: null, nombre: '' })}
        confirmText="Sí, eliminar"
        danger={true}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary, #f8fafc)' }}>Productos</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #94a3b8)' }}>Gestión de productos en stock</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isVendedor && (
            <>
              <ExportDropdown onExport={handleExportDiario} label="Diario de Movimientos" />
              <ExportDropdown onExport={handleExportar} label="Exportar Productos" />
            </>
          )}
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            <PlusOutlined style={{ marginRight: '8px' }} /> Nuevo Producto
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Búsqueda</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por código o nombre..." 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div style={{ width: '150px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Estado</label>
            <select 
              className="form-input" 
              value={filterEstado}
              onChange={(e) => handleFilterEstadoChange(e.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>
          <div style={{ width: '180px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Categoría</label>
            <SearchableSelect
              options={[{id: 'ALL', nombre: 'Todas las categorías'}, ...categorias]}
              value={filterCategoria}
              onChange={(val) => handleFilterCategoriaChange(val)}
              placeholder="Todas las categorías"
            />
          </div>
          <div style={{ width: '150px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Stock</label>
            <select 
              className="form-input" 
              value={filterStock}
              onChange={(e) => handleFilterStockChange(e.target.value)}
            >
              <option value="ALL">Todos los niveles</option>
              <option value="IN_STOCK">Con Stock</option>
              <option value="OUT">Agotados</option>
            </select>
          </div>
          <button
            className="btn btn-secondary"
            style={{ height: '38px' }}
            onClick={() => {
              setSearchTerm('');
              setFilterEstado('ALL');
              setFilterCategoria('ALL');
              setFilterStock('ALL');
              setProductsPage(1);
            }}
            title="Limpiar filtros"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Stock</th>
                {!isVendedor && <th>P. Compra</th>}
                <th>P. Venta</th>
                {!isVendedor && <th>Margen</th>}
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProductos.map((producto) => (
                <tr key={producto.id}>
                  <td>{producto.codigo}</td>
                  <td>{producto.nombre}</td>
                  <td>{producto.categoria_nombre || '-'}</td>
                  <td>
                    <span style={{ color: producto.stock_bajo ? '#ff4d4f' : 'inherit' }}>
                      {producto.stock_actual} {producto.unidad_medida}
                    </span>
                  </td>
                  {!isVendedor && <td>S/. {Number(producto.precio_compra || 0).toFixed(2)}</td>}
                  <td>S/. {Number(producto.precio_venta || 0).toFixed(2)}</td>
                  {!isVendedor && <td>{Number(producto.margen_ganancia || 0).toFixed(2)}%</td>}
                  <td>
                    <span className={`badge ${producto.activo ? 'badge-success' : 'badge-danger'}`}>
                      {producto.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    {/* Ocultar columna P. Compra y Margen para Vendedor — solo mostrar el dato públicamente visible */}
                    <button className="btn btn-secondary" onClick={() => handleViewHistory(producto)} title="Ver Historial" style={{ marginRight: '8px' }}>
                      <HistoryOutlined />
                    </button>
                    <button className="btn btn-secondary" onClick={() => openModal('edit', producto)}>
                      <EditOutlined />
                    </button>
                    {!isVendedor && (
                      <button className="btn btn-danger" onClick={() => handleDeleteClick(producto)}>
                        <DeleteOutlined />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProductos.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: '#888' }}>
                    No se encontraron productos que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>
      <Pagination 
        currentPage={safeProductsPage}
        totalPages={productsTotalPages}
        onPageChange={setProductsPage}
        pageSize={PRODUCTS_PAGE_SIZE}
        totalItems={filteredProductos.length}
        itemName="productos"
      />
      </div>

      <ProductFormModal 
        visible={modalVisible}
        mode={modalMode}
        initialData={selectedProducto}
        onClose={closeModal}
        onSave={() => {
          fetchProductos();
        }}
      />
      {historyModalVisible && (
        <div className="modal-overlay" onClick={closeHistoryModal}>
          <div className="modal" style={{ maxWidth: '960px', width: '95vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                Historial: {selectedHistoryProduct?.nombre} ({selectedHistoryProduct?.codigo})
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={handleExportHistorialIndividual} style={{ padding: '4px 12px', fontSize: '12px' }}>
                  Exportar Excel
                </button>
                <button className="modal-close" onClick={closeHistoryModal}><CloseOutlined /></button>
              </div>
            </div>

            {/* Date filter bar */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: '#666' }}>Desde</label>
                <input
                  type="date"
                  value={historyFechaDesde}
                  onChange={(e) => setHistoryFechaDesde(e.target.value)}
                  className="form-input"
                  style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: '#666' }}>Hasta</label>
                <input
                  type="date"
                  value={historyFechaHasta}
                  onChange={(e) => setHistoryFechaHasta(e.target.value)}
                  className="form-input"
                  style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }}
                />
              </div>
              <button className="btn btn-primary" onClick={handleHistoryFilter} style={{ padding: '5px 14px', fontSize: '13px' }}>
                Filtrar
              </button>
              <button className="btn btn-secondary" onClick={() => {
                setHistoryFechaDesde('');
                setHistoryFechaHasta('');
                fetchHistory(selectedHistoryProducto.id, 1, '', '');
              }} style={{ padding: '5px 14px', fontSize: '13px' }}>
                Limpiar
              </button>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#888', alignSelf: 'center' }}>
                {historyTotal} registro{historyTotal !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table with BOTH scrollbars accessible — overflow on the table wrapper */}
            <div style={{ padding: '0' }}>
              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '48vh' }}>
                {loadingHistory ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>Cargando historial...</div>
                ) : stockHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    No hay movimientos para este producto/período.
                  </div>
                ) : (
                  <table style={{ minWidth: '1000px', width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap' }}>Fecha</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Tipo</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Origen</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', whiteSpace: 'nowrap' }}>Cambio stock</th>
                        {!isVendedor && <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', whiteSpace: 'nowrap' }}>P. Compra Ant.</th>}
                        {!isVendedor && <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', whiteSpace: 'nowrap' }}>P. Compra Nvo.</th>}
                        <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', whiteSpace: 'nowrap' }}>P. Venta Ant.</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', whiteSpace: 'nowrap' }}>P. Venta Nvo.</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>Stock Ant.</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', whiteSpace: 'nowrap' }}>Stock Nvo.</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Estado</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Notas</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Responsable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockHistory.map((mov) => {
                        const dateObj = new Date(mov.fecha);
                        const displayDate = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        const isEntrada = mov.tipo === 'ENTRADA';
                        return (
                          <tr key={mov.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '7px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}>{displayDate}</td>
                            <td style={{ padding: '7px 10px' }}>
                              <span style={{ color: isEntrada ? '#52c41a' : '#ff4d4f', fontWeight: 'bold', fontSize: '11px' }}>
                                {mov.tipo}
                              </span>
                            </td>
                            <td style={{ padding: '7px 10px', fontSize: '11px' }}>{mov.origen}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                              <span style={{ color: isEntrada ? '#52c41a' : '#ff4d4f', fontSize: '12px' }}>
                                {isEntrada ? '+' : '-'}{Number(mov.cantidad)}
                              </span>
                            </td>
                            {!isVendedor && (
                              <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: '11px', color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                {mov.precio_compra_anterior ? `S/. ${Number(mov.precio_compra_anterior).toFixed(2)}` : '-'}
                              </td>
                            )}
                            {!isVendedor && (
                              <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                {mov.precio_compra_nuevo ? `S/. ${Number(mov.precio_compra_nuevo).toFixed(2)}` : '-'}
                              </td>
                            )}
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: '11px', color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                              {mov.precio_venta_anterior ? `S/. ${Number(mov.precio_venta_anterior).toFixed(2)}` : '-'}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                              {mov.precio_venta_nuevo ? `S/. ${Number(mov.precio_venta_nuevo).toFixed(2)}` : '-'}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: '#888', fontSize: '11px', whiteSpace: 'nowrap' }}>{Number(mov.stock_anterior)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>{Number(mov.stock_nuevo)}</td>
                            <td style={{ padding: '7px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                              {mov.activo_nuevo === true && (
                                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>Activo desde {displayDate}</span>
                              )}
                              {mov.activo_nuevo === false && (
                                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>Inactivo desde {displayDate}</span>
                              )}
                              {(mov.activo_nuevo === null || mov.activo_nuevo === undefined) && '-'}
                            </td>
                            <td style={{ padding: '7px 10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {isVendedor && mov.notas && (mov.notas.toLowerCase().includes('costo') || mov.notas.toLowerCase().includes('compra')) 
                                ? 'Cambio de precio' 
                                : mov.notas}
                            </td>
                            <td style={{ padding: '7px 10px', fontSize: '11px', color: '#888' }}>
                              {mov.usuario_nombre && mov.usuario_rol ? `${mov.usuario_nombre} (${mov.usuario_rol})` : 'Sistema'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Pagination controls */}
            {(!loadingHistory && historyTotalPages > 1) ? (
              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleHistoryPageChange(historyPage - 1)}
                  disabled={historyPage <= 1}
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  Anterior
                </button>
                <span style={{ fontSize: '13px', color: '#666' }}>
                  Página {historyPage} de {historyTotalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleHistoryPageChange(historyPage + 1)}
                  disabled={historyPage >= historyTotalPages}
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  Siguiente
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default Productos;

