import { useState, useEffect } from 'react';
import { capitalAPI } from '../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ConfirmDialog from '../components/ConfirmDialog';

function Capital() {
  const [loading, setLoading] = useState(true);
  const [capitales, setCapitales] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCapital, setSelectedCapital] = useState(null);
  const [tipos, setTipos] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Capital</h1>
          <p className="page-subtitle">Gestión de capital y activos del negocio</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal('create')}>
          <PlusOutlined /> Nuevo Capital
        </button>
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

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
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
              {capitales.map((capital) => (
                <tr key={capital.id}>
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
                    <button className="btn btn-secondary" onClick={() => openModal('edit', capital)}>
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
                    <select
                      name="tipo"
                      className="form-input"
                      value={formData.tipo}
                      onChange={handleChange}
                    >
                      <option value="">Seleccionar tipo</option>
                      {tipos.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
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
    </div>
  );
}

export default Capital;
