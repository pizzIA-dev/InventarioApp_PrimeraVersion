import React, { useState, useEffect } from 'react';
import { PlusOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import SearchableSelect from '../SearchableSelect';

const CompraFormModal = ({
  visible,
  mode,
  initialData,
  onClose,
  onSave,
  proveedores,
  productos,
  onNewProveedor,
  onNewProduct,
  errors,
  setErrors
}) => {
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
    comprobante_archivo: null
  });

  const [proveedorAlias, setProveedorAlias] = useState('');

  useEffect(() => {
    if (visible) {
      if (initialData) {
        // Prepare alias
        const provNombre = initialData.proveedor_nombre || '';
        const isGeneralWithAlias = provNombre.startsWith('Proveedor General - ');
        setProveedorAlias(isGeneralWithAlias ? provNombre.slice('Proveedor General - '.length) : '');
        
        setFormData({
            ...initialData,
            proveedor_nombre: isGeneralWithAlias ? 'Proveedor General' : provNombre,
            detalle: (initialData.detalle || []).map(d => ({
              producto: d.producto,
              cantidad: Number(d.cantidad || 1),
              precio_compra: Number(d.precio_compra || 0),
              descuento: Number(d.descuento || 0),
            }))
        });
      } else {
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
            comprobante_archivo: null
        });
        setProveedorAlias('');
      }
    }
  }, [visible, initialData]);

  if (!visible) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDetalleChange = (index, field, value) => {
    const newDetalle = [...formData.detalle];
    newDetalle[index] = { ...newDetalle[index], [field]: value };
    
    // Auto-update price if product changed
    if (field === 'producto') {
      const prod = productos.find(p => p.id === parseInt(value));
      if (prod) {
        newDetalle[index].precio_compra = Number(prod.precio_compra || 0);
      }
    }
    setFormData(prev => ({ ...prev, detalle: newDetalle }));
  };

  const addProducto = () => {
    setFormData(prev => ({
      ...prev,
      detalle: [...prev.detalle, { producto: '', cantidad: 1, precio_compra: 0, descuento: 0 }]
    }));
  };

  const removeDetalle = (index) => {
    setFormData(prev => ({
      ...prev,
      detalle: prev.detalle.filter((_, i) => i !== index)
    }));
  };

  const calcularSubtotalFila = (item) => {
    const cant = Number(item.cantidad || 0);
    const prec = Number(item.precio_compra || 0);
    const desc = Number(item.descuento || 0);
    const total = (cant * prec) - desc;
    return Math.max(0, total);
  };

  const calcularTotal = () => {
    const subtotal = formData.detalle.reduce((sum, item) => sum + calcularSubtotalFila(item), 0);
    return subtotal + Number(formData.impuesto || 0);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const finalData = { ...formData };
    if (finalData.proveedor_nombre === 'Proveedor General' && proveedorAlias.trim()) {
      finalData.proveedor_nombre = `Proveedor General - ${proveedorAlias.trim()}`;
    }
    onSave(finalData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            {mode === 'create' ? ' Registrar Nueva Compra' : ' Editar Compra'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleFormSubmit}>
          <div className="modal-body">
            {/* Header info */}
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Proveedor *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <SearchableSelect 
                    options={proveedores.map(p => ({ 
                      id: String(p.id), 
                      nombre: p.nombre,
                      activo: p.activo 
                    }))}
                    value={formData.proveedor}
                    onChange={(val, name) => setFormData(prev => ({ ...prev, proveedor: val, proveedor_nombre: name }))}
                    placeholder="Seleccionar proveedor"
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-icon" 
                    onClick={onNewProveedor}
                    title="Nuevo Proveedor"
                  >
                    <PlusOutlined />
                  </button>
                </div>
                {formData.proveedor_nombre === 'Proveedor General' && (
                  <div style={{ marginTop: '8px' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ingrese nombre/alias del proveedor..." 
                      value={proveedorAlias}
                      onChange={(e) => setProveedorAlias(e.target.value)}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Identifique a proveedores individuales dentro de la categoría general.
                    </div>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Compra</label>
                <select 
                  name="tipo_compra" 
                  className="form-input" 
                  value={formData.tipo_compra} 
                  onChange={handleChange}
                >
                  <option value="PROVEEDOR">Proveedor Directo</option>
                  <option value="LOCAL">Local / Mercado</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-3">
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select name="estado" className="form-input" value={formData.estado} onChange={handleChange}>
                  <option value="BORRADOR">Borrador</option>
                  <option value="CONFIRMADA">Confirmada</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo Comprobante</label>
                <input 
                  type="text" 
                  name="tipo_comprobante" 
                  className="form-input" 
                  value={formData.tipo_comprobante} 
                  onChange={handleChange} 
                  placeholder="Ej: Factura, Boleta..." 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nro Comprobante</label>
                <input 
                  type="text" 
                  name="numero_comprobante" 
                  className="form-input" 
                  value={formData.numero_comprobante} 
                  onChange={handleChange} 
                  placeholder="001-000456..." 
                />
              </div>
            </div>

            {/* Detail Section */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0 }}>Detalle de Productos</h4>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={onNewProduct}>
                    <PlusOutlined /> Crear Producto
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={addProducto}>
                    <PlusOutlined /> Añadir Fila
                  </button>
                </div>
              </div>

              {errors.detalle && <div style={{ color: '#ff4d4f', fontSize: '13px', marginBottom: '10px' }}>{errors.detalle}</div>}

              <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)' }}>
                <table>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th>Producto *</th>
                      <th style={{ width: '100px' }}>Cant. *</th>
                      <th style={{ width: '120px' }}>P. Compra *</th>
                      <th style={{ width: '100px' }}>Desc.</th>
                      <th style={{ width: '110px' }}>Subtotal</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.detalle.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <SearchableSelect 
                            options={productos.filter(p => p.activo).map(p => ({ id: String(p.id), nombre: p.nombre }))}
                            value={String(item.producto)}
                            onChange={(val) => handleDetalleChange(index, 'producto', val)}
                            placeholder="Buscar producto..."
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={item.cantidad} 
                            onChange={(e) => handleDetalleChange(index, 'cantidad', e.target.value)} 
                            min="1" 
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={item.precio_compra} 
                            onChange={(e) => handleDetalleChange(index, 'precio_compra', e.target.value)} 
                            step="0.01" 
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={item.descuento} 
                            onChange={(e) => handleDetalleChange(index, 'descuento', e.target.value)} 
                            step="0.01" 
                          />
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          S/. {calcularSubtotalFila(item).toFixed(2)}
                        </td>
                        <td>
                          <button 
                            type="button" 
                            className="btn btn-danger btn-sm btn-icon" 
                            onClick={() => removeDetalle(index)} 
                            title="Eliminar Fila"
                          >
                            <DeleteOutlined />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {formData.detalle.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                          Haga clic en "Añadir Fila" para empezar a agregar productos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-2" style={{ marginTop: '24px' }}>
              <div className="form-group">
                <label className="form-label">Notas / Observaciones</label>
                <textarea 
                  name="notas" 
                  className="form-input" 
                  rows={3} 
                  value={formData.notas} 
                  onChange={handleChange} 
                  placeholder="Detalles adicionales sobre la compra..."
                />
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Subtotal:</span>
                  <span style={{ fontWeight: 600 }}>
                    S/. {formData.detalle.reduce((sum, d) => sum + calcularSubtotalFila(d), 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                  <span>Otros Cargos / Impuesto:</span>
                  <input 
                    type="number" 
                    name="impuesto" 
                    className="form-input" 
                    style={{ width: '100px', height: '32px' }} 
                    value={formData.impuesto} 
                    onChange={handleChange} 
                    step="0.01" 
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '18px' }}>
                  <span style={{ fontWeight: 700 }}>TOTAL COMPRA:</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                    S/. {calcularTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Archivo de Comprobante (Opcional)</label>
              <input 
                type="file" 
                className="form-input" 
                onChange={(e) => setFormData(prev => ({ ...prev, comprobante_archivo: e.target.files[0] }))}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-warning" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-success">
              {mode === 'create' ? 'Registrar Compra' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompraFormModal;
