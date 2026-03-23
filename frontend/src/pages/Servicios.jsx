import { useState, useEffect } from 'react';
import { serviciosAPI, clientesAPI } from '../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, PlayCircleOutlined } from '@ant-design/icons';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';

function Servicios() {
  const [loading, setLoading] = useState(true);
  const [servicios, setServicios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit'
  const [selectedServicio, setSelectedServicio] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState('ALL');
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  const [categorias, setCategorias] = useState([]);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    precio_base: 0,
    costo: 0,
    duracion_minutos: '',
    activo: true,
  });

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

  const openModal = (mode, servicio = null) => {
    setModalMode(mode);
    if (servicio) {
      setSelectedServicio(servicio);
      setFormData({
        nombre: servicio.nombre || '',
        descripcion: servicio.descripcion || '',
        categoria: servicio.categoria || '',
        precio_base: servicio.precio_base || 0,
        costo: servicio.costo || 0,
        duracion_minutos: servicio.duracion_minutos || '',
        activo: servicio.activo !== undefined ? servicio.activo : true,
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        categoria: '',
        precio_base: 0,
        costo: 0,
        duracion_minutos: '',
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
        // Validation for Service
        const newErrors = {};
        if (!formData.nombre) newErrors.nombre = 'El nombre es obligatorio';
        if (!formData.precio_base) newErrors.precio_base = 'El precio base es obligatorio';
        
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          return;
        }

        const submitData = {
          ...formData,
          precio_base: Number(formData.precio_base || 0),
          costo: Number(formData.costo || 0),
          duracion_minutos: formData.duracion_minutos ? Number(formData.duracion_minutos) : null
        };
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
    if (modalMode === 'venta') {
      setVentaData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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

  const filteredServicios = servicios.filter(s => {
    const term = searchTerm.toLowerCase();
    const searchMatch = (s.nombre || '').toLowerCase().includes(term);
    const activoMatch = filterActivo === 'ALL' ? true : 
                        (filterActivo === 'ACTIVO' ? s.activo : !s.activo);
    return searchMatch && activoMatch;
  });

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
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ width: '200px' }}>
            <select 
              className="form-input" 
              value={filterActivo}
              onChange={(e) => setFilterActivo(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Servicios */}
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
                <th>Precio Base</th>
                <th>Costo</th>
                <th>Margen</th>
                <th>Duración</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredServicios.map((servicio) => (
                <tr key={servicio.id}>
                  <td>{servicio.nombre}</td>
                  <td>{servicio.categoria_nombre || '-'}</td>
                  <td>S/. {Number(servicio.precio_base || 0).toFixed(2)}</td>
                  <td>S/. {Number(servicio.costo || 0).toFixed(2)}</td>
                  <td>{Number(servicio.margen_ganancia || 0).toFixed(2)}%</td>
                  <td>{servicio.duracion_minutos ? `${servicio.duracion_minutos} min` : '-'}</td>
                  <td>
                    <span className={`badge ${servicio.activo ? 'badge-success' : 'badge-danger'}`}>
                      {servicio.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
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
                        <select
                          name="categoria"
                          className="form-input"
                          value={formData.categoria}
                          onChange={handleChange}
                        >
                          <option value="">Sin categoría</option>
                          {categorias.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
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
                        <label className="form-label">Precio Base (S/.) *</label>
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
                      <div className="form-group">
                        <label className="form-label">Costo (S/.)</label>
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
                    </div>
                    <div className="form-group">
                      <label className="form-label">Duración (minutos)</label>
                      <input
                        type="number"
                        name="duracion_minutos"
                        className="form-input"
                        value={formData.duracion_minutos}
                        onChange={handleChange}
                        onFocus={(e) => e.target.select()}
                        min="0"
                      />
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
    </div>
  );
}

export default Servicios;
