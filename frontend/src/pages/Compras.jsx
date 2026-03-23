import { useState, useEffect } from 'react';
import { comprasAPI, proveedoresAPI, productosAPI } from '../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';
import ProductFormModal from '../components/ProductFormModal';
import ProveedorFormModal from '../components/ProveedorFormModal';
import SearchableSelect from '../components/SearchableSelect';

function Compras() {
  const [loading, setLoading] = useState(true);
  const [compras, setCompras] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCompra, setSelectedCompra] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [errors, setErrors] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ 
    visible: false, 
    id: null, 
    nombre: '', 
    type: 'delete', 
    title: '', 
    message: '',
    confirmText: '',
    danger: false
  });
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
    if (type === 'proveedor') {
      setProveedorModalVisible(true);
    }
  };

  const [proveedorModalVisible, setProveedorModalVisible] = useState(false);
  const [pendingSelection, setPendingSelection] = useState(null);

  useEffect(() => {
    if (pendingSelection && pendingSelection.type === 'proveedor') {
      const found = proveedores.find(p => String(p.id) === String(pendingSelection.id));
      if (found) {
        setFormData(prev => ({ 
          ...prev, 
          proveedor: String(found.id), 
          proveedor_nombre: found.nombre 
        }));
        setPendingSelection(null);
      }
    } else if (pendingSelection && pendingSelection.type === 'producto') {
      const found = productos.find(p => String(p.id) === String(pendingSelection.id));
      if (found) {
        if (nestedModalIndex !== null) {
          setFormData(prev => {
            const newDetalle = [...prev.detalle];
            newDetalle[nestedModalIndex] = {
              ...newDetalle[nestedModalIndex],
              producto: String(found.id),
              precio_compra: Number(found.precio_compra || 0)
            };
            return { ...prev, detalle: newDetalle };
          });
          setNestedModalIndex(null);
        }
        setPendingSelection(null);
      }
    }
  }, [proveedores, productos, pendingSelection, nestedModalIndex]);

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
            descuento: Number(d.descuento || 0),
          })),
        });
      } catch {
        setFormData({
          proveedor: compra.proveedor || '',
          proveedor_nombre: compra.proveedor_nombre || '',
          tipo_compra: compra.tipo_compra || 'PROVEEDOR',
          numero_comprobante: compra.numero_comprobante || '',
          tipo_comprobante: compra.tipo_comprobante || '',
          estado: compra.estado || 'BORRADOR',
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
        estado: 'BORRADOR',
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
      detalle: [...prev.detalle, { producto: '', cantidad: 1, precio_compra: 0, descuento: 0 }]
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
    
    // Check if provider is active
    const selectedProv = proveedores.find(p => p.id === parseInt(formData.proveedor));
    if (selectedProv && !selectedProv.activo) {
      alert('No se puede realizar una compra a un proveedor inactivo. Por favor, activa el proveedor o selecciona otro.');
      return;
    }
    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'detalle') {
          submitData.append(key, JSON.stringify(formData.detalle.map(d => ({
            producto: parseInt(d.producto),
            cantidad: Number(d.cantidad || 0),
            precio_compra: Number(d.precio_compra || 0),
            descuento: Number(d.descuento || 0),
          }))));
        } else if (key === 'proveedor') {
            if (formData[key]) {
                submitData.append(key, parseInt(formData[key]));
            }
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
    setConfirmDialog({ 
      visible: true, 
      id: compra.id, 
      nombre: compra.numero_comprobante || `#${compra.id}`,
      type: 'delete',
      title: 'Eliminar Compra',
      message: `¿Estás seguro de que deseas eliminar "${compra.numero_comprobante || `#${compra.id}`}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      danger: true
    });
  };

  const handleConfirmarClick = (compra) => {
    setConfirmDialog({
      visible: true,
      id: compra.id,
      nombre: compra.numero_comprobante || `#${compra.id}`,
      type: 'confirmar',
      title: 'Confirmar Compra',
      message: `¿Deseas confirmar la compra "${compra.numero_comprobante || `#${compra.id}`}"? Esto registrará el ingreso de los productos al stock actual.`,
      confirmText: 'Sí, confirmar',
      danger: false
    });
  };

  const handleCancelarClick = (compra) => {
    setConfirmDialog({
      visible: true,
      id: compra.id,
      nombre: compra.numero_comprobante || `#${compra.id}`,
      type: 'cancelar',
      title: 'Cancelar Compra',
      message: `¿Estás seguro de que deseas cancelar la compra "${compra.numero_comprobante || `#${compra.id}`}"? Si ya fue confirmada, se revertirá el incremento de stock.`,
      confirmText: 'Sí, cancelar',
      danger: true
    });
  };

  const handleGeneralConfirm = async () => {
    const { id, type } = confirmDialog;
    try {
      if (type === 'delete') {
        await comprasAPI.delete(id);
      } else if (type === 'confirmar') {
        await comprasAPI.confirmar(id);
      } else if (type === 'cancelar') {
        await comprasAPI.cancelar(id);
      }
      fetchCompras();
      setConfirmDialog({ ...confirmDialog, visible: false });
    } catch (error) {
      console.error(`Error in ${type} operation:`, error);
      alert(`Error al procesar la solicitud: ${type}`);
    }
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
      const desc = Number(d.descuento || 0);
      const base = (cant * prec) - desc;
      return sum + Math.max(0, base);
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
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleGeneralConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, visible: false })}
        confirmText={confirmDialog.confirmText}
        danger={confirmDialog.danger}
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
                <th style={{ width: '60px' }}>ID</th>
                <th>Comprobante</th>
                <th>Proveedor</th>
                <th>Productos</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Total</th>
                <th style={{ width: '100px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompras.map((compra) => (
                <tr key={compra.id}>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>#{compra.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{compra.numero_comprobante || 'S/N'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      {compra.tipo_comprobante || 'Sin tipo'}
                    </div>
                  </td>
                  <td>
                    <div>{compra.proveedor_nombre || 'Sin proveedor'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{compra.tipo_compra}</div>
                  </td>
                  <td style={{ maxWidth: '250px' }}>
                    <div style={{ 
                      fontSize: '13px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap'
                    }} title={compra.productos_resumen}>
                      {compra.productos_resumen || 'Sin productos'}
                    </div>
                  </td>
                  <td>{new Date(compra.creado_en).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${
                      compra.estado === 'CONFIRMADA' ? 'badge-success' :
                      compra.estado === 'CANCELADA' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {compra.estado}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>S/. {Number(compra.total || 0).toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-secondary" onClick={() => openModal('edit', compra)} title="Editar">
                        <EditOutlined />
                      </button>
                      {compra.estado === 'BORRADOR' && (
                        <button className="btn btn-success" onClick={() => handleConfirmarClick(compra)} title="Confirmar">
                          <CheckOutlined />
                        </button>
                      )}
                      {(compra.estado === 'BORRADOR' || compra.estado === 'CONFIRMADA') && (
                        <button className="btn btn-warning" onClick={() => handleCancelarClick(compra)} title="Cancelar">
                          <CloseOutlined />
                        </button>
                      )}
                      <button className="btn btn-danger" onClick={() => handleDeleteClick(compra)} title="Eliminar">
                        <DeleteOutlined />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCompras.length === 0 && (
                <tr><td colSpan="8" style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No hay compras registradas que coincidan con los filtros</td></tr>
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
                    <div style={{ position: 'relative' }}>
                      <SearchableSelect
                        options={proveedores.map(p => ({
                          id: String(p.id),
                          nombre: p.nombre,
                          subtitle: `${p.identificador} ${!p.activo ? '(INACTIVO)' : ''}`,
                          disabled: !p.activo
                        }))}
                        value={formData.proveedor}
                        onChange={(val) => {
                          const prov = proveedores.find(p => String(p.id) === String(val));
                          setFormData(prev => ({
                            ...prev,
                            proveedor: val,
                            proveedor_nombre: prov ? prov.nombre : ''
                          }));
                        }}
                        placeholder="Buscar proveedor..."
                        onActionClick={() => openNestedModal('proveedor')}
                        actionLabel="➕ Crear Nuevo Proveedor"
                        error={errors.proveedor}
                      />
                      {formData.proveedor && !proveedores.find(p => String(p.id) === String(formData.proveedor))?.activo && (
                        <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>
                          ⚠️ Este proveedor no está activo y no se puede usar para nuevas compras.
                        </div>
                      )}
                    </div>
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

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select name="estado" className="form-input" value={formData.estado} onChange={handleChange}>
                      <option value="BORRADOR">Borrador</option>
                      <option value="CONFIRMADA">Confirmada (Registra Stock)</option>
                      <option value="CANCELADA">Cancelada (Revierte Stock si aplica)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Productos {errors.detalle && <span style={{ color: '#ff4d4f', fontWeight: 400, marginLeft: 8 }}>{errors.detalle}</span>}
                  </label>

                  {formData.detalle.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontWeight: 600, fontSize: '11px', color: '#666', paddingRight: '44px' }}>
                      <div style={{ flex: '1.5', minWidth: 0 }}>Producto</div>
                      <div style={{ width: '70px' }}>Cant.</div>
                      <div style={{ width: '90px' }}>P. Compra</div>
                      <div style={{ width: '90px' }}>Descuento</div>
                      <div style={{ width: '90px' }}>Subtotal</div>
                    </div>
                  )}

                  {formData.detalle.map((item, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{ flex: '1.5', minWidth: 0 }}>
                          <SearchableSelect
                            options={productos.map(p => ({
                              id: String(p.id),
                              nombre: p.nombre,
                              subtitle: p.codigo,
                              disabled: !p.activo
                            }))}
                            value={item.producto}
                            onChange={(val) => updateDetalle(index, 'producto', val)}
                            placeholder="Buscar producto..."
                            onActionClick={() => {
                              setNestedModalIndex(index);
                              setProductModalVisible(true);
                            }}
                            actionLabel="➕ Nuevo Producto"
                            error={errors[`detalle_${index}`]}
                          />
                        </div>
                        <input
                          type="number"
                          className={`form-input${errors[`cantidad_${index}`] ? ' input-error' : ''}`}
                          placeholder="Cant."
                          value={item.cantidad}
                          onChange={(e) => updateDetalle(index, 'cantidad', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          style={{ width: '70px', fontSize: '13px' }}
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
                          style={{ width: '90px', fontSize: '13px' }}
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
                          style={{ width: '90px', fontSize: '13px' }}
                          min="0"
                          step="0.01"
                        />
                        <input
                          type="text"
                          className="form-input"
                          readOnly
                          value={`S/. ${((Number(item.cantidad || 0) * Number(item.precio_compra || 0)) - Number(item.descuento || 0)).toFixed(2)}`}
                          style={{ 
                            width: '90px', 
                            fontSize: '12px', 
                            background: 'var(--bg-input)', 
                            color: 'var(--text-primary)', 
                            fontWeight: 'bold',
                            border: '1px solid var(--border-input)'
                          }} 
                        />
                        <button type="button" className="btn btn-danger" onClick={() => removeDetalle(index)} style={{ flexShrink: 0, padding: '4px 8px' }}>
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
                    <input 
                      type="text" 
                      className="form-input" 
                      value={`S/. ${calcularTotal().toFixed(2)}`} 
                      readOnly 
                      style={{ 
                        fontWeight: 'bold', 
                        background: 'var(--bg-input)',
                        color: 'var(--accent, #1677ff)',
                        border: '2px solid var(--accent, #1677ff)'
                      }} 
                    />
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
      <ProveedorFormModal
        visible={proveedorModalVisible}
        mode="create"
        onClose={() => setProveedorModalVisible(false)}
        onSave={(newProv) => {
          setPendingSelection({ type: 'proveedor', id: newProv.id, nombre: newProv.nombre });
          setProveedores(prev => {
            if (prev.find(p => p.id === newProv.id)) return prev;
            return [...prev, newProv];
          });
          fetchProveedores();
          setProveedorModalVisible(false);
        }}
      />

      <ProductFormModal
        visible={productModalVisible}
        mode="create"
        onClose={() => setProductModalVisible(false)}
        onSave={(newProduct) => {
          setPendingSelection({ type: 'producto', id: newProduct.id });
          setProductos(prev => {
            if (prev.find(p => p.id === newProduct.id)) return prev;
            return [...prev, newProduct];
          });
          fetchProductos();
          setProductModalVisible(false);
        }}
      />
    </div>
  );
}

export default Compras;
