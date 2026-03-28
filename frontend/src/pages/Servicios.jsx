import { useState, useEffect } from 'react';
import { serviciosAPI } from '../services/api';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  HistoryOutlined,
  SettingOutlined
} from '@ant-design/icons';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';
import ServicioHistoryModal from '../components/ServicioHistoryModal';
import { message } from 'antd';

const DURATION_UNITS = {
  minutos: { label: 'Minutos', multiplier: 1 },
  horas: { label: 'Horas', multiplier: 60 },
  dias: { label: 'Días', multiplier: 1440 },
  semanas: { label: 'Semanas', multiplier: 10080 },
  meses: { label: 'Meses', multiplier: 43200 },
};

const translateDuration = (totalMinutes) => {
  if (totalMinutes === null || totalMinutes === undefined) return 'No definida';
  if (totalMinutes === 0) return '0 min';
  
  const parts = [];
  let remainder = totalMinutes;
  
  const units = [
    { key: 'meses', label: 'mes', labelPlural: 'meses', multiplier: 43200 },
    { key: 'semanas', label: 'sem', labelPlural: 'sem', multiplier: 10080 },
    { key: 'dias', label: 'día', labelPlural: 'días', multiplier: 1440 },
    { key: 'horas', label: 'h', labelPlural: 'h', multiplier: 60 },
    { key: 'minutos', label: 'min', labelPlural: 'min', multiplier: 1 },
  ];

  for (const unit of units) {
    const value = Math.floor(remainder / unit.multiplier);
    if (value > 0) {
      parts.push(`${value} ${value === 1 ? unit.label : unit.labelPlural}`);
      remainder %= unit.multiplier;
    }
  }
  
  return parts.join(', ') || '0 min';
};

const decodeDuration = (totalMinutes) => {
  const parts = { meses: 0, semanas: 0, dias: 0, horas: 0, minutos: 0 };
  if (totalMinutes === null || totalMinutes === undefined) return parts;
  
  let remainder = totalMinutes;
  const units = [
    { key: 'meses', multiplier: 43200 },
    { key: 'semanas', multiplier: 10080 },
    { key: 'dias', multiplier: 1440 },
    { key: 'horas', multiplier: 60 },
    { key: 'minutos', multiplier: 1 },
  ];

  for (const unit of units) {
    parts[unit.key] = Math.floor(remainder / unit.multiplier);
    remainder %= unit.multiplier;
  }
  
  return parts;
};

