import { useState, useEffect } from 'react';
import { proveedoresAPI } from '../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';

function Proveedores() {
  const [loading, setLoading] = useState(true);
  const [proveedores, setProveedores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('ALL');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [errors, setErrors] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  const [formData, setFormData] = useState({
    nombre: '',
    identificador: '',
    contacto: '',
    email: '',
    telefono: '',
    direccion: '',
    categoria: 'MAYORISTA',
    tiene_contrato: false,
    detalles_contrato: '',
    dias_credito: 0,
    limite_credito: 0,
    activo: true,
  });

  useEffect(() => {
    fetchProveedores();
  }, []);

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

  const openModal = (mode, proveedor = null) => {
    setModalMode(mode);
    if (proveedor) {
      setSelectedProveedor(proveedor);
      setFormData({
        nombre: proveedor.nombre || '',
        identificador: proveedor.identificador || '',
        contacto: proveedor.contacto || '',
        email: proveedor.email || '',
        telefono: proveedor.telefono || '',
        direccion: proveedor.direccion || '',
        categoria: proveedor.categoria || 'MAYORISTA',
        tiene_contrato: proveedor.tiene_contrato || false,
        detalles_contrato: proveedor.detalles_contrato || '',
        dias_credito: proveedor.dias_credito || 0,
        limite_credito: proveedor.limite_credito || 0,
        activo: proveedor.activo !== undefined ? proveedor.activo : true,
      });
    } else {
      setFormData({
        nombre: '',
        identificador: '',
        contacto: '',
        email: '',
        telefono: '',
        direccion: '',
        categoria: 'MAYORISTA',
        tiene_contrato: false,
        detalles_contrato: '',
        dias_credito: 0,
        limite_credito: 0,
        activo: true,
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedProveedor(null);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.identificador.trim()) newErrors.identificador = 'El identificador (RUC/DNI) es obligatorio';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    try {
      const submitData = {
        ...formData,
        limite_credito: Number(formData.limite_credito),
        dias_credito: Number(formData.dias_credito)
      };

      if (modalMode === 'create') {
        await proveedoresAPI.create(submitData);
      } else {
        await proveedoresAPI.update(selectedProveedor.id, submitData);
      }
      closeModal();
      fetchProveedores();
    } catch (error) {
      console.error('Error saving proveedor:', error);
      alert(error.response?.data?.message || 'Error al guardar');
    }
  };

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

  const filteredProveedores = proveedores.filter(p => {
    const term = searchTerm.toLowerCase();
    const searchMatch = p.nombre.toLowerCase().includes(term) || p.identificador.toLowerCase().includes(term);
    const catMatch = filterCategoria === 'ALL' ? true : p.categoria === filterCategoria;
    return searchMatch && catMatch;
  });

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
          <p className="page-subtitle">Gestión de proveedores y histórico de precios</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ExportDropdown onExport={handleExportar} />
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            <PlusOutlined /> Nuevo Proveedor
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por nombre o identificador..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ width: '200px' }}>
            <select 
              className="form-input" 
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
            >
              <option value="ALL">Todas las categorías</option>
              <option value="MAYORISTA">Mayorista</option>
              <option value="MINORISTA">Minorista</option>
              <option value="PRODUCTOR">Productor/Fabricante</option>
              <option value="IMPORTADOR">Importador</option>
              <option value="DISTRIBUIDOR">Distribuidor</option>
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
                <th>Identificador</th>
                <th>Categoría</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Crédito</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProveedores.map((proveedor) => (
                <tr key={proveedor.id}>
                  <td>{proveedor.nombre}</td>
                  <td>{proveedor.identificador}</td>
                  <td>{proveedor.categoria}</td>
                  <td>{proveedor.contacto || '-'}</td>
                  <td>{proveedor.telefono || '-'}</td>
                  <td>
                    {proveedor.limite_credito > 0 
                      ? `S/. ${proveedor.limite_credito} (${proveedor.dias_credito} días)`
                      : '-'
                    }
                  </td>
                  <td>
                    <span className={`badge ${proveedor.activo ? 'badge-success' : 'badge-danger'}`}>
                      {proveedor.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => openModal('edit', proveedor)}>
                      <EditOutlined />
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteClick(proveedor)}>
                      <DeleteOutlined />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProveedores.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#888' }}>
                    No se encontraron proveedores que coincidan con los filtros.
                  </td>
                </tr>
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
                {modalMode === 'create' ? 'Nuevo Proveedor' : 'Editar Proveedor'}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input type="text" name="nombre" className={`form-input${errors.nombre ? ' input-error' : ''}`} value={formData.nombre} onChange={handleChange} onFocus={(e) => e.target.select()} />
                    {errors.nombre && <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.nombre}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Identificador (RUC/DNI) *</label>
                    <input type="text" name="identificador" className={`form-input${errors.identificador ? ' input-error' : ''}`} value={formData.identificador} onChange={handleChange} onFocus={(e) => e.target.select()} />
                    {errors.identificador && <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.identificador}</div>}
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Contacto</label>
                    <input
                      type="text"
                      name="contacto"
                      className="form-input"
                      value={formData.contacto}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <select
                      name="categoria"
                      className="form-input"
                      value={formData.categoria}
                      onChange={handleChange}
                    >
                      <option value="MAYORISTA">Mayorista</option>
                      <option value="MINORISTA">Minorista</option>
                      <option value="PRODUCTOR">Productor/Fabricante</option>
                      <option value="IMPORTADOR">Importador</option>
                      <option value="DISTRIBUIDOR">Distribuidor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input
                      type="text"
                      name="telefono"
                      className="form-input"
                      value={formData.telefono}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Dirección</label>
                  <textarea
                    name="direccion"
                    className="form-input"
                    value={formData.direccion}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="checkbox"
                      name="tiene_contrato"
                      checked={formData.tiene_contrato}
                      onChange={handleChange}
                      style={{ marginRight: '8px' }}
                    />
                    Tiene Contrato
                  </label>
                </div>

                {formData.tiene_contrato && (
                  <div className="form-group">
                    <label className="form-label">Detalles del Contrato</label>
                    <textarea
                      name="detalles_contrato"
                      className="form-input"
                      value={formData.detalles_contrato}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                )}

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Días de Crédito</label>
                    <input
                      type="number"
                      name="dias_credito"
                      className="form-input"
                      value={formData.dias_credito}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Límite de Crédito (S/.)</label>
                    <input
                      type="number"
                      name="limite_credito"
                      className="form-input"
                      value={formData.limite_credito}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()}
                      min="0"
                      step="0.01"
                    />
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

export default Proveedores;
