import { useState, useEffect } from 'react';
import { proveedoresAPI, comprasAPI } from '../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
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
  
  // Tab 2: Compras
  const [comprasHistory, setComprasHistory] = useState([]);
  const [loadingCompras, setLoadingCompras] = useState(false);
  const [comprasPage, setComprasPage] = useState(1);
  const [comprasTotalPages, setComprasTotalPages] = useState(1);
  const [comprasTotal, setComprasTotal] = useState(0);

  // Tab 3: Precios
  const [preciosHistory, setPreciosHistory] = useState([]);
  const [loadingPrecios, setLoadingPrecios] = useState(false);
  const [preciosPage, setPreciosPage] = useState(1);
  const [preciosTotalPages, setPreciosTotalPages] = useState(1);
  const [preciosTotal, setPreciosTotal] = useState(0);

  const fetchHistory = async (proveedorId, page = 1, fechaDesde = '', fechaHasta = '') => {
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

  const fetchComprasHistory = async (proveedorId, page = 1) => {
    setLoadingCompras(true);
    try {
      const response = await comprasAPI.getAll({ proveedor: proveedorId, page, page_size: historyPageSize });
      const data = response.data;
      setComprasHistory(data.results || []);
      setComprasTotal(data.count || 0);
      setComprasTotalPages(data.total_pages || 1);
      setComprasPage(data.page || 1);
    } catch (error) {
      console.error('Error fetching compras history:', error);
    } finally {
      setLoadingCompras(false);
    }
  };

  const fetchPreciosHistory = async (proveedorId, page = 1) => {
    setLoadingPrecios(true);
    try {
      const response = await proveedoresAPI.getHistoricoPrecios(proveedorId, { page, page_size: historyPageSize });
      const data = response.data;
      setPreciosHistory(data.results || []);
      setPreciosTotal(data.count || 0);
      setPreciosTotalPages(data.total_pages || 1);
      setPreciosPage(data.page || 1);
    } catch (error) {
      console.error('Error fetching precios history:', error);
    } finally {
      setLoadingPrecios(false);
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
    if (tab === 'compras') {
      fetchComprasHistory(proveedorId, 1);
    } else if (tab === 'precios') {
      fetchPreciosHistory(proveedorId, 1);
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
    setComprasHistory([]);
    setPreciosHistory([]);
    setHistoryPage(1);
    setHistoryTotalPages(1);
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

  const handleComprasPageChange = (newPage) => {
    fetchComprasHistory(selectedHistoryProveedor.id, newPage);
  };

  const handlePreciosPageChange = (newPage) => {
    fetchPreciosHistory(selectedHistoryProveedor.id, newPage);
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

    return searchMatch && estadoMatch && contratoMatch && contactoMatch;
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
          <ExportDropdown onExport={handleExportDiario} label="Diario de Modificaciones" />
          <ExportDropdown onExport={handleExportar} label="Exportar Proveedores" />
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            <PlusOutlined style={{ marginRight: '8px' }} /> Nuevo Proveedor
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
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
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento (RUC/DNI)</th>
                <th>Categoría</th>
                <th>Contrato</th>
                <th>Contacto</th>
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
                  <td>{p.identificador}</td>
                  <td>
                    <span className="badge badge-info">{p.categoria}</span>
                  </td>
                  <td>
                    <span className={`badge ${p.tiene_contrato ? 'badge-success' : 'badge-secondary'}`}>
                      {p.tiene_contrato ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td>{p.contacto || '-'}</td>
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
                <tr><td colSpan="9" style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No hay proveedores que coincidan con los filtros</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div style={{ 
          padding: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTop: '1px solid var(--border-color, #e2e8f0)'
        }}>
          <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
            Mostrando {paginatedProveedores.length} de {filteredProveedores.length} proveedores
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary" 
              disabled={safeProveedoresPage === 1}
              onClick={() => setProveedoresPage(prev => prev - 1)}
              style={{ padding: '4px 12px' }}
            >
              Anterior
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {[...Array(proveedoresTotalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  className={`btn ${safeProveedoresPage === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setProveedoresPage(i + 1)}
                  style={{ padding: '4px 10px', minWidth: '32px' }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              className="btn btn-secondary" 
              disabled={safeProveedoresPage === proveedoresTotalPages}
              onClick={() => setProveedoresPage(prev => prev + 1)}
              style={{ padding: '4px 12px' }}
            >
              Siguiente
            </button>
          </div>
        </div>
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
              <h3 className="modal-title">
                Historial: {selectedHistoryProveedor?.nombre} ({selectedHistoryProveedor?.identificador})
              </h3>
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
                className={`tab-btn ${activeTab === 'compras' ? 'active' : ''}`}
                onClick={() => handleTabChange('compras')}
              >
                Historial de Compras
              </button>
              <button 
                className={`tab-btn ${activeTab === 'precios' ? 'active' : ''}`}
                onClick={() => handleTabChange('precios')}
              >
                Historial de Precios
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
                    {(historyFechaDesde || historyFechaHasta) && (
                      <button className="btn btn-secondary" onClick={() => {
                        setHistoryFechaDesde('');
                        setHistoryFechaHasta('');
                        fetchHistory(selectedHistoryProveedor.id, 1, '', '');
                      }} style={{ padding: '5px 14px', fontSize: '13px' }}>
                        Limpiar
                      </button>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                      {historyTotal} registro{historyTotal !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {loadingHistory ? (
                      <div style={{ textAlign: 'center', padding: '40px' }}>Cargando modificaciones...</div>
                    ) : (
                      <table className="table" style={{ width: '100%' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--bg-card, #fff)' }}>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Fecha</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Acción</th>
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
                                  <td>
                                    {dateObj.toLocaleDateString()} <br />
                                    <small style={{ color: 'var(--text-muted, #888)' }}>{dateObj.toLocaleTimeString()}</small>
                                  </td>
                                  <td>
                                    <span style={{ fontWeight: '500', color: 'var(--text-primary, #333)' }}>
                                      {mov.tipo}
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
                    )}
                  </div>
                  
                  {!loadingHistory && historyTotalPages > 1 && (
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
                  )}
                </>
              )}

              {/* TAB 2: COMPRAS */}
              {activeTab === 'compras' && (
                <>
                  <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="table" style={{ width: '100%' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--bg-card, #fff)' }}>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Comprobante</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Fecha</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Estado</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px' }}>Subtotal</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comprasHistory.length > 0 ? (
                          comprasHistory.map((compra) => {
                            const dateObj = new Date(compra.creado_en);
                            return (
                              <tr key={compra.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '7px 10px', fontSize: '11px', fontWeight: '500' }}>{compra.numero_comprobante || `Orden #${compra.id}`}</td>
                                <td style={{ padding: '7px 10px', fontSize: '11px' }}>
                                  {dateObj.toLocaleDateString()} <br />
                                  <small style={{ color: 'var(--text-muted, #888)' }}>{dateObj.toLocaleTimeString()}</small>
                                </td>
                                <td style={{ padding: '7px 10px' }}>
                                  <span style={{ 
                                    color: compra.estado === 'CONFIRMADA' ? '#52c41a' : 
                                           compra.estado === 'CANCELADA' ? '#ff4d4f' : '#faad14',
                                    fontWeight: 'bold',
                                    fontSize: '11px'
                                  }}>
                                    {compra.estado}
                                  </span>
                                </td>
                                <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: '11px' }}>S/. {Number(compra.subtotal).toFixed(2)}</td>
                                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '11px' }}>S/. {Number(compra.total).toFixed(2)}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #888)' }}>
                              No hay registro de compras para este proveedor.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {!loadingCompras && comprasTotalPages > 1 && (
                    <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--border-color)' }}>
                      <button 
                        className="btn btn-secondary" 
                        disabled={comprasPage === 1 || loadingCompras}
                        onClick={() => handleComprasPageChange(comprasPage - 1)}
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        Anterior
                      </button>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Página {comprasPage} de {comprasTotalPages}
                      </span>
                      <button 
                        className="btn btn-secondary" 
                        disabled={comprasPage === comprasTotalPages || loadingCompras}
                        onClick={() => handleComprasPageChange(comprasPage + 1)}
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* TAB 3: PRECIOS */}
              {activeTab === 'precios' && (
                <>
                  <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="table" style={{ width: '100%' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--bg-card, #fff)' }}>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Fecha</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Producto</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Código</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px' }}>Cantidad Suministrada</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px' }}>Precio Unit. Acordado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preciosHistory.length > 0 ? (
                          preciosHistory.map((hp) => {
                            const dateObj = new Date(hp.fecha);
                            return (
                              <tr key={hp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '7px 10px', fontSize: '11px' }}>
                                  {dateObj.toLocaleDateString()} <br />
                                  <small style={{ color: 'var(--text-muted, #888)' }}>{dateObj.toLocaleTimeString()}</small>
                                </td>
                                <td style={{ padding: '7px 10px', fontSize: '11px' }}>{hp.producto_nombre}</td>
                                <td style={{ padding: '7px 10px', fontSize: '11px' }}>{hp.producto_codigo}</td>
                                <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: '11px' }}>
                                  <span style={{ fontSize: '10px', padding: '2px 6px' }} className="badge badge-info">{Number(hp.cantidad).toFixed(2)}</span>
                                </td>
                                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '500', fontSize: '11px' }}>S/. {Number(hp.precio_compra).toFixed(2)}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #888)' }}>
                              No hay registro de productos suministrados recientes.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {!loadingPrecios && preciosTotalPages > 1 && (
                    <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--border-color)' }}>
                      <button 
                        className="btn btn-secondary" 
                        disabled={preciosPage === 1 || loadingPrecios}
                        onClick={() => handlePreciosPageChange(preciosPage - 1)}
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        Anterior
                      </button>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Página {preciosPage} de {preciosTotalPages}
                      </span>
                      <button 
                        className="btn btn-secondary" 
                        disabled={preciosPage === preciosTotalPages || loadingPrecios}
                        onClick={() => handlePreciosPageChange(preciosPage + 1)}
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
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
