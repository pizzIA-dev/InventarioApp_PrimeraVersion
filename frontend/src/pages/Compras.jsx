import { useState, useEffect } from 'react';
import { comprasAPI, proveedoresAPI, productosAPI } from '../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';

function Compras() {
  const [loading, setLoading] = useState(true);
  const [compras, setCompras] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCompra, setSelectedCompra] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [errors, setErrors] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  const [formData, setFormData] = useState({
    proveedor: '',
    proveedor_nombre: '',
    tipo_compra: 'PROVEEDOR',
    numero_comprobante: '',
    tipo_comprobante: '',
    estado: 'CONFIRMADA',
    impuesto: 0,
    notas: '',
    detalle: [],
  });

  const [nestedModal, setNestedModal] = useState(null);
  const [nestedFormData, setNestedFormData] = useState({});
  const [nestedModalIndex, setNestedModalIndex] = useState(null);

  const openNestedModal = (type) => {
    setNestedModal(type);
    if (type === 'proveedor') {
      setNestedFormData({ nombre: '', tipo_documento: 'RUC', numero_documento: '', email: '', telefono: '', direccion: '' });
    } else if (type === 'producto') {
      setNestedFormData({ nombre: '', codigo: '', precio_compra: 0, precio_venta: 0, stock_actual: 0 });
    }
  };

  const handleNestedSubmit = async (e) => {
    e.preventDefault();
    try {
      if (nestedModal === 'proveedor') {
        const res = await proveedoresAPI.create(nestedFormData);
        await fetchProveedores();
        setFormData(prev => ({ ...prev, proveedor: res.data.id, proveedor_nombre: res.data.nombre }));
      } else if (nestedModal === 'producto') {
        const res = await productosAPI.create(nestedFormData);
        await fetchProductos();
        if (nestedModalIndex !== null) {
           updateDetalle(nestedModalIndex, 'producto', res.data.id);
        }
      }
      setNestedModal(null);
      setNestedModalIndex(null);
    } catch (err) {
      alert('Error creando registro: ' + (err.response?.data?.message || typeof err.response?.data === 'string' ? err.response.data : JSON.stringify(err.response?.data) || err.message));
    }
  };

  useEffect(() => {
    fetchCompras();
    fetchProveedores();
    fetchProductos();
  }, []);

  const fetchCompras = async () => {
    try {
      const response = await comprasAPI.getAll();
      setCompras(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching compras:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProveedores = async () => {
    try {
      const response = await proveedoresAPI.getAll();
      setProveedores(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching proveedores:', error);
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

  const openModal = async (mode, compra = null) => {
    setModalMode(mode);
    setErrors({});
    if (compra) {
      setSelectedCompra(compra);
      try {
        const res = await comprasAPI.getById(compra.id);
        const full = res.data;
        setFormData({
          proveedor: full.proveedor || '',
          proveedor_nombre: full.proveedor_nombre || '',
          tipo_compra: full.tipo_compra || 'PROVEEDOR',
          numero_comprobante: full.numero_comprobante || '',
          tipo_comprobante: full.tipo_comprobante || '',
          estado: full.estado || 'BORRADOR',
          impuesto: Number(full.impuesto || 0),
          notas: full.notas || '',
          detalle: (full.detalle || []).map(d => ({
            producto: d.producto,
            cantidad: Number(d.cantidad || 1),
            precio_compra: Number(d.precio_compra || 0),
          })),
        });
      } catch {
        setFormData({
          proveedor: compra.proveedor || '',
          proveedor_nombre: compra.proveedor_nombre || '',
          tipo_compra: compra.tipo_compra || 'PROVEEDOR',
          numero_comprobante: compra.numero_comprobante || '',
          tipo_comprobante: compra.tipo_comprobante || '',
          estado: compra.estado || 'CONFIRMADA',
          impuesto: Number(compra.impuesto || 0),
          notas: compra.notas || '',
          detalle: [],
        });
      }
    } else {
      setSelectedCompra(null);
      setFormData({
        proveedor: '',
        proveedor_nombre: '',
        tipo_compra: 'PROVEEDOR',
        numero_comprobante: '',
        tipo_comprobante: '',
        estado: 'CONFIRMADA',
        impuesto: 0,
        notas: '',
        detalle: [],
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedCompra(null);
    setErrors({});
  };

  const addProducto = () => {
    setFormData(prev => ({
      ...prev,
      detalle: [...prev.detalle, { producto: '', cantidad: 1, precio_compra: 0 }]
    }));
  };

  const updateDetalle = (index, field, value) => {
    const newDetalle = [...formData.detalle];
    newDetalle[index] = { ...newDetalle[index], [field]: value };
    if (field === 'producto') {
      const prod = productos.find(p => p.id === parseInt(value));
      if (prod) {
        newDetalle[index].precio_compra = Number(prod.precio_compra || 0);
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
      newErrors.detalle = 'Debes agregar al menos un producto a la compra.';
    } else {
      formData.detalle.forEach((item, i) => {
        if (!item.producto) newErrors[`detalle_${i}`] = 'Selecciona un producto';
        if (Number(item.cantidad) <= 0) newErrors[`cantidad_${i}`] = 'La cantidad debe ser mayor a 0';
        if (Number(item.precio_compra) <= 0) newErrors[`precio_${i}`] = 'El precio debe ser mayor a 0';
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'detalle') {
          submitData.append(key, JSON.stringify(formData.detalle.map(d => ({
            producto: parseInt(d.producto),
            cantidad: Number(d.cantidad || 0),
            precio_compra: Number(d.precio_compra || 0),
          }))));
        } else if (key === 'comprobante_archivo') {
          if (formData[key] instanceof File) {
            submitData.append(key, formData[key]);
          }
        } else if (key === 'impuesto') {
            submitData.append(key, Number(formData.impuesto || 0));
        } else {
            if (formData[key] !== null && formData[key] !== '') {
                submitData.append(key, formData[key]);
            }
        }
      });

      if (modalMode === 'create') {
        await comprasAPI.create(submitData);
      } else {
        await comprasAPI.update(selectedCompra.id, submitData);
      }
      closeModal();
      fetchCompras();
    } catch (error) {
      console.error('Error saving compra:', error);
      const errData = error.response?.data;
      const msg = typeof errData === 'string' ? errData
        : errData?.detail || errData?.message || JSON.stringify(errData) || 'Error al guardar';
      alert(msg);
    }
  };

  const handleDeleteClick = (compra) => {
    setConfirmDialog({ visible: true, id: compra.id, nombre: compra.numero_comprobante || `Compra #${compra.id}` });
  };

  const handleDeleteConfirm = async () => {
    try {
      await comprasAPI.delete(confirmDialog.id);
      setConfirmDialog({ visible: false, id: null, nombre: '' });
      fetchCompras();
    } catch (error) {
      console.error('Error deleting compra:', error);
      alert('Error al eliminar la compra.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ['impuesto'];
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? (parseFloat(value) || 0) : value
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const calcularTotal = () => {
    const subtotal = formData.detalle.reduce((sum, d) => {
      const cant = Number(d.cantidad || 0);
      const prec = Number(d.precio_compra || 0);
      return sum + (cant * prec);
    }, 0);
    return Number(subtotal) + Number(formData.impuesto || 0);
  };

  const handleExportar = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await comprasAPI.exportar(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `compras_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar compras:', error);
      alert('Error al exportar datos.');
    }
  };

  const filteredCompras = compras.filter(c => {
    const term = searchTerm.toLowerCase();
    const searchMatch = (c.proveedor_nombre || 'Sin proveedor').toLowerCase().includes(term) || 
                        (c.numero_comprobante || `#${c.id}`).toLowerCase().includes(term);
    const estadoMatch = filterEstado === 'ALL' ? true : c.estado === filterEstado;
    return searchMatch && estadoMatch;
  });

  return (
    <div>
      <ConfirmDialog
        visible={confirmDialog.visible}
        title="Eliminar Compra"
        message={`¿Estás seguro de que deseas eliminar "${confirmDialog.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDialog({ visible: false, id: null, nombre: '' })}
        confirmText="Sí, eliminar"
        danger={true}
      />

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-subtitle">Registro de compras a proveedores</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ExportDropdown onExport={handleExportar} />
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            <PlusOutlined /> Nueva Compra
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por proveedor o comprobante..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ width: '200px' }}>
            <select 
              className="form-input" 
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="CONFIRMADA">Confirmada</option>
              <option value="BORRADOR">Borrador</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nro</th>
                <th>Proveedor</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompras.map((compra) => (
                <tr key={compra.id}>
                  <td>{compra.numero_comprobante || `#${compra.id}`}</td>
                  <td>{compra.proveedor_nombre || 'Sin proveedor'}</td>
                  <td>{compra.tipo_compra}</td>
                  <td>{new Date(compra.creado_en).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${
                      compra.estado === 'CONFIRMADA' ? 'badge-success' :
                      compra.estado === 'CANCELADA' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {compra.estado}
                    </span>
                  </td>
                  <td>S/. {Number(compra.total || 0).toFixed(2)}</td>
                  <td style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-secondary" onClick={() => openModal('edit', compra)} title="Editar">
                      <EditOutlined />
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteClick(compra)} title="Eliminar">
                      <DeleteOutlined />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCompras.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No hay compras registradas que coincidan con los filtros</td></tr>
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
                {modalMode === 'create' ? 'Nueva Compra' : 'Editar Compra'}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Proveedor</label>
                    <select
                      name="proveedor"
                      className="form-input"
                      value={formData.proveedor}
                      onChange={(e) => {
                        if (e.target.value === 'NEW') {
                           openNestedModal('proveedor');
                        } else {
                           const prov = proveedores.find(p => p.id === parseInt(e.target.value));
                           setFormData(prev => ({
                             ...prev,
                             proveedor: e.target.value,
                             proveedor_nombre: prov ? prov.nombre : ''
                           }));
                        }
                      }}
                    >
                      <option value="">Sin proveedor</option>
                      <option value="NEW" style={{ fontWeight: 'bold', color: '#1677ff' }}>➕ Crear Nuevo Proveedor</option>
                      {proveedores.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Compra</label>
                    <select name="tipo_compra" className="form-input" value={formData.tipo_compra} onChange={handleChange}>
                      <option value="PROVEEDOR">Compra a Proveedor</option>
                      <option value="MINORISTA">Compra al por menor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Nro Comprobante</label>
                    <input type="text" name="numero_comprobante" className="form-input" value={formData.numero_comprobante} onChange={handleChange} onFocus={(e) => e.target.select()} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo Comprobante</label>
                    <select name="tipo_comprobante" className="form-input" value={formData.tipo_comprobante} onChange={handleChange}>
                      <option value="">Ninguno</option>
                      <option value="FACTURA">Factura</option>
                      <option value="BOLETA">Boleta</option>
                      <option value="TICKET">Ticket</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Productos {errors.detalle && <span style={{ color: '#ff4d4f', fontWeight: 400, marginLeft: 8 }}>{errors.detalle}</span>}
                  </label>

                  {formData.detalle.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontWeight: 600, fontSize: '12px', color: '#666' }}>
                      <div style={{ flex: 2, minWidth: 0 }}>Producto</div>
                      <div style={{ width: '90px' }}>Cantidad</div>
                      <div style={{ width: '110px' }}>Precio Compra</div>
                      <div style={{ width: '36px' }}></div>
                    </div>
                  )}

                  {formData.detalle.map((item, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                          className={`form-input${errors[`detalle_${index}`] ? ' input-error' : ''}`}
                          value={item.producto}
                          onChange={(e) => {
                            if (e.target.value === 'NEW') {
                              setNestedModalIndex(index);
                              openNestedModal('producto');
                            } else {
                              updateDetalle(index, 'producto', e.target.value);
                            }
                          }}
                          style={{ flex: 2, minWidth: 0 }}
                        >
                          <option value="">— Seleccionar producto —</option>
                          <option value="NEW" style={{ fontWeight: 'bold', color: '#1677ff' }}>➕ Crear Nuevo Producto</option>
                          {productos.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
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
                          value={item.precio_compra}
                          onChange={(e) => updateDetalle(index, 'precio_compra', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          style={{ width: '110px' }}
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

                <div className="grid grid-2">
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
                
                <div className="form-group">
                  <label className="form-label">Comprobante de Pago (Archivo)</label>
                  <input type="file" name="comprobante_archivo" className="form-input" accept="image/*,.pdf" onChange={(e) => {
                    if (e.target.files.length > 0) {
                      setFormData(prev => ({ ...prev, comprobante_archivo: e.target.files[0] }));
                    }
                  }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'create' ? 'Crear Compra' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Nested Create Forms */}
      {nestedModal && (
        <div className="modal-overlay" onClick={() => setNestedModal(null)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                Crear Nuevo {nestedModal === 'proveedor' ? 'Proveedor' : 'Producto'}
              </h3>
              <button className="modal-close" onClick={() => setNestedModal(null)}>×</button>
            </div>
            <form onSubmit={handleNestedSubmit} style={{ padding: '20px' }}>
              {nestedModal === 'proveedor' && (
                <>
                  <div className="form-group"><label className="form-label">Nombre *</label><input required className="form-input" value={nestedFormData.nombre} onChange={(e) => setNestedFormData(p => ({...p, nombre: e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={nestedFormData.email} onChange={(e) => setNestedFormData(p => ({...p, email: e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={nestedFormData.telefono} onChange={(e) => setNestedFormData(p => ({...p, telefono: e.target.value}))} /></div>
                </>
              )}
              {nestedModal === 'producto' && (
                <>
                  <div className="form-group"><label className="form-label">Nombre del Producto *</label><input required className="form-input" value={nestedFormData.nombre} onChange={(e) => setNestedFormData(p => ({...p, nombre: e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Código</label><input required className="form-input" value={nestedFormData.codigo} onChange={(e) => setNestedFormData(p => ({...p, codigo: e.target.value}))} /></div>
                  <div className="grid grid-2">
                     <div className="form-group"><label className="form-label">Precio Compra</label><input type="number" step="0.01" required className="form-input" value={nestedFormData.precio_compra} onChange={(e) => setNestedFormData(p => ({...p, precio_compra: Number(e.target.value)}))} /></div>
                     <div className="form-group"><label className="form-label">Precio Venta</label><input type="number" step="0.01" required className="form-input" value={nestedFormData.precio_venta} onChange={(e) => setNestedFormData(p => ({...p, precio_venta: Number(e.target.value)}))} /></div>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setNestedModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar {nestedModal === 'proveedor' ? 'Proveedor' : 'Producto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Compras;
