import { useState, useEffect } from 'react';
import { ventasAPI } from '../../services/api';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import SearchableSelect from '../SearchableSelect';

function VentaFormModal({ 
  visible, 
  onClose, 
  onSave, 
  initialData, 
  clientes, 
  productos,
  onOpenClienteModal,
  onOpenProductModal
}) {
  const [formData, setFormData] = useState({
    cliente: '',
    cliente_nombre: '',
    tipo_comprobante: 'SIMPLE',
    numero_comprobante: '',
    numero_comprobante_simple: '',
    estado: 'BORRADOR',
    detalle: [],
    descuento: 0,
    impuesto: 0,
    notas: ''
  });

  const [errors, setErrors] = useState({});
  const [clienteAlias, setClienteAlias] = useState('');
  const [calcularIgv, setCalcularIgv] = useState(false);
  const [loadingNumber, setLoadingNumber] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        // Mode Edit or from Fiado
        console.log("Initializing VentaFormModal with initialData:", initialData);
        
        // Handle details from both possible formats (Venta model or Fiado items)
        let detalles = [];
        if (initialData.detalleventa_set) {
          detalles = initialData.detalleventa_set.map(d => ({
            producto: String(d.producto),
            cantidad: Number(d.cantidad),
            precio_venta: Number(d.precio_venta),
            descuento: Number(d.descuento || 0),
            subtotal: (Number(d.cantidad) * Number(d.precio_venta)) - Number(d.descuento || 0)
          }));
        } else if (initialData.detalles) {
          detalles = initialData.detalles.map(d => ({
            producto: String(d.producto),
            cantidad: Number(d.cantidad),
            precio_venta: Number(d.precio_venta || d.precio_unitario || 0),
            descuento: Number(d.descuento || 0),
            subtotal: (Number(d.cantidad) * Number(d.precio_venta || d.precio_unitario || 0)) - Number(d.descuento || 0)
          }));
        } else if (initialData.detalle) {
          detalles = initialData.detalle.map(d => ({
            producto: String(d.producto),
            cantidad: Number(d.cantidad),
            precio_venta: Number(d.precio_venta || 0),
            descuento: Number(d.descuento || 0),
            subtotal: (Number(d.cantidad) * Number(d.precio_venta || 0)) - Number(d.descuento || 0)
          }));
        }

        setFormData({
          cliente: initialData.cliente ? String(initialData.cliente) : '',
          cliente_nombre: initialData.cliente_nombre || '',
          tipo_comprobante: initialData.tipo_comprobante || 'SIMPLE',
          numero_comprobante: initialData.numero_comprobante || '',
          numero_comprobante_simple: initialData.numero_comprobante_simple || '',
          estado: initialData.estado || 'BORRADOR',
          detalle: detalles,
          descuento: Number(initialData.descuento || 0),
          impuesto: Number(initialData.impuesto || 0),
          notas: initialData.notas || ''
        });
        setClienteAlias(initialData.cliente_alias || '');
        
        // If it's a new sale from Fiado (no ID yet), we fetch the number
        if (!initialData.id || (!initialData.numero_comprobante && !initialData.numero_comprobante_simple)) {
          fetchNextNumber(initialData.tipo_comprobante || 'SIMPLE');
        }
      } else {
        // Mode Create New
        setFormData({
          cliente: '',
          cliente_nombre: '',
          tipo_comprobante: 'SIMPLE',
          numero_comprobante: '',
          numero_comprobante_simple: '',
          estado: 'BORRADOR',
          detalle: [],
          descuento: 0,
          impuesto: 0,
          notas: ''
        });
        setClienteAlias('');
        fetchNextNumber('SIMPLE');
      }
    }
  }, [visible, initialData]);

  const fetchNextNumber = async (tipo) => {
    setLoadingNumber(true);
    try {
      const res = await ventasAPI.getNextNumber(tipo);
      const nextNum = res.data.proximo_numero;
      setFormData(prev => ({
        ...prev,
        tipo_comprobante: tipo,
        numero_comprobante: tipo === 'SIMPLE' ? '' : nextNum,
        numero_comprobante_simple: tipo === 'SIMPLE' ? nextNum : prev.numero_comprobante_simple
      }));
    } catch (err) {
      console.error("Error fetching next number:", err);
    } finally {
      setLoadingNumber(false);
    }
  };

  const calculateTotals = () => {
    const subtotalBruto = formData.detalle.reduce((sum, d) => {
      return sum + (Number(d.cantidad || 0) * Number(d.precio_venta || 0) - Number(d.descuento || 0));
    }, 0);
    
    let currentImpuesto = formData.impuesto;
    if (calcularIgv) {
       currentImpuesto = Number(((subtotalBruto - formData.descuento) * 0.18).toFixed(2));
    }

    const total = subtotalBruto - Number(formData.descuento || 0) + Number(currentImpuesto || 0);
    return { subtotal: subtotalBruto, impuesto: currentImpuesto, total };
  };

  const { subtotal, impuesto, total } = calculateTotals();

  const handleTypeChange = (val) => {
    fetchNextNumber(val);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addDetalle = () => {
    setFormData(prev => ({
      ...prev,
      detalle: [...prev.detalle, { producto: '', cantidad: 1, precio_venta: 0, descuento: 0, subtotal: 0 }]
    }));
  };

  const removeDetalle = (index) => {
    const newDetalle = [...formData.detalle];
    newDetalle.splice(index, 1);
    setFormData(prev => ({ ...prev, detalle: newDetalle }));
  };

  const updateDetalle = (index, field, value) => {
    const newDetalle = [...formData.detalle];
    const item = { ...newDetalle[index], [field]: value };
    
    if (field === 'producto') {
      const prod = productos.find(p => String(p.id) === String(value));
      if (prod) {
        item.precio_venta = Number(prod.precio_venta || 0);
      }
    }
    
    item.subtotal = (Number(item.cantidad || 0) * Number(item.precio_venta || 0)) - Number(item.descuento || 0);
    newDetalle[index] = item;
    setFormData(prev => ({ ...prev, detalle: newDetalle }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.cliente) newErrors.cliente = 'El cliente es obligatorio';
    if (formData.detalle.length === 0) newErrors.detalle = 'Debe agregar productos';
    
    formData.detalle.forEach((d, i) => {
      if (!d.producto) newErrors[`detalle_${i}`] = 'Seleccione producto';
      if (d.cantidad <= 0) newErrors[`cantidad_${i}`] = 'Err';
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      ...formData,
      impuesto: impuesto,
      cliente_alias: clienteAlias,
      total: total
    });
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            Nueva Venta
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            <div className="grid grid-2">
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Cliente</label>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '2px 8px', fontSize: '11px', height: 'auto' }}
                    onClick={() => {
                      const pg = clientes.find(c => c.numero_documento === '00000000');
                      if (pg) {
                        setFormData(prev => ({ 
                          ...prev, 
                          cliente: String(pg.id), 
                          cliente_nombre: pg.nombre
                        }));
                        if (errors.cliente) setErrors(prev => ({ ...prev, cliente: null }));
                      } else {
                        alert('Cliente Cliente General no encontrado.');
                      }
                    }}
                  >
                    👤 Cliente General
                  </button>
                </div>
                <SearchableSelect
                  options={clientes.map(c => ({
                    id: String(c.id),
                    nombre: c.nombre,
                    subtitle: c.numero_documento
                  }))}
                  value={formData.cliente}
                  onChange={(val) => {
                    const cliente = clientes.find(c => String(c.id) === String(val));
                    setFormData(prev => ({
                      ...prev,
                      cliente: val,
                      cliente_nombre: cliente ? cliente.nombre : ''
                    }));
                    if (errors.cliente) setErrors(prev => ({ ...prev, cliente: null }));
                  }}
                  placeholder="Buscar cliente..."
                  onActionClick={onOpenClienteModal}
                  actionLabel="➕ Crear Nuevo Cliente"
                  error={errors.cliente}
                />
                {formData.cliente_nombre === 'Cliente General' && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Alias <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Nombre y Apellidos — opcional)</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: Juan Pérez o Tienda Martínez"
                      value={clienteAlias}
                      onChange={(e) => setClienteAlias(e.target.value)}
                      style={{ borderColor: 'var(--accent, #1677ff)', transition: 'border-color 0.2s' }}
                    />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Tipo Comprobante</label>
                <select name="tipo_comprobante" className="form-input" value={formData.tipo_comprobante} onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    tipo_comprobante: val,
                    numero_comprobante: val === 'SIMPLE' ? prev.numero_comprobante_simple : ''
                  }));
                  handleTypeChange(val);
                  if (errors.tipo_comprobante) setErrors(prev => ({ ...prev, tipo_comprobante: null }));
                }}>
                  <option value="SIMPLE">Comprobante Simple</option>
                  <option value="BOLETA">Boleta</option>
                  <option value="FACTURA">Factura</option>
                </select>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Nro Comprobante</label>
                <input type="text" name="numero_comprobante" className="form-input" value={formData.tipo_comprobante === 'SIMPLE' ? formData.numero_comprobante_simple : formData.numero_comprobante} readOnly style={{ background: 'var(--bg-input)', opacity: 0.8 }} />
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

              {formData.detalle.length > 0 && (
                 <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', padding: '0 2px', fontWeight: 600, fontSize: '12px', color: '#666' }}>
                  <div style={{ flex: 2, minWidth: 0 }}>Producto</div>
                  <div style={{ width: '90px' }}>Cantidad</div>
                  <div style={{ width: '110px' }}>P. Unitario</div>
                  <div style={{ width: '100px' }}>Descuento</div>
                  <div style={{ width: '90px' }}>Subtotal</div>
                  <div style={{ width: '36px' }}></div>
                </div>
              )}

              {formData.detalle.map((item, index) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 2, minWidth: 0 }}>
                      <SearchableSelect
                        options={productos.map(p => ({
                          id: String(p.id),
                          nombre: p.nombre,
                          subtitle: `Stock: ${p.stock_actual}`,
                          disabled: !p.activo
                        }))}
                        value={item.producto}
                        onChange={(val) => updateDetalle(index, 'producto', val)}
                        placeholder="Buscar producto..."
                        onActionClick={onOpenProductModal}
                        actionLabel="➕ Crear Nuevo Producto"
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
                    <input
                      type="text"
                      className="form-input"
                      readOnly
                      value={`S/. ${((Number(item.cantidad || 0) * Number(item.precio_venta || 0)) - Number(item.descuento || 0)).toFixed(2)}`}
                      style={{ 
                        width: '90px', 
                        fontSize: '12px', 
                        background: 'var(--bg-input)', 
                        color: 'var(--text-primary)', 
                        fontWeight: 'bold',
                        border: '1px solid var(--border-input)'
                      }} 
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
              <button type="button" className="btn btn-secondary" onClick={addDetalle} style={{ marginTop: '4px' }}>
                <PlusOutlined /> Agregar Producto
              </button>
            </div>

            <div className="grid grid-3">
              <div className="form-group">
                <label className="form-label">Descuento Global (S/.)</label>
                <input type="number" name="descuento" className="form-input" value={formData.descuento} onChange={handleChange} onFocus={(e) => e.target.select()} min="0" step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Impuestos (IGV 18%)</label>
                <input
                  type="number"
                  name="impuesto"
                  className="form-input"
                  value={formData.impuesto}
                  readOnly={calcularIgv}
                  onChange={calcularIgv ? undefined : (e) => setFormData(prev => ({ ...prev, impuesto: parseFloat(e.target.value) || 0 }))}
                  onFocus={(e) => !calcularIgv && e.target.select()}
                  style={calcularIgv ? { background: 'var(--bg-input)', opacity: 0.7 } : {}}
                  min="0"
                  step="0.01"
                />
                <div style={{ marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={calcularIgv}
                      onChange={(e) => setCalcularIgv(e.target.checked)}
                      style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: 'var(--accent, #1677ff)' }}
                    />
                    Agregar Cálculo de IGV
                  </label>
                  {!calcularIgv && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      IGV incluido en los precios ingresados
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Total Estimado</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={`S/. ${total.toFixed(2)}`} 
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
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              Registrar Venta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VentaFormModal;
