import { useState, useEffect } from 'react';
import { serviciosAPI, clientesAPI } from '../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, PlayCircleOutlined } from '@ant-design/icons';
import ConfirmDialog from '../components/ConfirmDialog';

function Servicios() {
  const [loading, setLoading] = useState(true);
  const [servicios, setServicios] = useState([]);
  const [ventasServicios, setVentasServicios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'venta', 'editVenta'
  const [selectedServicio, setSelectedServicio] = useState(null);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  const [ventaConfirmDialog, setVentaConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  const [categorias, setCategorias] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [errors, setErrors] = useState({});
  const [ventaErrors, setVentaErrors] = useState({});
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    precio_base: 0,
    costo: 0,
    duracion_minutos: '',
    activo: true,
  });
  const [ventaData, setVentaData] = useState({
    servicio: '',
    servicio_nombre: '',
    cliente: '',
    cliente_nombre: '',
    precio: 0,
    descuento: 0,
    fecha_programada: '',
    estado: 'PENDIENTE',
    notas: '',
  });

  useEffect(() => {
    fetchServicios();
    fetchVentas();
    fetchCategorias();
    fetchClientes();
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

  const fetchVentas = async () => {
    try {
      const response = await serviciosAPI.getVentas();
      setVentasServicios(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching ventas servicios:', error);
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

  const fetchClientes = async () => {
    try {
      const response = await clientesAPI.getAll();
      setClientes(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching clientes:', error);
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

  const openVentaModal = () => {
    setVentaErrors({});
    setVentaData({
      servicio: '',
      servicio_nombre: '',
      cliente: '',
      cliente_nombre: '',
      precio: 0,
      descuento: 0,
      fecha_programada: '',
      estado: 'PENDIENTE',
      notas: '',
    });
    setModalMode('venta');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedServicio(null);
    setSelectedVenta(null);
    setErrors({});
    setVentaErrors({});
  };

  const openVentaEditModal = (venta) => {
    setSelectedVenta(venta);
    setVentaData({
      servicio: venta.servicio || '',
      servicio_nombre: venta.servicio_nombre || '',
      cliente: venta.cliente || '',
      cliente_nombre: venta.cliente_nombre || '',
      precio: venta.precio || 0,
      descuento: venta.descuento || 0,
      fecha_programada: venta.fecha_programada ? venta.fecha_programada.substring(0, 16) : '',
      estado: venta.estado || 'PENDIENTE',
      notas: venta.notas || '',
    });
    setModalMode('editVenta');
    setVentaErrors({});
    setModalVisible(true);
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
      } else if (modalMode === 'venta' || modalMode === 'editVenta') {
        // Validation for Service Sale
        const newVentaErrors = {};
        if (!ventaData.servicio) newVentaErrors.servicio = 'Debes seleccionar un servicio';
        if (!ventaData.precio || Number(ventaData.precio) <= 0) newVentaErrors.precio = 'El precio debe ser mayor a 0';
        if (!ventaData.fecha_programada) newVentaErrors.fecha_programada = 'La fecha programada es obligatoria';
        
        if (Object.keys(newVentaErrors).length > 0) {
          setVentaErrors(newVentaErrors);
          return;
        }

        const ventaSubmitData = {
          ...ventaData,
          precio: Number(ventaData.precio || 0),
          descuento: Number(ventaData.descuento || 0)
        };
        if (modalMode === 'venta') {
          await serviciosAPI.createVenta(ventaSubmitData);
        } else {
          await serviciosAPI.updateVenta(selectedVenta.id, ventaSubmitData);
        }
      }
      closeModal();
      if (modalMode === 'venta') {
        fetchVentas();
      } else {
        fetchServicios();
      }
    } catch (error) {
      console.error('Error saving:', error);
      const errData = error.response?.data;
      const msg = typeof errData === 'string' ? errData
        : errData?.detail || errData?.message
        || JSON.stringify(errData) || 'Error al guardar';
      alert(msg);
    }
  };

  const handleCompletar = async (id) => {
    try {
      await serviciosAPI.completarVenta(id);
      fetchVentas();
    } catch (error) {
      console.error('Error completing servicio:', error);
    }
  };

  const handleIniciar = async (id) => {
    try {
      await serviciosAPI.iniciarVenta(id);
      fetchVentas();
    } catch (error) {
      console.error('Error initiating servicio:', error);
    }
  };

  const handleCancelar = async (id) => {
    try {
      await serviciosAPI.cancelarVenta(id);
      fetchVentas();
    } catch (error) {
      console.error('Error canceling servicio:', error);
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

  const handleDeleteVentaClick = (venta) => {
    setVentaConfirmDialog({ 
      visible: true, 
      id: venta.id, 
      nombre: venta.servicio_nombre || 'Venta' 
    });
  };

  const handleDeleteVentaConfirm = async () => {
    if (!ventaConfirmDialog.id) return;
    try {
      await serviciosAPI.deleteVenta(ventaConfirmDialog.id);
      fetchVentas();
      setVentaConfirmDialog({ visible: false, id: null, nombre: '' });
    } catch (error) {
      console.error('Error deleting venta:', error);
      alert('Error al eliminar la venta');
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

      <ConfirmDialog 
        visible={ventaConfirmDialog.visible}
        onCancel={() => setVentaConfirmDialog({ visible: false, id: null, nombre: '' })}
        onConfirm={handleDeleteVentaConfirm}
        title="Eliminar Registro de Venta"
        message={`¿Estás seguro de que deseas eliminar el registro de venta del servicio "${ventaConfirmDialog.nombre}"? Esta acción no se puede deshacer.`}
        danger={true}
      />
      
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Servicios</h1>
          <p className="page-subtitle">Gestión de servicios y ventas de servicios</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-success" onClick={openVentaModal}>
            <PlusOutlined /> Nueva Venta de Servicio
          </button>
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            <PlusOutlined /> Nuevo Servicio
          </button>
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
              {servicios.map((servicio) => (
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
            </tbody>
          </table>
        </div>
      </div>

      {/* Ventas de Servicios */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Ventas de Servicios</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Cliente</th>
                <th>Fecha Programada</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventasServicios.map((venta) => (
                <tr key={venta.id}>
                  <td>{venta.servicio_nombre || venta.servicio}</td>
                  <td>{venta.cliente_nombre || 'Cliente'}</td>
                  <td>{venta.fecha_programada ? new Date(venta.fecha_programada).toLocaleDateString() : '-'}</td>
                  <td>
                    <span className={`badge ${
                      venta.estado === 'TERMINADO' ? 'badge-success' :
                      venta.estado === 'CANCELADO' ? 'badge-danger' :
                      venta.estado === 'EN_PROGRESO' ? 'badge-info' : 'badge-warning'
                    }`}>
                      {venta.estado}
                    </span>
                  </td>
                  <td>S/. {Number(venta.total || 0).toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => openVentaEditModal(venta)}
                        title="Editar Venta"
                      >
                        <EditOutlined />
                      </button>
                      
                      {venta.estado === 'PENDIENTE' && (
                        <button 
                          className="btn btn-primary" 
                          onClick={() => handleIniciar(venta.id)}
                          title="Iniciar Servicio"
                        >
                          <PlayCircleOutlined />
                        </button>
                      )}
                      {venta.estado === 'EN_PROGRESO' && (
                        <button 
                          className="btn btn-success" 
                          onClick={() => handleCompletar(venta.id)}
                          title="Terminar"
                        >
                          <CheckOutlined />
                        </button>
                      )}
                      {(venta.estado === 'PENDIENTE' || venta.estado === 'EN_PROGRESO') && (
                        <button 
                          className="btn btn-warning" 
                          onClick={() => handleCancelar(venta.id)}
                          title="Cancelar"
                          style={{ color: 'white' }}
                        >
                          <CloseOutlined />
                        </button>
                      )}

                      <button 
                        className="btn btn-danger" 
                        onClick={() => handleDeleteVentaClick(venta)}
                        title="Eliminar Registro"
                      >
                        <DeleteOutlined />
                      </button>
                    </div>
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
                {modalMode === 'create' ? 'Nuevo Servicio' :
                 modalMode === 'edit' ? 'Editar Servicio' : 
                 modalMode === 'venta' ? 'Nueva Venta de Servicio' : 'Editar Venta de Servicio'}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {modalMode === 'venta' ? (
                  <>
                    <div className="grid grid-2">
                      <div className="form-group">
                        <label className="form-label">Servicio</label>
                        <select
                          name="servicio"
                          className={`form-input${ventaErrors.servicio ? ' input-error' : ''}`}
                          value={ventaData.servicio}
                          onChange={(e) => {
                            const serv = servicios.find(s => s.id === parseInt(e.target.value));
                            setVentaData(prev => ({
                              ...prev,
                              servicio: e.target.value,
                              servicio_nombre: serv ? serv.nombre : '',
                              precio: serv ? Number(serv.precio_base || 0) : 0
                            }));
                            if (ventaErrors.servicio) setVentaErrors(prev => ({ ...prev, servicio: null }));
                          }}
                        >
                          <option value="">Seleccionar servicio</option>
                          {servicios.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre}</option>
                          ))}
                        </select>
                        {ventaErrors.servicio && <div className="error-message" style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{ventaErrors.servicio}</div>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Cliente</label>
                        <select
                          name="cliente"
                          className="form-input"
                          value={ventaData.cliente}
                          onChange={(e) => {
                            const cli = clientes.find(c => c.id === parseInt(e.target.value));
                            setVentaData(prev => ({
                              ...prev,
                              cliente: e.target.value,
                              cliente_nombre: cli ? cli.nombre : ''
                            }));
                          }}
                        >
                          <option value="">Cliente General</option>
                          {clientes.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-2">
                      <div className="form-group">
                        <label className="form-label">Precio (S/.)</label>
                        <input
                          type="number"
                          name="precio"
                          className={`form-input${ventaErrors.precio ? ' input-error' : ''}`}
                          value={ventaData.precio}
                          onChange={(e) => {
                            handleChange(e);
                            if (ventaErrors.precio) setVentaErrors(prev => ({ ...prev, precio: null }));
                          }}
                          onFocus={(e) => e.target.select()}
                          min="0"
                          step="0.01"
                        />
                        {ventaErrors.precio && <div className="error-message" style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{ventaErrors.precio}</div>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Descuento (S/.)</label>
                        <input
                          type="number"
                          name="descuento"
                          className="form-input"
                          value={ventaData.descuento}
                          onChange={handleChange}
                          onFocus={(e) => e.target.select()}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fecha Programada</label>
                      <input
                        type="datetime-local"
                        name="fecha_programada"
                        className={`form-input${ventaErrors.fecha_programada ? ' input-error' : ''}`}
                        value={ventaData.fecha_programada}
                        onChange={(e) => {
                          handleChange(e);
                          if (ventaErrors.fecha_programada) setVentaErrors(prev => ({ ...prev, fecha_programada: null }));
                        }}
                      />
                      {ventaErrors.fecha_programada && <div className="error-message" style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{ventaErrors.fecha_programada}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Estado</label>
                        <select
                          name="estado"
                          className="form-input"
                          value={ventaData.estado}
                          onChange={handleChange}
                        >
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="EN_PROGRESO">En Progreso</option>
                          <option value="TERMINADO">Terminado</option>
                        </select>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'create' || modalMode === 'venta' ? 'Crear' : 'Guardar'}
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
