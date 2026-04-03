import { useState, useEffect } from 'react';
import { proveedoresAPI, comprasAPI } from '../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';
import ProveedorFormModal from '../components/ProveedorFormModal';

function Proveedores() {
  const [loading, setLoading] = useState(true);
  const [proveedores, setProveedores] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchContacto, setSearchContacto] = useState('');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [filterTipo, setFilterTipo] = useState('ALL');
  const [filterContrato, setFilterContrato] = useState('ALL');
  const [errors, setErrors] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  
  // Pagination
  const PROVEEDORES_PAGE_SIZE = 15;
  const [proveedoresPage, setProveedoresPage] = useState(1);

  // History Modal States
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedHistoryProveedor, setSelectedHistoryProveedor] = useState(null);
  const [activeTab, setActiveTab] = useState('modificaciones'); // 'modificaciones', 'compras', 'precios'
  
  // Tab 1: Modificaciones
  const [proveedorHistory, setProveedorHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(15);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyFechaDesde, setHistoryFechaDesde] = useState('');
  const [historyFechaHasta, setHistoryFechaHasta] = useState('');
  
  // Tab 2: Compra de Productos
  const [productosHistory, setProductosHistory] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [productosPage, setProductosPage] = useState(1);
  const [productosTotalPages, setProductosTotalPages] = useState(1);
  const [productosTotal, setProductosTotal] = useState(0);

  const fetchHistory = async (proveedorId, pageArg = 1, fechaDesde = '', fechaHasta = '') => {
    const page = typeof pageArg === 'number' ? pageArg : 1;
    setLoadingHistory(true);
    try {
      const params = { page, page_size: historyPageSize };
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      const response = await proveedoresAPI.getMovimientos(proveedorId, params);
      const data = response.data;
      setProveedorHistory(data.results || []);
      setHistoryTotal(data.count || 0);
      setHistoryTotalPages(data.total_pages || 1);
      setHistoryPage(data.page || 1);
    } catch (error) {
      console.error('Error fetching history:', error);
      alert('Error al cargar el historial del proveedor.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchProductosHistory = async (proveedorId, pageArg = 1) => {
    const page = typeof pageArg === 'number' ? pageArg : 1;
    setLoadingProductos(true);
    try {
      const response = await comprasAPI.getKardexGlobalProductos({ proveedor: proveedorId, page, page_size: historyPageSize });
      const data = response.data;
      setProductosHistory(data.results || []);
      setProductosTotal(data.count || 0);
      setProductosTotalPages(data.total_pages || 1);
      setProductosPage(data.page || 1);
    } catch (error) {
      console.error('Error fetching productos history:', error);
    } finally {
      setLoadingProductos(false);
    }
  };
  
  const openModal = (mode, proveedor = null) => {
    setModalMode(mode);
    if (proveedor) {
      setSelectedProveedor(proveedor);
    } else {
      setSelectedProveedor(null);
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedProveedor(null);
    setErrors({});
  };

  const fetchProveedores = async () => {
    try {
      const response = await proveedoresAPI.getAll();
      setProveedores(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching proveedores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, []);
  const handleDeleteClick = (proveedor) => {
    setConfirmDialog({ visible: true, id: proveedor.id, nombre: proveedor.nombre });
  };

  const handleDelete = async () => {
    try {
      await proveedoresAPI.delete(confirmDialog.id);
      setConfirmDialog({ visible: false, id: null, nombre: '' });
      fetchProveedores();
    } catch (error) {
      console.error('Error deleting proveedor:', error);
      alert('Error al eliminar el proveedor.');
    }
  };
  const handleExportar = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await proveedoresAPI.exportar(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `proveedores_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar proveedores:', error);
      alert('Error al exportar datos.');
    }
  };

  const handleExportDiario = async (periodo, anio) => {
    try {
      const response = await proveedoresAPI.exportarDiarioMovimientos({ periodo, anio });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `diario_historial_proveedores_${periodo}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar diario:', error);
      alert('Error al exportar el diario de modificaciones.');
    }
  };

  const handleExportHistorialIndividual = async () => {
    try {
      const response = await proveedoresAPI.exportarMovimientos(selectedHistoryProveedor.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_${selectedHistoryProveedor.identificador}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar historial:', error);
      alert('Error al exportar el historial del proveedor.');
    }
  };

  const handleTabChange = async (tab, proveedorId = selectedHistoryProveedor.id) => {
    setActiveTab(tab);
    if (tab === 'productos') {
      fetchProductosHistory(proveedorId, 1);
    }
  };

  const handleViewHistory = async (proveedor) => {
    setSelectedHistoryProveedor(proveedor);
    setHistoryModalVisible(true);
    setHistoryFechaDesde('');
    setHistoryFechaHasta('');
    setActiveTab('modificaciones');
    fetchHistory(proveedor.id, 1, '', '');
  };

  const closeHistoryModal = () => {
    setHistoryModalVisible(false);
    setSelectedHistoryProveedor(null);
    setProveedorHistory([]);
    setProductosHistory([]);
    setProductosPage(1);
    setProductosTotalPages(1);
    setHistoryFechaDesde('');
    setHistoryFechaHasta('');
    setActiveTab('modificaciones');
  };

  const handleHistoryFilter = () => {
    fetchHistory(selectedHistoryProveedor.id, 1, historyFechaDesde, historyFechaHasta);
  };

  const handleHistoryPageChange = (newPage) => {
    fetchHistory(selectedHistoryProveedor.id, newPage, historyFechaDesde, historyFechaHasta);
  };

  const handleProductosPageChange = (newPage) => {
    fetchProductosHistory(selectedHistoryProveedor.id, newPage);
  };

  const filteredProveedores = proveedores.filter(p => {
    const term = searchTerm.toLowerCase();
    const searchMatch = (p.nombre || '').toLowerCase().includes(term) || 
                       (p.identificador || '').toLowerCase().includes(term);
    
    const estadoMatch = filterEstado === 'ALL' ? true : 
                       (filterEstado === 'ACTIVO' ? p.activo : !p.activo);

    const contratoMatch = filterContrato === 'ALL' ? true :
                         (filterContrato === 'SI' ? p.tiene_contrato : !p.tiene_contrato);

    const contactoMatch = (p.contacto || '').toLowerCase().includes(searchContacto.toLowerCase());
    const tipoMatch = filterTipo === 'ALL' ? true : p.tipo_proveedor === filterTipo;
    return searchMatch && estadoMatch && contratoMatch && contactoMatch && tipoMatch;
  });

  // Pagination Logic
  const proveedoresTotalPages = Math.max(1, Math.ceil(filteredProveedores.length / PROVEEDORES_PAGE_SIZE));
  const safeProveedoresPage = Math.min(proveedoresPage, proveedoresTotalPages);
  const paginatedProveedores = filteredProveedores.slice(
    (safeProveedoresPage - 1) * PROVEEDORES_PAGE_SIZE,
    safeProveedoresPage * PROVEEDORES_PAGE_SIZE
  );

  // Reset to page 1 when any filter changes
  const handleSearchChange = (val) => { setSearchTerm(val); setProveedoresPage(1); };
  const handleSearchContactoChange = (val) => { setSearchContacto(val); setProveedoresPage(1); };
  const handleFilterEstadoChange = (val) => { setFilterEstado(val); setProveedoresPage(1); };
  const handleFilterTipoChange = (val) => { setFilterTipo(val); setProveedoresPage(1); };
  const handleFilterContratoChange = (val) => { setFilterContrato(val); setProveedoresPage(1); };

  return (
    <div>
      <ConfirmDialog
        visible={confirmDialog.visible}
        title="Eliminar Proveedor"
        message={`¿Estás seguro de que deseas eliminar "${confirmDialog.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDialog({ visible: false, id: null, nombre: '' })}
        confirmText="Sí, eliminar"
        danger={true}
      />
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Proveedores</h1>
          <p className="page-subtitle">Gestión de proveedores y histórico de modificaciones</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ExportDropdown onExport={handleExportDiario} label="Exportar Historial Global" />
          <ExportDropdown onExport={handleExportar} label="Exportar Proveedores" />
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            <PlusOutlined style={{ marginRight: '8px' }} /> Nuevo Proveedor
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Buscar Proveedor</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por nombre o documento..." 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Buscar Contacto</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Nombre del contacto..." 
              value={searchContacto}
              onChange={(e) => handleSearchContactoChange(e.target.value)}
            />
          </div>
          <div style={{ width: '150px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Estado</label>
            <select 
              className="form-input" 
              value={filterEstado}
              onChange={(e) => handleFilterEstadoChange(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>
          </div>
          <div style={{ width: '150px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Contrato</label>
            <select 
              className="form-input" 
              value={filterContrato}
              onChange={(e) => handleFilterContratoChange(e.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="SI">Con Contrato</option>
              <option value="NO">Sin Contrato</option>
            </select>
          </div>
          <div style={{ width: '150px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Tipo</label>
            <select 
              className="form-input" 
              value={filterTipo}
              onChange={(e) => handleFilterTipoChange(e.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="PERSONA_NATURAL">Persona Natural</option>
              <option value="EMPRESA">Empresa</option>
            </select>
          </div>
          <button
            className="btn btn-secondary"
            style={{ height: '38px' }}
            onClick={() => {
              setSearchTerm('');
              setSearchContacto('');
              setFilterEstado('ALL');
              setFilterContrato('ALL');
              setFilterTipo('ALL');
              setProveedoresPage(1);
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
                <th>Nombre</th>
                <th>Documento</th>
                <th>Categoría</th>
                <th>Contrato</th>
                <th>Contacto</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Crédito</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProveedores.map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>
                        {p.identificador}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '500' }}>
                        {p.tipo_documento}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info">{p.categoria}</span>
                  </td>
                  <td>
                    <span className={`badge ${p.tiene_contrato ? 'badge-success' : 'badge-secondary'}`}>
                      {p.tiene_contrato ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td>{p.contacto || '-'}</td>
                  <td>{p.email || '-'}</td>
                  <td>{p.telefono || '-'}</td>
                  <td>
                    {p.limite_credito > 0 
                      ? `S/. ${p.limite_credito} (${p.dias_credito} días)`
                      : '-'
                    }
                  </td>
                  <td>
                    <span className={`badge ${p.activo ? 'badge-success' : 'badge-danger'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => handleViewHistory(p)} title="Ver Historial" style={{ marginRight: '8px' }}>
                      <HistoryOutlined />
                    </button>
                    <button className="btn btn-secondary" onClick={() => openModal('edit', p)} style={{ marginRight: '4px' }}>
                      <EditOutlined />
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteClick(p)}>
                      <DeleteOutlined />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedProveedores.length === 0 && (
                <tr><td colSpan="10" style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No hay proveedores que coincidan con los filtros</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        <Pagination 
          currentPage={safeProveedoresPage}
          totalPages={proveedoresTotalPages}
          onPageChange={setProveedoresPage}
          pageSize={PROVEEDORES_PAGE_SIZE}
          totalItems={filteredProveedores.length}
          itemName="proveedores"
        />
      </div>

      <ProveedorFormModal 
        visible={modalVisible}
        mode={modalMode}
        initialData={selectedProveedor}
        onClose={closeModal}
        onSave={() => {
          fetchProveedores();
          closeModal();
        }}
      />

      {historyModalVisible && (
        <div className="modal-overlay" onClick={closeHistoryModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '960px', width: '95vw' }}>
            <div className="modal-header">
              <div style={{ flex: 1 }}>
                <h3 className="modal-title">Historial de Proveedor</h3>
                <p className="modal-subtitle">
                  {selectedHistoryProveedor?.nombre} ({selectedHistoryProveedor?.identificador})
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={handleExportHistorialIndividual} style={{ padding: '4px 12px', fontSize: '12px' }}>
                  Exportar Excel
                </button>
                <button className="modal-close" onClick={closeHistoryModal}>x</button>
              </div>
            </div>
            
            {/* Tabs Navigation */}
            <div className="tab-navigation">
              <button 
                className={`tab-btn ${activeTab === 'modificaciones' ? 'active' : ''}`}
                onClick={() => handleTabChange('modificaciones')}
              >
                Modificaciones de Estado
              </button>
              <button 
                className={`tab-btn ${activeTab === 'productos' ? 'active' : ''}`}
                onClick={() => handleTabChange('productos')}
              >
                Historial de Compra de Productos
              </button>
            </div>

            <div className="modal-body" style={{ minHeight: '400px' }}>
              
              {/* TAB 1: MODIFICACIONES */}
              {activeTab === 'modificaciones' && (
                <>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                      <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Desde</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={historyFechaDesde} 
                        onChange={(e) => setHistoryFechaDesde(e.target.value)}
                        style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Hasta</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={historyFechaHasta} 
                        onChange={(e) => setHistoryFechaHasta(e.target.value)}
                        style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }}
                      />
                    </div>
                    <button className="btn btn-primary" onClick={handleHistoryFilter} disabled={loadingHistory} style={{ padding: '5px 14px', fontSize: '13px' }}>
                      Filtrar
                    </button>
                    <button className="btn btn-secondary" onClick={() => {
                      setHistoryFechaDesde('');
                      setHistoryFechaHasta('');
                      fetchHistory(selectedHistoryProveedor.id, 1, '', '');
                    }} style={{ padding: '5px 14px', fontSize: '13px' }}>
                      Limpiar
                    </button>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                      {historyTotal} registro{historyTotal !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                    <table className="table" style={{ width: '100%', minWidth: '1000px' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--bg-card, #fff)' }}>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap' }}>Fecha</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap' }}>Acción</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Detalle</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Estado</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Contrato</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proveedorHistory.length > 0 ? (
                            proveedorHistory.map((mov, index) => {
                              const dateObj = new Date(mov.fecha);
                              return (
                                <tr key={mov.id}>
                                  <td style={{ whiteSpace: 'nowrap' }}>
                                    {(() => {
                                      const d = new Date(mov.fecha);
                                      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                    })()}
                                  </td>
                                  <td>
                                    <span style={{ fontWeight: '500', color: 'var(--text-primary, #333)' }}>
                                      {(() => {
                                        const typeMap = {
                                          'CREACION': 'Registro Inicial',
                                          'ESTADO_ACTIVO': 'Activación',
                                          'ESTADO_INACTIVO': 'Desactivación',
                                          'CONTRATO_SI': 'Contrato Registrado',
                                          'CONTRATO_NO': 'Contrato Retirado',
                                          'OTRO': 'Modificación'
                                        };
                                        return typeMap[mov.tipo] || mov.tipo;
                                      })()}
                                    </span>
                                  </td>
                                  <td>{mov.descripcion}</td>
                                  <td>
                                    <span style={{ color: mov.activo_nuevo ? '#52c41a' : '#ff4d4f', fontWeight: 'bold', fontSize: '11px' }}>
                                      {mov.activo_nuevo ? 'Activo' : 'Inactivo'}
                                    </span>
                                  </td>
                                  <td>
                                    <span style={{ color: mov.contrato_nuevo ? '#52c41a' : '#faad14', fontWeight: 'bold', fontSize: '11px' }}>
                                      {mov.contrato_nuevo ? 'Sí' : 'No'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #888)' }}>
                                No se encontraron registros de modificaciones para este proveedor.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                  </div>
                  
                  {(!loadingHistory && historyTotalPages > 1) ? (
                    <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--border-color)' }}>
                      <button 
                        className="btn btn-secondary" 
                        disabled={historyPage === 1 || loadingHistory}
                        onClick={() => handleHistoryPageChange(historyPage - 1)}
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        Anterior
                      </button>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Página {historyPage} de {historyTotalPages}
                      </span>
                      <button 
                        className="btn btn-secondary" 
                        disabled={historyPage === historyTotalPages || loadingHistory}
                        onClick={() => handleHistoryPageChange(historyPage + 1)}
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        Siguiente
                      </button>
                    </div>
                  ) : null}
                </>
              )}

              {/* TAB 2: COMPRA DE PRODUCTOS */}
              {activeTab === 'productos' && (
                <>
                  <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                    <table className="table" style={{ fontSize: '11px', width: '100%', minWidth: '1200px' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--bg-card, #fff)' }}>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ whiteSpace: 'nowrap' }}>Fecha</th>
                            <th style={{ whiteSpace: 'nowrap' }}>Tipo de comprobante</th>
                            <th>Comprobante</th>
                            <th>Proveedor</th>
                            <th>Producto</th>
                            <th>Código de Producto</th>
                            <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Cantidad</th>
                            <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Precio de compra</th>
                            <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Descuento</th>
                            <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Impuesto</th>
                            <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productosHistory.length > 0 ? (
                            productosHistory.map((p) => (
                              <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  {(() => {
                                    const d = new Date(p.fecha);
                                    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                  })()}
                                </td>
                                <td>{p.tipo_comprobante}</td>
                                <td>{p.numero_comprobante}</td>
                                <td>{p.proveedor_nombre}</td>
                                <td style={{ fontWeight: 600 }}>{p.producto_nombre}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{p.producto_codigo}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.cantidad}</td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>S/. {Number(p.precio_compra).toFixed(2)}</td>
                                <td style={{ textAlign: 'right', color: '#ff4d4f', whiteSpace: 'nowrap' }}>-S/. {Number(p.descuento || 0).toFixed(2)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--primary-color)', whiteSpace: 'nowrap' }}>+S/. {Number(p.impuesto || 0).toFixed(2)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>S/. {Number(p.total).toFixed(2)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #888)' }}>
                                No hay registro de compra de productos para este proveedor.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                  </div>
                  
                  {(!loadingProductos && productosTotalPages > 1) ? (
                    <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--border-color)' }}>
                      <button 
                        className="btn btn-secondary" 
                        disabled={productosPage === 1 || loadingProductos}
                        onClick={() => handleProductosPageChange(productosPage - 1)}
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        Anterior
                      </button>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Página {productosPage} de {productosTotalPages}
                      </span>
                      <button 
                        className="btn btn-secondary" 
                        disabled={productosPage === productosTotalPages || loadingProductos}
                        onClick={() => handleProductosPageChange(productosPage + 1)}
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        Siguiente
                      </button>
                    </div>
                  ) : null}
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Proveedores;
