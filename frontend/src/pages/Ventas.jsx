import { useState, useEffect } from 'react';
import { ventasAPI, productosAPI, clientesAPI } from '../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import ConfirmDialog from '../components/ConfirmDialog';

function Ventas() {
  const [loading, setLoading] = useState(true);
  const [ventas, setVentas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [errors, setErrors] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  const [formData, setFormData] = useState({
    cliente: '',
    cliente_nombre: '',
    numero_comprobante: '',
    tipo_comprobante: '',
    estado: 'CONFIRMADA',
    descuento: 0,
    impuesto: 0,
    notas: '',
    detalle: [],
  });

  useEffect(() => {
    fetchVentas();
    fetchProductos();
    fetchClientes();
  }, []);

  const fetchVentas = async () => {
    try {
      const response = await ventasAPI.getAll();
      setVentas(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductos = async () => {
    try {
      const response = await productosAPI.getAll();
      setProductos(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching productos:', error);
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

  const openModal = async (mode, venta = null) => {
    setModalMode(mode);
    setErrors({});
    if (venta) {
      setSelectedVenta(venta);
      // Load full venta detail from API to get the detalle
      try {
        const res = await ventasAPI.getById(venta.id);
        const full = res.data;
        setFormData({
          cliente: full.cliente || '',
          cliente_nombre: full.cliente_nombre || '',
          numero_comprobante: full.numero_comprobante || '',
          tipo_comprobante: full.tipo_comprobante || '',
          estado: full.estado || 'CONFIRMADA',
          descuento: Number(full.descuento || 0),
          impuesto: Number(full.impuesto || 0),
          notas: full.notas || '',
          detalle: (full.detalle || []).map(d => ({
            producto: d.producto,
            cantidad: Number(d.cantidad || 1),
            precio_venta: Number(d.precio_venta || 0),
            descuento: Number(d.descuento || 0),
          })),
        });
      } catch {
        setFormData({
          cliente: venta.cliente || '',
          cliente_nombre: venta.cliente_nombre || '',
          numero_comprobante: venta.numero_comprobante || '',
          tipo_comprobante: venta.tipo_comprobante || '',
          estado: venta.estado || 'CONFIRMADA',
          descuento: Number(venta.descuento || 0),
          impuesto: Number(venta.impuesto || 0),
          notas: venta.notas || '',
          detalle: [],
        });
      }
    } else {
      setSelectedVenta(null);
      setFormData({
        cliente: '',
        cliente_nombre: '',
        numero_comprobante: '',
        tipo_comprobante: '',
        estado: 'BORRADOR',
        descuento: 0,
        impuesto: 0,
        notas: '',
        detalle: [],
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedVenta(null);
    setErrors({});
  };

  const addProducto = () => {
    setFormData(prev => ({
      ...prev,
      detalle: [...prev.detalle, { producto: '', cantidad: 1, precio_venta: 0, descuento: 0 }]
    }));
  };

  const updateDetalle = (index, field, value) => {
    const newDetalle = [...formData.detalle];
    newDetalle[index] = { ...newDetalle[index], [field]: value };
    if (field === 'producto') {
      const prod = productos.find(p => p.id === parseInt(value));
      if (prod) {
        newDetalle[index].precio_venta = Number(prod.precio_venta || 0);
      }
    }
    setFormData(prev => ({ ...prev, detalle: newDetalle }));
  };

  const removeDetalle = (index) => {
    setFormData(prev => ({
      ...prev,
      detalle: prev.detalle.filter((_, i) => i !== index)
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (formData.detalle.length === 0) {
      newErrors.detalle = 'Debes agregar al menos un producto a la venta.';
    } else {
      formData.detalle.forEach((item, i) => {
        if (!item.producto) newErrors[`detalle_${i}`] = 'Selecciona un producto';
        if (Number(item.cantidad) <= 0) newErrors[`cantidad_${i}`] = 'La cantidad debe ser mayor a 0';
        if (Number(item.precio_venta) <= 0) newErrors[`precio_${i}`] = 'El precio debe ser mayor a 0';
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Stock validation only for new ventas
    if (modalMode === 'create') {
      for (const item of formData.detalle) {
        const prod = productos.find(p => p.id === parseInt(item.producto));
        const cantidadSolicitada = Number(item.cantidad || 0);
        if (prod && cantidadSolicitada > Number(prod.stock_actual || 0)) {
          const newErrors = {};
          newErrors[`cantidad_${formData.detalle.indexOf(item)}`] =
            `Stock insuficiente. Disponible: ${prod.stock_actual}`;
          setErrors(newErrors);
          return;
        }
      }
    }

    try {
      const submitData = {
        ...formData,
        impuesto: Number(formData.impuesto || 0),
        descuento: Number(formData.descuento || 0),
        detalle: formData.detalle.map(d => ({
          producto: parseInt(d.producto),
          cantidad: Number(d.cantidad || 0),
          precio_venta: Number(d.precio_venta || 0),
          descuento: Number(d.descuento || 0),
        }))
      };

      if (modalMode === 'create') {
        await ventasAPI.create(submitData);
      } else {
        await ventasAPI.update(selectedVenta.id, submitData);
      }
      closeModal();
      fetchVentas();
    } catch (error) {
      console.error('Error saving venta:', error);
      const errData = error.response?.data;
      const msg = typeof errData === 'string' ? errData
        : errData?.detail || errData?.message || JSON.stringify(errData) || 'Error al guardar';
      alert(msg);
    }
  };

  const handleConfirmar = async (id) => {
    try {
      await ventasAPI.confirmar(id);
      fetchVentas();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al confirmar');
    }
  };

  const handleCancelar = async (id) => {
    try {
      await ventasAPI.cancelar(id);
      fetchVentas();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al cancelar');
    }
  };

  const handleDeleteClick = (venta) => {
    setConfirmDialog({ visible: true, id: venta.id, nombre: venta.numero_comprobante || `Venta #${venta.id}` });
  };

  const handleDeleteConfirm = async () => {
    try {
      await ventasAPI.delete(confirmDialog.id);
      setConfirmDialog({ visible: false, id: null, nombre: '' });
      fetchVentas();
    } catch (error) {
      console.error('Error deleting venta:', error);
      alert('Error al eliminar la venta.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ['descuento', 'impuesto'];
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? (parseFloat(value) || 0) : value
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const calcularTotal = () => {
    const subtotal = formData.detalle.reduce((sum, d) => {
      const cantidad = Number(d.cantidad || 0);
      const precio = Number(d.precio_venta || 0);
      const desc = Number(d.descuento || 0);
      return sum + (cantidad * precio - desc);
    }, 0);
    return subtotal - Number(formData.descuento || 0) + Number(formData.impuesto || 0);
  };

  return (
    <div>
      <ConfirmDialog
        visible={confirmDialog.visible}
        title="Eliminar Venta"
        message={`¿Estás seguro de que deseas eliminar "${confirmDialog.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDialog({ visible: false, id: null, nombre: '' })}
        confirmText="Sí, eliminar"
        danger={true}
      />

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">Registro de ventas a clientes</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal('create')}>
          <PlusOutlined /> Nueva Venta
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nro</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((venta) => (
                <tr key={venta.id}>
                  <td>{venta.numero_comprobante || `#${venta.id}`}</td>
                  <td>{venta.cliente_nombre || 'Cliente General'}</td>
                  <td>{new Date(venta.creado_en).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${
                      venta.estado === 'CONFIRMADA' ? 'badge-success' :
                      venta.estado === 'CANCELADA' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {venta.estado}
                    </span>
                  </td>
                  <td>S/. {Number(venta.total || 0).toFixed(2)}</td>
                  <td style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {venta.estado === 'BORRADOR' && (
                      <button className="btn btn-success" onClick={() => handleConfirmar(venta.id)} title="Confirmar venta">
                        <CheckOutlined />
                      </button>
                    )}
                    {venta.estado === 'BORRADOR' && (
                      <button className="btn btn-danger" onClick={() => handleCancelar(venta.id)} title="Cancelar venta" style={{ background: '#ff7a00' }}>
                        <CloseOutlined />
                      </button>
                    )}
                    <button className="btn btn-secondary" onClick={() => openModal('edit', venta)} title="Editar">
                      <EditOutlined />
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteClick(venta)} title="Eliminar">
                      <DeleteOutlined />
                    </button>
                  </td>
                </tr>
              ))}
              {ventas.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No hay ventas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalVisible && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'create' ? 'Nueva Venta' : 'Editar Venta'}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Cliente</label>
                    <select
                      name="cliente"
                      className="form-input"
                      value={formData.cliente}
                      onChange={(e) => {
                        const cliente = clientes.find(c => c.id === parseInt(e.target.value));
                        setFormData(prev => ({
                          ...prev,
                          cliente: e.target.value,
                          cliente_nombre: cliente ? cliente.nombre : ''
                        }));
                      }}
                    >
                      <option value="">Cliente General</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo Comprobante</label>
                    <select name="tipo_comprobante" className="form-input" value={formData.tipo_comprobante} onChange={handleChange}>
                      <option value="">Ninguno</option>
                      <option value="BOLETA">Boleta</option>
                      <option value="FACTURA">Factura</option>
                      <option value="TICKET">Ticket</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Nro Comprobante</label>
                    <input type="text" name="numero_comprobante" className="form-input" value={formData.numero_comprobante} onChange={handleChange} onFocus={(e) => e.target.select()} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select name="estado" className="form-input" value={formData.estado} onChange={handleChange}>
                      <option value="BORRADOR">Borrador</option>
                      <option value="CONFIRMADA">Confirmada</option>
                      <option value="CANCELADA">Cancelada</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Productos {errors.detalle && <span style={{ color: '#ff4d4f', fontWeight: 400, marginLeft: 8 }}>{errors.detalle}</span>}
                  </label>

                  {/* Header labels for rows */}
                  {formData.detalle.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', padding: '0 2px', fontWeight: 600, fontSize: '12px', color: '#666' }}>
                      <div style={{ flex: 2, minWidth: 0 }}>Producto</div>
                      <div style={{ width: '90px' }}>Cantidad</div>
                      <div style={{ width: '110px' }}>Precio Unitario</div>
                      <div style={{ width: '100px' }}>Descuento</div>
                      <div style={{ width: '36px' }}></div>
                    </div>
                  )}

                  {formData.detalle.map((item, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                          className={`form-input${errors[`detalle_${index}`] ? ' input-error' : ''}`}
                          value={item.producto}
                          onChange={(e) => updateDetalle(index, 'producto', e.target.value)}
                          style={{ flex: 2, minWidth: 0 }}
                        >
                          <option value="">— Seleccionar producto —</option>
                          {productos.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} (Stock: {p.stock_actual})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          className={`form-input${errors[`cantidad_${index}`] ? ' input-error' : ''}`}
                          placeholder="Cant."
                          value={item.cantidad}
                          onChange={(e) => updateDetalle(index, 'cantidad', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          style={{ width: '90px' }}
                          min="0.01"
                          step="0.01"
                        />
                        <input
                          type="number"
                          className={`form-input${errors[`precio_${index}`] ? ' input-error' : ''}`}
                          placeholder="Precio"
                          value={item.precio_venta}
                          onChange={(e) => updateDetalle(index, 'precio_venta', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          style={{ width: '110px' }}
                          min="0"
                          step="0.01"
                        />
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Desc."
                          value={item.descuento}
                          onChange={(e) => updateDetalle(index, 'descuento', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          style={{ width: '100px' }}
                          min="0"
                          step="0.01"
                        />
                        <button type="button" className="btn btn-danger" onClick={() => removeDetalle(index)} style={{ flexShrink: 0 }}>
                          <DeleteOutlined />
                        </button>
                      </div>
                      {(errors[`detalle_${index}`] || errors[`cantidad_${index}`] || errors[`precio_${index}`]) && (
                        <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                          {errors[`detalle_${index}`] || errors[`cantidad_${index}`] || errors[`precio_${index}`]}
                        </div>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary" onClick={addProducto} style={{ marginTop: '4px' }}>
                    <PlusOutlined /> Agregar Producto
                  </button>
                </div>

                <div className="grid grid-3">
                  <div className="form-group">
                    <label className="form-label">Descuento Global (S/.)</label>
                    <input type="number" name="descuento" className="form-input" value={formData.descuento} onChange={handleChange} onFocus={(e) => e.target.select()} min="0" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Impuesto (S/.)</label>
                    <input type="number" name="impuesto" className="form-input" value={formData.impuesto} onChange={handleChange} onFocus={(e) => e.target.select()} min="0" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Estimado</label>
                    <input type="text" className="form-input" value={`S/. ${calcularTotal().toFixed(2)}`} readOnly style={{ fontWeight: 'bold', background: '#f5f5f5' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <textarea name="notas" className="form-input" value={formData.notas} onChange={handleChange} rows={2} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'create' ? 'Crear Venta' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ventas;