function Servicios() {
  const [loading, setLoading] = useState(true);
  const [servicios, setServicios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit'
  const [selectedServicio, setSelectedServicio] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState('ALL');
  const [filterCategoria, setFilterCategoria] = useState('ALL');
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  const [categorias, setCategorias] = useState([]);
  const [errors, setErrors] = useState({});
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyServicio, setHistoryServicio] = useState(null);
  
  // Category Management State
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [catModalMode, setCatModalMode] = useState('create');
  const [editingCatId, setEditingCatId] = useState(null);
  const [catFormData, setCatFormData] = useState({ nombre: '', descripcion: '' });
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    precio_base: 0,
    costo: 0,
    hasDuration: true,
    durationParts: { meses: 0, semanas: 0, dias: 0, horas: 0, minutos: 0 },
    activo: true,
  });

  // Pagination
  const SERVICIOS_PAGE_SIZE = 15;
  const [serviciosPage, setServiciosPage] = useState(1);

  useEffect(() => {
    fetchServicios();
    fetchCategorias();
  }, []);

  const fetchServicios = async () => {
    try {
      const response = await serviciosAPI.getAll();
      setServicios(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching servicios:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const response = await serviciosAPI.getCategorias();
      setCategorias(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  };

  const resetCatForm = () => {
    setCatFormData({ nombre: '', descripcion: '' });
    setCatModalMode('create');
    setEditingCatId(null);
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    if (!catFormData.nombre) {
      message.error('El nombre de la categoría es obligatorio');
      return;
    }
    try {
      if (catModalMode === 'create') {
        await serviciosAPI.createCategoria(catFormData);
        message.success('Categoría creada con éxito');
      } else {
        await serviciosAPI.updateCategoria(editingCatId, catFormData);
        message.success('Categoría actualizada con éxito');
      }
      fetchCategorias();
      resetCatForm();
    } catch (error) {
      console.error('Error saving categoria:', error);
      message.error('Error al guardar la categoría');
    }
  };

  const openModal = (mode, servicio = null) => {
    setModalMode(mode);
    if (servicio) {
      setSelectedServicio(servicio);
      const parts = decodeDuration(servicio.duracion_minutos);
      setFormData({
        nombre: servicio.nombre || '',
        descripcion: servicio.descripcion || '',
        categoria: servicio.categoria || '',
        precio_base: servicio.precio_base || 0,
        costo: servicio.costo || 0,
        hasDuration: servicio.duracion_minutos !== null && servicio.duracion_minutos !== undefined,
        durationParts: parts,
        activo: servicio.activo !== undefined ? servicio.activo : true,
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        categoria: '',
        precio_base: 0,
        costo: 0,
        hasDuration: true,
        durationParts: { meses: 0, semanas: 0, dias: 0, horas: 0, minutos: 0 },
        activo: true,
      });
      setErrors({});
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedServicio(null);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'create' || modalMode === 'edit') {
        const newErrors = {};
        if (!formData.nombre) newErrors.nombre = 'El nombre es obligatorio';
        if (!formData.precio_base) newErrors.precio_base = 'El precio base es obligatorio';
        
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          return;
        }

        const categoriaId = formData.categoria || null;

        let totalMinutes = null;
        if (formData.hasDuration) {
          totalMinutes = (Number(formData.durationParts.meses || 0) * 43200) +
                         (Number(formData.durationParts.semanas || 0) * 10080) +
                         (Number(formData.durationParts.dias || 0) * 1440) +
                         (Number(formData.durationParts.horas || 0) * 60) +
                         (Number(formData.durationParts.minutos || 0) * 1);
        }

        const submitData = {
          ...formData,
          categoria: categoriaId,
          precio_base: Number(formData.precio_base || 0),
          costo: Number(formData.costo || 0),
          duracion_minutos: totalMinutes
        };
        delete submitData.hasDuration;
        delete submitData.durationParts;

        if (modalMode === 'create') {
          await serviciosAPI.create(submitData);
        } else {
          await serviciosAPI.update(selectedServicio.id, submitData);
        }
      }
      closeModal();
      fetchServicios();
    } catch (error) {
      console.error('Error saving:', error);
      const errData = error.response?.data;
      const msg = typeof errData === 'string' ? errData
        : errData?.detail || errData?.message
        || JSON.stringify(errData) || 'Error al guardar';
      alert(msg);
    }
  };

  const handleDeleteClick = (servicio) => {
    setConfirmDialog({ visible: true, id: servicio.id, nombre: servicio.nombre });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDialog.id) return;
    try {
      await serviciosAPI.delete(confirmDialog.id);
      fetchServicios();
      setConfirmDialog({ visible: false, id: null, nombre: '' });
    } catch (error) {
      console.error('Error deleting servicio:', error);
      alert('Error al eliminar');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleExportar = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await serviciosAPI.exportar(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `servicios_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar servicios:', error);
      alert('Error al exportar datos.');
    }
  };

  const handleExportGlobalHistory = async (periodo, anio) => {
    try {
      const response = await serviciosAPI.exportarHistorialGlobal({ periodo, anio });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `diario_movimientos_servicios_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar diario de movimientos:', error);
      message.error('Error al exportar el diario de movimientos');
    }
  };

  const filteredServicios = servicios.filter(s => {
    const term = searchTerm.toLowerCase();
    const searchMatch = (s.nombre || '').toLowerCase().includes(term);
    const activoMatch = filterActivo === 'ALL' ? true : 
                        (filterActivo === 'ACTIVO' ? s.activo : !s.activo);
    const categoriaMatch = filterCategoria === 'ALL' ? true : Number(s.categoria) === Number(filterCategoria);
    return searchMatch && activoMatch && categoriaMatch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredServicios.length / SERVICIOS_PAGE_SIZE));
  const safePage = Math.min(serviciosPage, totalPages);
  const paginatedServicios = filteredServicios.slice(
    (safePage - 1) * SERVICIOS_PAGE_SIZE,
    safePage * SERVICIOS_PAGE_SIZE
  );

  const handleSearchChange = (val) => { setSearchTerm(val); setServiciosPage(1); };
  const handleFilterActivoChange = (val) => { setFilterActivo(val); setServiciosPage(1); };

  return (
    <div>
      <ConfirmDialog 
        visible={confirmDialog.visible}
        onCancel={() => setConfirmDialog({ visible: false, id: null, nombre: '' })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Servicio"
        message={`¿Estás seguro de que deseas eliminar el servicio "${confirmDialog.nombre}"? Esta acción no se puede deshacer.`}
        danger={true}
      />

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Servicios</h1>
          <p className="page-subtitle">Gestión de servicios y ventas de servicios</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <ExportDropdown onExport={handleExportGlobalHistory} label="Diario de Movimientos" />
          <ExportDropdown onExport={handleExportar} />
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            <PlusOutlined /> Nuevo Servicio
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por nombre..." 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div style={{ width: '200px' }}>
            <select 
              className="form-input" 
              value={filterActivo}
              onChange={(e) => handleFilterActivoChange(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>
          </div>
          <div style={{ width: '200px' }}>
            <select 
              className="form-input" 
              value={filterCategoria}
              onChange={(e) => { setFilterCategoria(e.target.value); setServiciosPage(1); }}
            >
              <option value="ALL">Todas las categorías</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Servicios Disponibles</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Costo de Servicio</th>
                <th>Precio de Servicio</th>
                <th>Margen</th>
                <th>Duración</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedServicios.map((servicio) => (
                <tr key={servicio.id}>
                  <td>{servicio.nombre}</td>
                  <td>{servicio.categoria_nombre || '-'}</td>
                  <td>S/. {Number(servicio.costo || 0).toFixed(2)}</td>
                  <td>S/. {Number(servicio.precio_base || 0).toFixed(2)}</td>
                  <td>{Number(servicio.margen_ganancia || 0).toFixed(2)}%</td>
                  <td>{translateDuration(servicio.duracion_minutos)}</td>
                  <td>
                    <span className={`badge ${servicio.activo ? 'badge-success' : 'badge-danger'}`}>
                      {servicio.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => { setHistoryServicio(servicio); setHistoryModalVisible(true); }} title="Ver Kardex">
                      <HistoryOutlined />
                    </button>
                    <button className="btn btn-secondary" onClick={() => openModal('edit', servicio)}>
                      <EditOutlined />
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteClick(servicio)}>
                      <DeleteOutlined />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredServicios.length === 0 && (
                <tr><td colSpan="8" style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No hay servicios que coincidan con los filtros</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setServiciosPage}
          pageSize={SERVICIOS_PAGE_SIZE}
          totalItems={filteredServicios.length}
          itemName="servicios"
        />
      </div>

      {modalVisible && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'create' ? 'Nuevo Servicio' : 'Editar Servicio'}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                      <div className="form-group">
                        <label className="form-label">Nombre *</label>
                        <input
                          type="text"
                          name="nombre"
                          className={`form-input${errors.nombre ? ' input-error' : ''}`}
                          value={formData.nombre}
                          onChange={(e) => {
                            handleChange(e);
                            if (errors.nombre) setErrors(prev => ({ ...prev, nombre: null }));
                          }}
                          onFocus={(e) => e.target.select()}
                          required
                        />
                        {errors.nombre && <div className="error-message" style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.nombre}</div>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Categoría</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <SearchableSelect
                              options={categorias.map(c => ({ id: c.id, nombre: c.nombre }))}
                              value={formData.categoria}
                              onChange={(val) => setFormData({ ...formData, categoria: val })}
                              placeholder="Seleccionar categoría..."
                              disabled={loading}
                            />
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setCatModalVisible(true)}
                            style={{ height: '42px', padding: '0 12px', whiteSpace: 'nowrap' }}
                            title="Gestionar Categorías"
                          >
                            <SettingOutlined />
                          </button>
                        </div>
                        <p className="field-hint" style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                          Selecciona una categoría existente o gestiona la lista.
                        </p>
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
                        <label className="form-label">Costo de Servicio (S/.)</label>
                        <input
                          type="number"
                          name="costo"
                          className="form-input"
                          value={formData.costo}
                          onChange={handleChange}
                          onFocus={(e) => e.target.select()}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Precio de Servicio (S/.) *</label>
                        <input
                          type="number"
                          name="precio_base"
                          className={`form-input${errors.precio_base ? ' input-error' : ''}`}
                          value={formData.precio_base}
                          onChange={(e) => {
                            handleChange(e);
                            if (errors.precio_base) setErrors(prev => ({ ...prev, precio_base: null }));
                          }}
                          onFocus={(e) => e.target.select()}
                          min="0"
                          step="0.01"
                          required
                        />
                        {errors.precio_base && <div className="error-message" style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.precio_base}</div>}
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', background: 'var(--bg-card)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <input
                          type="checkbox"
                          id="hasDuration"
                          name="hasDuration"
                          checked={formData.hasDuration}
                          onChange={(e) => setFormData(prev => ({ ...prev, hasDuration: e.target.checked }))}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="hasDuration" style={{ userSelect: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                          Definir duración del servicio
                        </label>
                      </div>

                      {formData.hasDuration && (
                        <div className="grid grid-3" style={{ gap: '12px' }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '12px' }}>Meses</label>
                            <input
                              type="number"
                              className="form-input"
                              value={formData.durationParts.meses}
                              onChange={(e) => setFormData(prev => ({ ...prev, durationParts: { ...prev.durationParts, meses: e.target.value } }))}
                              min="0"
                              onFocus={(e) => e.target.select()}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '12px' }}>Semanas</label>
                            <input
                              type="number"
                              className="form-input"
                              value={formData.durationParts.semanas}
                              onChange={(e) => setFormData(prev => ({ ...prev, durationParts: { ...prev.durationParts, semanas: e.target.value } }))}
                              min="0"
                              onFocus={(e) => e.target.select()}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '12px' }}>Días</label>
                            <input
                              type="number"
                              className="form-input"
                              value={formData.durationParts.dias}
                              onChange={(e) => setFormData(prev => ({ ...prev, durationParts: { ...prev.durationParts, dias: e.target.value } }))}
                              min="0"
                              onFocus={(e) => e.target.select()}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '12px' }}>Horas</label>
                            <input
                              type="number"
                              className="form-input"
                              value={formData.durationParts.horas}
                              onChange={(e) => setFormData(prev => ({ ...prev, durationParts: { ...prev.durationParts, horas: e.target.value } }))}
                              min="0"
                              onFocus={(e) => e.target.select()}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '12px' }}>Minutos</label>
                            <input
                              type="number"
                              className="form-input"
                              value={formData.durationParts.minutos}
                              onChange={(e) => setFormData(prev => ({ ...prev, durationParts: { ...prev.durationParts, minutos: e.target.value } }))}
                              min="0"
                              onFocus={(e) => e.target.select()}
                            />
                          </div>
                        </div>
                      )}
                      {!formData.hasDuration && (
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                          La duración se guardará como no definida.
                        </p>
                      )}
                    </div>
                    <div className="form-group">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          name="activo"
                          checked={formData.activo}
                          onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ userSelect: 'none', color: 'inherit', fontSize: '14px', fontWeight: '500' }}>
                          Servicio Activo
                        </span>
                      </div>
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
      {historyModalVisible && (
        <ServicioHistoryModal 
          visible={historyModalVisible}
          onClose={() => { setHistoryModalVisible(false); setHistoryServicio(null); }}
          servicio={historyServicio}
        />
      )}

      {/* Category Management Modal */}
      {catModalVisible && (
        <div className="modal-overlay" onClick={() => setCatModalVisible(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Gestionar Categorías de Servicios</h3>
              <button className="modal-close" onClick={() => setCatModalVisible(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Form to create/edit */}
              <form onSubmit={handleCatSubmit} style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ marginBottom: '12px' }}>{catModalMode === 'create' ? 'Nueva Categoría' : 'Editar Categoría'}</h4>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input 
                    type="text"
                    className="form-input"
                    value={catFormData.nombre}
                    onChange={(e) => setCatFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej: Mantenimiento, Instalación..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea 
                    className="form-input"
                    value={catFormData.descripcion}
                    onChange={(e) => setCatFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Opcional..."
                    rows={2}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {catModalMode === 'edit' && (
                    <button type="button" className="btn btn-secondary" onClick={resetCatForm}>
                      Cancelar Edición
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary">
                    {catModalMode === 'create' ? 'Crear Categoría' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>

              {/* List of existing categories */}
              <div className="table-container">
                <style>{`
                  .cat-table th, .cat-table td { padding: 10px 12px; font-size: 14px; }
                  .cat-actions { display: flex; gap: 4px; }
                  .btn-small-icon { padding: 4px; border-radius: 4px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                  .btn-small-edit { background: rgba(52, 152, 219, 0.1); color: #3498db; }
                  .btn-small-edit:hover { background: #3498db; color: white; }
                  .btn-small-delete { background: rgba(231, 76, 60, 0.1); color: #e74c3c; }
                  .btn-small-delete:hover { background: #e74c3c; color: white; }
                `}</style>
                <table className="cat-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      <th>Aciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const CAT_PAGE_SIZE = 5;
                      const totalCatPages = Math.ceil(categorias.length / CAT_PAGE_SIZE);
                      const safeCatPage = Math.min(catPage, totalCatPages || 1);
                      const paginatedCats = categorias.slice(
                        (safeCatPage - 1) * CAT_PAGE_SIZE,
                        safeCatPage * CAT_PAGE_SIZE
                      );
                      
                      return paginatedCats.map(cat => (
                        <tr key={cat.id}>
                          <td style={{ fontWeight: '500' }}>{cat.nombre}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{cat.descripcion || '-'}</td>
                          <td>
                            <div className="cat-actions">
                              <button className="btn-small-icon btn-small-edit" onClick={() => handleEditCat(cat)} title="Editar">
                                <EditOutlined fontSize={14} />
                              </button>
                              <button className="btn-small-icon btn-small-delete" onClick={() => handleDeleteCat(cat.id)} title="Eliminar">
                                <DeleteOutlined fontSize={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                    {categorias.length === 0 && (
                      <tr><td colSpan="3" style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>No hay categorías registradas</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Custom Mini Pagination */}
              {categorias.length > 5 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                    onClick={() => setCatPage(prev => Math.max(1, prev - 1))}
                    disabled={catPage === 1}
                  >
                    Anterior
                  </button>
                  <span style={{ fontSize: '13px' }}>Pág {catPage} de {Math.ceil(categorias.length / 5)}</span>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                    onClick={() => setCatPage(prev => Math.min(Math.ceil(categorias.length / 5), prev + 1))}
                    disabled={catPage >= Math.ceil(categorias.length / 5)}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCatModalVisible(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Servicios;
