import { useState, useEffect } from 'react';
import { capitalAPI } from '../services/api';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  HistoryOutlined, 
  FileExcelOutlined,
  SettingOutlined
} from '@ant-design/icons';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';
import SearchableSelect from '../components/SearchableSelect';
import { message } from 'antd';

function Capital() {
  const [loading, setLoading] = useState(true);
  const [capitales, setCapitales] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCapital, setSelectedCapital] = useState(null);
  const [tipos, setTipos] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  const [confirmTipoDialog, setConfirmTipoDialog] = useState({ visible: false, id: null, nombre: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');
  const [filterEstadoCapital, setFilterEstadoCapital] = useState('ALL');
  const [filterTipoCapital, setFilterTipoCapital] = useState('ALL');
  const [formData, setFormData] = useState({
    tipo: '',
    nombre: '',
    descripcion: '',
    valor_inicial: 0,
    valor_actual: 0,
    fecha_adquisicion: '',
    vida_util_anios: '',
    cuenta: '',
    banco: '',
    estado: 'ACTIVO',
    notas: '',
  });

  // Kardex (History) Modal
  const [kardexVisible, setKardexVisible] = useState(false);
  const [kardexCapital, setKardexCapital] = useState(null);
  const [kardexData, setKardexData] = useState([]);
  const [kardexLoading, setKardexLoading] = useState(false);
  const [kardexPage, setKardexPage] = useState(1);
  const [kardexTotalPages, setKardexTotalPages] = useState(1);
  const [kardexTotal, setKardexTotal] = useState(0);
  const [kardexFechaDesde, setKardexFechaDesde] = useState('');
  const [kardexFechaHasta, setKardexFechaHasta] = useState('');

  // New Type Modal
  const [tipoModalVisible, setTipoModalVisible] = useState(false);
  const [tipoPage, setTipoPage] = useState(1);
  const [tipoModalMode, setTipoModalMode] = useState('create');
  const [editingTipoId, setEditingTipoId] = useState(null);
  const [tipoFormData, setTipoFormData] = useState({
    nombre: '',
    tipo: 'BIEN',
    descripcion: '',
    activo: true
  });

  // Pagination
  const CAPITAL_PAGE_SIZE = 15;
  const [capitalPage, setCapitalPage] = useState(1);

  useEffect(() => {
    fetchCapital();
    fetchResumen();
    fetchTipos();
  }, []);

  const fetchCapital = async () => {
    try {
      const response = await capitalAPI.getAll();
      setCapitales(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching capital:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtering logic
  const filteredCapitales = capitales.filter(c => {
    const term = searchTerm.toLowerCase();
    const searchMatch = (c.nombre || '').toLowerCase().includes(term) || 
                        (c.tipo_nombre || '').toLowerCase().includes(term);
    const estadoMatch = filterEstadoCapital === 'ALL' ? true : c.estado === filterEstadoCapital;
    const tipoMatch = filterTipoCapital === 'ALL' ? true : String(c.tipo) === filterTipoCapital;
    
    // Date range match (using creado_en)
    const recordDate = new Date(c.creado_en).toISOString().split('T')[0];
    if (filterFechaInicio && recordDate < filterFechaInicio) return false;
    if (filterFechaFin && recordDate > filterFechaFin) return false;

    return searchMatch && estadoMatch && tipoMatch;
  });

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredCapitales.length / CAPITAL_PAGE_SIZE));
  const safePage = Math.min(capitalPage, totalPages);
  const paginatedCapitales = filteredCapitales.slice(
    (safePage - 1) * CAPITAL_PAGE_SIZE,
    safePage * CAPITAL_PAGE_SIZE
  );

  const fetchResumen = async () => {
    try {
      const response = await capitalAPI.getResumen();
      setResumen(response.data);
    } catch (error) {
      console.error('Error fetching resumen:', error);
    }
  };

  const fetchTipos = async () => {
    try {
      const response = await capitalAPI.getTipos();
      setTipos(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching tipos:', error);
    }
  };

  const openModal = (mode, capital = null) => {
    setModalMode(mode);
    if (capital) {
      setSelectedCapital(capital);
      setFormData({
        tipo: capital.tipo || '',
        nombre: capital.nombre || '',
        descripcion: capital.descripcion || '',
        valor_inicial: capital.valor_inicial || 0,
        valor_actual: capital.valor_actual || 0,
        fecha_adquisicion: capital.fecha_adquisicion || '',
        vida_util_anios: capital.vida_util_anios || '',
        cuenta: capital.cuenta || '',
        banco: capital.banco || '',
        estado: capital.estado || 'ACTIVO',
        notas: capital.notas || '',
      });
    } else {
      setFormData({
        tipo: '',
        nombre: '',
        descripcion: '',
        valor_inicial: 0,
        valor_actual: 0,
        fecha_adquisicion: '',
        vida_util_anios: '',
        cuenta: '',
        banco: '',
        estado: 'ACTIVO',
        notas: '',
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedCapital(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.tipo) {
      alert('Debe seleccionar un tipo de capital.');
      return;
    }

    try {
      const submitData = {
        ...formData,
        valor_inicial: Number(formData.valor_inicial || 0),
        valor_actual: Number(formData.valor_actual || 0),
        vida_util_anios: formData.vida_util_anios ? Number(formData.vida_util_anios) : null
      };

      if (modalMode === 'create') {
        await capitalAPI.create(submitData);
      } else {
        await capitalAPI.update(selectedCapital.id, submitData);
      }
      closeModal();
      fetchCapital();
      fetchResumen();
    } catch (error) {
      console.error('Error saving capital:', error);
      alert(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDeleteClick = (capital) => {
    setConfirmDialog({ visible: true, id: capital.id, nombre: capital.nombre });
  };

  const handleDeleteConfirm = async () => {
    try {
      await capitalAPI.delete(confirmDialog.id);
      setConfirmDialog({ visible: false, id: null, nombre: '' });
      fetchCapital();
      fetchResumen();
    } catch (error) {
      console.error('Error deleting capital:', error);
      alert('Error al eliminar el registro de capital.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Pagination for Capital Types (Sub-modal)
  const TIPO_PAGE_SIZE = 5;
  const totalTipoPages = Math.ceil(tipos.length / TIPO_PAGE_SIZE);
  const safeTipoPage = Math.min(tipoPage, totalTipoPages || 1);
  const paginatedTipos = tipos.slice(
    (safeTipoPage - 1) * TIPO_PAGE_SIZE,
    safeTipoPage * TIPO_PAGE_SIZE
  );

  const handleTipoChange = (e) => {
    const { name, value } = e.target;
    setTipoFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetTipoForm = () => {
    setTipoFormData({
      nombre: '',
      tipo: 'BIEN',
      descripcion: '',
      activo: true
    });
    setTipoModalMode('create');
    setEditingTipoId(null);
  };

  const handleEditTipo = (tipoObj) => {
    setTipoModalMode('edit');
    setEditingTipoId(tipoObj.id);
    setTipoFormData({
      nombre: tipoObj.nombre,
      tipo: tipoObj.tipo,
      descripcion: tipoObj.descripcion || '',
      activo: tipoObj.activo !== undefined ? tipoObj.activo : true
    });
  };

  const handleToggleTipoActive = async (tipoObj) => {
    try {
      const nuevoEstado = !tipoObj.activo;
      await capitalAPI.updateTipo(tipoObj.id, { activo: nuevoEstado });
      message.success(`Tipo de capital ${nuevoEstado ? 'activado' : 'desactivado'} con éxito`);
      fetchTipos();
    } catch (error) {
      console.error('Error toggling tipo status:', error);
      message.error('Error al cambiar el estado del tipo de capital');
    }
  };

  const handleDeleteTipo = (tipoObj) => {
    setConfirmTipoDialog({ visible: true, id: tipoObj.id, nombre: tipoObj.nombre });
  };

  const handleDeleteTipoConfirm = async () => {
    if (!confirmTipoDialog.id) return;
    try {
      await capitalAPI.deleteTipo(confirmTipoDialog.id);
      message.success('Tipo de capital eliminado con éxito');
      fetchTipos();
      setConfirmTipoDialog({ visible: false, id: null, nombre: '' });
    } catch (error) {
      console.error('Error deleting tipo:', error);
      const isConstraintError = error.response?.status === 400 || error.response?.data?.detail?.includes('asociados');
      if (isConstraintError) {
        message.warning('No se puede eliminar: este tipo de capital tiene registros asociados. Te recomendamos desactivarlo en su lugar.');
      } else {
        message.error('Error al eliminar el tipo de capital.');
      }
      setConfirmTipoDialog({ visible: false, id: null, nombre: '' });
    }
  };

  const handleTipoSubmit = async (e) => {
    e.preventDefault();
    if (!tipoFormData.nombre) {
      message.error('El nombre del tipo es obligatorio');
      return;
    }
    try {
      let response;
      if (tipoModalMode === 'create') {
        response = await capitalAPI.createTipo(tipoFormData);
      } else {
        response = await capitalAPI.updateTipo(editingTipoId, tipoFormData);
      }
      
      fetchTipos();
      
      if (tipoModalMode === 'create') {
        setFormData(prev => ({ ...prev, tipo: response.data.id }));
        setTipoModalVisible(false);
      }
      
      message.success(`Tipo de capital ${tipoModalMode === 'create' ? 'creado' : 'actualizado'} con éxito`);
      resetTipoForm();
    } catch (error) {
      console.error(`Error ${tipoModalMode === 'create' ? 'creating' : 'updating'} tipo:`, error);
      message.error(`Error al ${tipoModalMode === 'create' ? 'crear' : 'actualizar'} el tipo de capital`);
    }
  };

  // ─── Kardex functions ─────────────────────────────────────────────────────
  const fetchKardex = async (capitalId, page = 1, fechaDesde = '', fechaHasta = '') => {
    setKardexLoading(true);
    try {
      const params = { page, page_size: 15 };
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      const response = await capitalAPI.getHistorial(capitalId, params);
      const data = response.data;
      setKardexData(data.results || []);
      setKardexTotal(data.count || 0);
      setKardexTotalPages(data.total_pages || 1);
      setKardexPage(data.page || 1);
    } catch (error) {
      console.error('Error fetching kardex:', error);
    } finally {
      setKardexLoading(false);
    }
  };

  const openKardex = (capital) => {
    setKardexCapital(capital);
    setKardexVisible(true);
    setKardexFechaDesde('');
    setKardexFechaHasta('');
    fetchKardex(capital.id, 1, '', '');
  };

  const closeKardex = () => {
    setKardexVisible(false);
    setKardexCapital(null);
    setKardexData([]);
    setKardexPage(1);
    setKardexTotalPages(1);
    setKardexFechaDesde('');
    setKardexFechaHasta('');
  };

  const handleKardexExport = async () => {
    try {
      const response = await capitalAPI.exportarHistorial(kardexCapital.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_capital_${kardexCapital.nombre}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting kardex:', error);
      alert('Error al exportar el historial.');
    }
  };

  const handleExportarCapital = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await capitalAPI.exportar(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `capital_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting capital:', error);
      alert('Error al exportar capital.');
    }
  };

  const handleExportarHistorialGlobal = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await capitalAPI.exportarHistorialGlobal(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_global_capital_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting global historial:', error);
      alert('Error al exportar historial global.');
    }
  };

  return (
    <div>
      <ConfirmDialog
        visible={confirmDialog.visible}
        title="Eliminar Registro de Capital"
        message={`¿Estás seguro de que deseas eliminar "${confirmDialog.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDialog({ visible: false, id: null, nombre: '' })}
        confirmText="Sí, eliminar"
        danger={true}
      />
      <ConfirmDialog 
        visible={confirmTipoDialog.visible}
        onCancel={() => setConfirmTipoDialog({ visible: false, id: null, nombre: '' })}
        onConfirm={handleDeleteTipoConfirm}
        title="Eliminar Tipo de Capital"
        message={`¿Estás seguro de que deseas eliminar el tipo "${confirmTipoDialog.nombre}"? Los registros que usen este tipo de capital perderán su referencia, pero no serán eliminados.`}
        confirmText="Sí, eliminar tipo"
        danger={true}
      />
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Capital</h1>
          <p className="page-subtitle">Gestión de capital y activos del negocio</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <ExportDropdown onExport={handleExportarHistorialGlobal} label="Exportar Historial Global" />
          <ExportDropdown onExport={handleExportarCapital} label="Exportar Capital" />
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            <PlusOutlined /> Nuevo Capital
          </button>
        </div>
      </div>

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-3" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-label">Capital Total</div>
            <div className="stat-value">S/. {Number(resumen.capital_total || 0).toFixed(2)}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Dinero en Efectivo/Banco</div>
            <div className="stat-value">S/. {Number(resumen.total_dinero || 0).toFixed(2)}</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-label">Valor en Bienes</div>
            <div className="stat-value">S/. {Number(resumen.total_bienes || 0).toFixed(2)}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Buscar</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por nombre o tipo..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCapitalPage(1); }}
            />
          </div>
          <div style={{ width: '150px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Desde</label>
            <input 
              type="date" 
              className="form-input" 
              value={filterFechaInicio}
              onChange={(e) => { setFilterFechaInicio(e.target.value); setCapitalPage(1); }}
            />
          </div>
          <div style={{ width: '150px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Hasta</label>
            <input 
              type="date" 
              className="form-input" 
              value={filterFechaFin}
              onChange={(e) => { setFilterFechaFin(e.target.value); setCapitalPage(1); }}
            />
          </div>
          <div style={{ width: '180px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Estado</label>
            <select 
              className="form-input" 
              value={filterEstadoCapital}
              onChange={(e) => { setFilterEstadoCapital(e.target.value); setCapitalPage(1); }}
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
              <option value="VENDIDO">Vendido</option>
            </select>
          </div>
          <div style={{ width: '200px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Categoría</label>
            <select 
              className="form-input" 
              value={filterTipoCapital}
              onChange={(e) => { setFilterTipoCapital(e.target.value); setCapitalPage(1); }}
            >
              <option value="ALL">Todas las categorías</option>
              {tipos.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ height: '38px' }}
            onClick={() => {
              setSearchTerm('');
              setFilterEstadoCapital('ALL');
              setFilterFechaInicio('');
              setFilterFechaFin('');
              setFilterTipoCapital('ALL');
              setCapitalPage(1);
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
                <th>Fecha de Registro</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Valor Inicial</th>
                <th>Valor Actual</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCapitales.map((capital) => (
                <tr key={capital.id}>
                  <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {new Date(capital.creado_en).toLocaleDateString('es-PE', {
                      year: 'numeric', month: '2-digit', day: '2-digit',
                    })}
                  </td>
                  <td>{capital.nombre}</td>
                  <td>{capital.tipo_nombre || '-'}</td>
                  <td>
                    <span className={`badge ${capital.tipo_tipo === 'DINERO' ? 'badge-info' : 'badge-warning'}`}>
                      {capital.tipo_tipo || '-'}
                    </span>
                  </td>
                  <td>S/. {Number(capital.valor_inicial || 0).toFixed(2)}</td>
                  <td>S/. {Number(capital.valor_actual || 0).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${
                      capital.estado === 'ACTIVO' ? 'badge-success' :
                      capital.estado === 'VENDIDO' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {capital.estado}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" title="Historial (Kardex)" onClick={() => openKardex(capital)} style={{ marginRight: '4px' }}>
                      <HistoryOutlined />
                    </button>
                    <button className="btn btn-secondary" onClick={() => openModal('edit', capital)} style={{ marginRight: '4px' }}>
                      <EditOutlined />
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteClick(capital)}>
                      <DeleteOutlined />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCapitalPage}
          pageSize={CAPITAL_PAGE_SIZE}
          totalItems={filteredCapitales.length}
          itemName="registros de capital"
        />
      </div>

      {modalVisible && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'create' ? 'Nuevo Capital' : 'Editar Capital'}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Tipo</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <SearchableSelect
                          options={tipos
                            .filter(t => t.activo !== false)
                            .map(t => ({ id: t.id, nombre: t.nombre }))}
                          value={formData.tipo}
                          onChange={(val) => setFormData({ ...formData, tipo: val })}
                          placeholder="Seleccionar tipo..."
                          disabled={loading}
                        />
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => setTipoModalVisible(true)}
                        title="Gestionar Tipos de Capital"
                        style={{ height: '42px', padding: '0 12px', whiteSpace: 'nowrap' }}
                      >
                        <PlusOutlined />
                      </button>
                    </div>
                    <p className="field-hint" style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                      Selecciona un tipo existente o gestiona la lista.
                    </p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input
                      type="text"
                      name="nombre"
                      className="form-input"
                      value={formData.nombre}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea
                    name="descripcion"
                    className="form-input"
                    value={formData.descripcion}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Valor Inicial *</label>
                    <input
                      type="number"
                      name="valor_inicial"
                      className="form-input"
                      value={formData.valor_inicial}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Valor Actual *</label>
                    <input
                      type="number"
                      name="valor_actual"
                      className="form-input"
                      value={formData.valor_actual}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Fecha de Adquisición</label>
                    <input
                      type="date"
                      name="fecha_adquisicion"
                      className="form-input"
                      value={formData.fecha_adquisicion}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vida Útil (años)</label>
                    <input
                      type="number"
                      name="vida_util_anios"
                      className="form-input"
                      value={formData.vida_util_anios}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()}
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Cuenta</label>
                    <input
                      type="text"
                      name="cuenta"
                      className="form-input"
                      value={formData.cuenta}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Banco</label>
                    <input
                      type="text"
                      name="banco"
                      className="form-input"
                      value={formData.banco}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select
                    name="estado"
                    className="form-input"
                    value={formData.estado}
                    onChange={handleChange}
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                    <option value="VENDIDO">Vendido</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <textarea
                    name="notas"
                    className="form-input"
                    value={formData.notas}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'create' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal para Nuevo Tipo de Capital */}
      {tipoModalVisible && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => {
          setTipoModalVisible(false);
          resetTipoForm();
        }}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{tipoModalMode === 'create' ? 'Nuevo Tipo de Capital' : 'Editar Tipo de Capital'}</h3>
              <button className="modal-close" onClick={() => {
                setTipoModalVisible(false);
                resetTipoForm();
              }}>×</button>
            </div>
            <form onSubmit={handleTipoSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    name="nombre"
                    className="form-input"
                    value={tipoFormData.nombre}
                    onChange={handleTipoChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoría *</label>
                  <select
                    name="tipo"
                    className="form-input"
                    value={tipoFormData.tipo}
                    onChange={handleTipoChange}
                    required
                  >
                    <option value="BIEN">Bien/Activo Fijo</option>
                    <option value="DINERO">Dinero en Efectivo/Banco</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input 
                      type="checkbox" 
                      checked={tipoFormData.activo} 
                      onChange={(e) => setTipoFormData(prev => ({ ...prev, activo: e.target.checked }))} 
                    />
                    Este tipo de capital está activo (disponible para nuevos registros)
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea
                    name="descripcion"
                    className="form-input"
                    value={tipoFormData.descripcion}
                    onChange={handleTipoChange}
                    rows={2}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  if (tipoModalMode === 'edit') {
                    resetTipoForm();
                  } else {
                    setTipoModalVisible(false);
                  }
                }}>
                  {tipoModalMode === 'edit' ? 'Cancelar Edición' : 'Cancelar'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {tipoModalMode === 'create' ? 'Crear Tipo' : 'Guardar Cambios'}
                </button>
              </div>
            </form>

            {/* Listado de Tipos Existentes */}
            <div className="modal-body" style={{ borderTop: '1px solid #eee', marginTop: '16px' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>Tipos de Capital Existentes</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#666' }}>
                      <th>Nombre</th>
                      <th>Cat.</th>
                      <th>Estado</th>
                      <th>Uso</th>
                      <th style={{ textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody style={{ minHeight: '150px' }}>
                    {paginatedTipos.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f5f5f5', opacity: t.activo ? 1 : 0.6 }}>
                        <td style={{ padding: '8px 0' }}>
                           <div style={{ fontWeight: 500 }}>{t.nombre}</div>
                        </td>
                        <td style={{ padding: '8px 0' }}>
                          <span className={`badge ${t.tipo === 'DINERO' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                            {t.tipo}
                          </span>
                        </td>
                        <td style={{ padding: '8px 0' }}>
                          <span 
                            onClick={() => handleToggleTipoActive(t)}
                            style={{ 
                              cursor: 'pointer',
                              padding: '1px 6px', 
                              borderRadius: '10px', 
                              fontSize: '10px', 
                              fontWeight: 600,
                              background: t.activo ? '#f6ffed' : '#fff1f0',
                              color: t.activo ? '#52c41a' : '#ff4d4f',
                              border: `1px solid ${t.activo ? '#b7eb8f' : '#ffa39e'}`
                            }}
                          >
                            {t.activo ? 'ACT' : 'INA'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 0', fontSize: '11px', color: '#888' }}>
                          {t.capital_count || 0} reg.
                        </td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>
                          <button 
                            className="btn btn-info" 
                            style={{ padding: '2px 8px', fontSize: '12px', marginRight: '4px' }}
                            onClick={() => handleEditTipo(t)}
                            title="Editar"
                          >
                            <EditOutlined />
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '2px 8px', fontSize: '12px', opacity: (t.capital_count > 0) ? 0.5 : 1 }}
                            onClick={() => handleDeleteTipo(t)}
                            title={(t.capital_count > 0) ? "No se puede eliminar (tiene registros)" : "Eliminar"}
                            disabled={t.capital_count > 0}
                          >
                            <DeleteOutlined />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {paginatedTipos.length === 0 && (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', padding: '16px', color: '#999' }}>
                          No hay tipos registrados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Paginación de Tipos */}
              {totalTipoPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '12px', fontSize: '12px' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '2px 8px' }}
                    onClick={() => setTipoPage(p => Math.max(1, p - 1))}
                    disabled={safeTipoPage === 1}
                  >
                    Anterior
                  </button>
                  <span>Página {safeTipoPage} de {totalTipoPages}</span>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '2px 8px' }}
                    onClick={() => setTipoPage(p => Math.min(totalTipoPages, p + 1))}
                    disabled={safeTipoPage === totalTipoPages}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ─── Kardex Modal ─────────────────────────────────────────────────────── */}
      {kardexVisible && kardexCapital && (
        <div className="modal-overlay" onClick={closeKardex}>
          <div className="modal" style={{ maxWidth: '900px', width: '95vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HistoryOutlined /> Historial - {kardexCapital.nombre}
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={handleKardexExport} style={{ padding: '4px 12px', fontSize: '12px' }}>
                  Exportar Excel
                </button>
                <button className="modal-close" onClick={closeKardex}>x</button>
              </div>
            </div>

            {/* Date filter bar */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color, #334155)', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-muted)' }}>Desde</label>
                <input type="date" value={kardexFechaDesde} onChange={(e) => setKardexFechaDesde(e.target.value)}
                  className="form-input" style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-muted)' }}>Hasta</label>
                <input type="date" value={kardexFechaHasta} onChange={(e) => setKardexFechaHasta(e.target.value)}
                  className="form-input" style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }} />
              </div>
              <button className="btn btn-primary" style={{ padding: '5px 14px', fontSize: '13px' }}
                onClick={() => fetchKardex(kardexCapital.id, 1, kardexFechaDesde, kardexFechaHasta)}>Filtrar</button>
              <button className="btn btn-secondary" style={{ padding: '5px 14px', fontSize: '13px' }}
                onClick={() => { setKardexFechaDesde(''); setKardexFechaHasta(''); fetchKardex(kardexCapital.id, 1, '', ''); }}>Limpiar</button>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                {kardexTotal} registro{kardexTotal !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Kardex Table */}
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '48vh', padding: 0 }}>
              {kardexLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando historial...</div>
              ) : kardexData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No hay movimientos registrados para este período.</div>
              ) : (
                <table style={{ minWidth: '1100px', width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap' }}>Fecha y Hora</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px' }}>Campo Modificado</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', color: '#888' }}>V. Inicial Ant.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px' }}>V. Inicial Nvo.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', color: '#888' }}>V. Actual Ant.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px' }}>V. Actual Nvo.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px' }}>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardexData.map((mov) => {
                      const dt = new Date(mov.fecha).toLocaleString('es-PE', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      });
                      const isCreacion = mov.campo_modificado === 'Creación' || mov.campo_modificado === 'Carga Inicial';
                      
                      const formatPrice = (val) => {
                        if (val === null || val === undefined) return '-';
                        return `S/. ${parseFloat(val).toFixed(2)}`;
                      };

                      return (
                        <tr key={mov.id} style={{ borderBottom: '1px solid var(--border-color, #334155)' }}>
                          <td style={{ padding: '8px 12px', fontSize: '11px', whiteSpace: 'nowrap' }}>{dt}</td>
                          <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: isCreacion ? 'bold' : 'normal' }}>
                            <span style={{ color: isCreacion ? '#52c41a' : 'inherit' }}>{mov.campo_modificado || '-'}</span>
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: '12px', color: '#888', textAlign: 'right' }}>
                            {formatPrice(mov.valor_inicial_ant)}
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                            {formatPrice(mov.valor_inicial_nvo)}
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: '12px', color: '#888', textAlign: 'right' }}>
                            {formatPrice(mov.valor_actual_ant)}
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                            {formatPrice(mov.valor_actual_nvo)}
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {mov.notas || ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {!kardexLoading && kardexTotalPages > 1 && (
              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--border-color, #334155)' }}>
                <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}
                  onClick={() => fetchKardex(kardexCapital.id, kardexPage - 1, kardexFechaDesde, kardexFechaHasta)}
                  disabled={kardexPage <= 1}>Anterior</button>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Página {kardexPage} de {kardexTotalPages}</span>
                <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}
                  onClick={() => fetchKardex(kardexCapital.id, kardexPage + 1, kardexFechaDesde, kardexFechaHasta)}
                  disabled={kardexPage >= kardexTotalPages}>Siguiente</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Capital;
