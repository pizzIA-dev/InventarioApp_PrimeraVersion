import { useState, useEffect } from 'react';
import { productosAPI, serviciosAPI } from '../../services/api';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { message } from 'antd';
import SearchableSelect from '../SearchableSelect';

function FiadoOperacionFormModal({ visible, clientes, initialData, onClose, onSave, onReactivar }) {
  const isEdit = !!initialData;
  const [formData, setFormData] = useState({
    cliente: '',
    tipo: 'PRODUCTO',
    fecha_limite: '',
    notas: '',
    detalles: [],
    subtotal: 0,
    descuento: 0,
    impuesto: 0,
    total: 0,
    igv_automatico: false
  });
  const [reactivarChecked, setReactivarChecked] = useState(false);

  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setFormData({
          id: initialData.id,
          cliente: initialData.cliente,
          tipo: initialData.tipo,
          fecha_limite: initialData.fecha_limite || '',
          notas: initialData.notas || '',
          detalles: initialData.tipo === 'PRODUCTO' 
            ? (initialData.detalles_producto || []).map(d => ({
                id: d.id,
                producto: d.producto,
                nombre: d.producto_nombre,
                codigo: d.producto_codigo,
                cantidad: d.cantidad,
                precio_unitario: d.precio_unidad, // naming fix? checking model
                precio_unidad: d.precio_unidad,
                stock_actual: d.producto_stock_actual || 999 
              }))
            : (initialData.detalles_servicio || []).map(d => ({
                id: d.id,
                servicio: d.servicio,
                nombre: d.servicio_nombre,
                precio: d.precio,
                descuento: d.descuento || 0
              }))
        });
      } else {
        setFormData({
          cliente: '',
          tipo: 'PRODUCTO',
          fecha_limite: '',
          notas: '',
          detalles: [],
          subtotal: 0,
          descuento: 0,
          impuesto: 0,
          total: 0,
          igv_automatico: false
        });
      }
      setReactivarChecked(false);
    }
  }, [visible, initialData]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const resP = await productosAPI.getAll();
        setProductos(resP.data.results || resP.data);
        const resS = await serviciosAPI.getAll();
        setServicios((resS.data.results || resS.data).filter(s => s.activo));
      } catch (error) {
        console.error('Error fetching items:', error);
        message.error('Error al cargar la lista de productos y servicios');
      }
    };
    fetchItems();
  }, []);

  const addDetalle = () => {
    setFormData(prev => {
      const newItem = prev.tipo === 'PRODUCTO' 
        ? { producto: '', nombre: '', codigo: '', cantidad: 1, precio_unidad: 0, descuento: 0, stock_actual: 0 }
        : { servicio: '', nombre: '', precio: 0, descuento: 0 };
      return { ...prev, detalles: [...prev.detalles, newItem] };
    });
  };

  const removeDetalle = (index) => {
    setFormData(prev => ({
      ...prev,
      detalles: prev.detalles.filter((_, i) => i !== index)
    }));
  };

  const updateDetalle = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      detalles: prev.detalles.map((item, i) => 
        i === index ? { ...item, ...updates } : item
      )
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'tipo' && value !== formData.tipo) {
      if (formData.detalles.length > 0) {
        if (!window.confirm('Cambiar el tipo borrará los ítems seleccionados. ¿Continuar?')) {
          return;
        }
      }
      setFormData(prev => ({ ...prev, tipo: value, detalles: [] }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateTotals = () => {
    let itemsSubtotal = 0;
    
    if (formData.tipo === 'PRODUCTO') {
      itemsSubtotal = formData.detalles.reduce((sum, item) => 
        sum + (Number(item.cantidad || 0) * Number(item.precio_unidad || 0) - Number(item.descuento || 0)), 0);
    } else {
      itemsSubtotal = formData.detalles.reduce((sum, item) => 
        sum + (Number(item.precio || 0) - Number(item.descuento || 0)), 0);
    }

    const baseParaImpuesto = itemsSubtotal;
    
    let currentImpuesto = Number(formData.impuesto || 0);
    if (formData.igv_automatico) {
      currentImpuesto = baseParaImpuesto * 0.18;
    }

    const currentTotal = baseParaImpuesto + currentImpuesto;

    return {
      subtotal: itemsSubtotal,
      descuento: 0,
      impuesto: currentImpuesto,
      total: currentTotal
    };
  };

  const totals = calculateTotals();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (reactivarChecked) {
      onReactivar(initialData.id);
      return;
    }

    if (!formData.cliente) {
      message.error('Debe seleccionar un cliente fiado');
      return;
    }
    if (formData.detalles.length === 0) {
      message.error(`Debe agregar al menos un ${formData.tipo.toLowerCase()} a la operación`);
      return;
    }

    // Validate quantities and products exist
    if (formData.tipo === 'PRODUCTO') {
      for (const d of formData.detalles) {
        if (!d.producto) {
           message.error('Debe seleccionar el producto en todas las filas agregadas');
           return;
        }
        if (!d.cantidad || Number(d.cantidad) <= 0) {
          message.error('Toda cantidad debe ser mayor a 0');
          return;
        }
        if (!d.precio_unidad || Number(d.precio_unidad) < 0) {
          message.error('Todo precio debe ser válido');
          return;
        }
        if (Number(d.cantidad) > Number(d.stock_actual)) {
          message.error(`El producto ${d.nombre} no tiene stock suficiente (${d.stock_actual} disponibles).`);
          return;
        }
      }
    } else {
      for (const d of formData.detalles) {
        if (!d.servicio) {
           message.error('Debe seleccionar el servicio en todas las filas agregadas');
           return;
        }
        if (!d.precio || Number(d.precio) < 0) {
          message.error('Todo precio debe ser mayor o igual a 0');
          return;
        }
      }
    }

    const payload = { 
      ...formData,
      subtotal: totals.subtotal,
      descuento: totals.descuento,
      impuesto: totals.impuesto,
      total: totals.total
    };
    if (payload.fecha_limite === '') {
      payload.fecha_limite = null;
    }

    onSave(payload);
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? `Editar Fiado #${formData.id}` : 'Registrar Nuevo Fiado'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid grid-3">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Cliente *</label>
                <select 
                  name="cliente" 
                  className="form-input" 
                  value={formData.cliente} 
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Seleccionar Cliente --</option>
                  {clientes.filter(c => c.activo).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.documento ? `(${c.documento})` : ''}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Tipo *</label>
                <select 
                  name="tipo" 
                  className="form-input" 
                  value={formData.tipo} 
                  onChange={handleChange}
                  disabled={isEdit}
                  title={isEdit ? "No se puede cambiar el tipo una vez registrado" : ""}
                >
                  <option value="PRODUCTO">Productos</option>
                  <option value="SERVICIO">Servicios</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Fecha Límite</label>
                <input 
                  type="date" 
                  name="fecha_limite" 
                  className="form-input" 
                  value={formData.fecha_limite || ''} 
                  onChange={handleChange}
                />
              </div>
            
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea 
                  name="notas" 
                  className="form-input" 
                  value={formData.notas || ''} 
                  onChange={handleChange}
                  placeholder="Notas y detalles del fiado..."
                  rows={3}
                />
              </div>
            </div>

            {isEdit && initialData?.estado === 'CANCELADO' && (
              <div style={{ 
                background: 'rgba(40, 167, 69, 0.1)', 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid rgba(40, 167, 69, 0.3)',
                marginBottom: '16px' 
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '600', color: '#1e7e34' }}>
                  <input 
                    type="checkbox" 
                    checked={reactivarChecked} 
                    onChange={(e) => setReactivarChecked(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  Reactivar Operación (Retomar stock y deuda activa)
                </label>
                <p style={{ margin: '4px 0 0 28px', fontSize: '13px', color: '#2b542c' }}>
                  Al marcar esta casilla, esta operación volverá a estar pendiente de cobro y se descontará el stock nuevamente.
                </p>
              </div>
            )}

            <hr style={{ margin: '16px 0', borderColor: 'var(--border-color)' }} />
            
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                {formData.tipo === 'PRODUCTO' ? 'Productos' : 'Servicios'}
              </label>

              {/* Header labels for rows */}
              {formData.detalles.length > 0 && (
                 <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', padding: '0 2px', fontWeight: 600, fontSize: '12px', color: '#666' }}>
                  <div style={{ flex: 2, minWidth: 0 }}>{formData.tipo === 'PRODUCTO' ? 'Producto' : 'Servicio'}</div>
                  {formData.tipo === 'PRODUCTO' && <div style={{ width: '80px' }}>Cantidad</div>}
                  <div style={{ width: '110px' }}>{formData.tipo === 'PRODUCTO' ? 'P. Unitario' : 'Precio'}</div>
                  <div style={{ width: '90px' }}>Descuento</div>
                  <div style={{ width: '100px' }}>Subtotal</div>
                  <div style={{ width: '40px' }}></div>
                </div>
              )}

              {formData.detalles.map((item, index) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 2, minWidth: 0 }}>
                      {formData.tipo === 'PRODUCTO' ? (
                        <SearchableSelect
                          options={productos.map(p => ({
                            id: String(p.id),
                            nombre: p.nombre,
                            subtitle: `Stock: ${p.stock_actual}`,
                            disabled: !p.activo
                          }))}
                          value={item.producto}
                          onChange={(val) => {
                            const prod = productos.find(p => String(p.id) === String(val));
                            if (prod) {
                              updateDetalle(index, {
                                producto: val,
                                nombre: prod.nombre,
                                codigo: prod.codigo,
                                precio_unidad: prod.precio_venta,
                                stock_actual: prod.stock_actual
                              });
                            }
                          }}
                          placeholder="Buscar producto..."
                        />
                      ) : (
                        <SearchableSelect
                          options={servicios.map(s => ({
                            id: String(s.id),
                            nombre: s.nombre,
                            subtitle: `S/. ${Number(s.precio_base || 0).toFixed(2)}`
                          }))}
                          value={item.servicio}
                          onChange={(val) => {
                            const serv = servicios.find(s => String(s.id) === String(val));
                            if (serv) {
                              updateDetalle(index, {
                                servicio: val,
                                nombre: serv.nombre,
                                precio: serv.precio_base,
                                descuento: 0
                              });
                            }
                          }}
                          placeholder="Buscar servicio..."
                        />
                      )}
                    </div>
                                   {formData.tipo === 'PRODUCTO' && (
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Cant."
                        value={item.cantidad}
                        onChange={(e) => updateDetalle(index, { cantidad: e.target.value })}
                        onFocus={(e) => e.target.select()}
                        style={{ width: '80px' }}
                        min="0.01"
                        step="0.01"
                      />
                    )}
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Precio"
                      value={formData.tipo === 'PRODUCTO' ? item.precio_unidad : item.precio}
                      onChange={(e) => updateDetalle(index, formData.tipo === 'PRODUCTO' ? { precio_unidad: e.target.value } : { precio: e.target.value })}
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
                      onChange={(e) => updateDetalle(index, { descuento: e.target.value })}
                      onFocus={(e) => e.target.select()}
                      style={{ width: '90px' }}
                      min="0"
                      step="0.01"
                    />
                    <input
                      type="text"
                      className="form-input"
                      readOnly
                      value={`S/. ${(formData.tipo === 'PRODUCTO' 
                        ? (Number(item.cantidad || 0) * Number(item.precio_unidad || 0) - Number(item.descuento || 0))
                        : (Number(item.precio || 0) - Number(item.descuento || 0))).toFixed(2)}`}
                      style={{ width: '100px', fontSize: '12px', background: 'var(--bg-input)', fontWeight: 'bold' }} 
                    />
                    <button type="button" className="btn btn-danger" onClick={() => removeDetalle(index)} style={{ flexShrink: 0, padding: '0 10px' }}>
                      <DeleteOutlined />
                    </button>
                  </div>
                </div>
              ))}
              
              <button type="button" className="btn btn-secondary" onClick={addDetalle} style={{ marginTop: '4px' }}>
                <PlusOutlined /> Agregar {formData.tipo === 'PRODUCTO' ? 'Producto' : 'Servicio'}
              </button>
            </div>

            <div className="grid grid-2" style={{ marginTop: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', alignItems: 'end' }}>
              <div className="form-group">
                <label className="form-label">Impuestos (IGV 18%)</label>
                <input 
                  type="number" 
                  name="impuesto" 
                  className="form-input" 
                  value={totals.impuesto.toFixed(2)} 
                  onChange={handleChange}
                  disabled={formData.igv_automatico}
                  min="0"
                  step="0.01"
                  style={{ maxWidth: '200px' }}
                />
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.igv_automatico} 
                    onChange={(e) => setFormData(prev => ({ ...prev, igv_automatico: e.target.checked }))}
                  /> 
                  Agregar Cálculo de IGV
                </label>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  {formData.igv_automatico ? 'IGV calculado sobre subtotal' : 'IGV incluido en los precios ingresados'}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total Estimado</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  S/ {totals.total.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button 
              type="submit" 
              className={`btn ${reactivarChecked ? 'btn-success' : 'btn-primary'}`} 
              disabled={isEdit && initialData?.estado === 'CANCELADO' && !reactivarChecked}
              style={reactivarChecked ? { background: '#28a745', borderColor: '#28a745', color: 'white' } : {}}
            >
              {reactivarChecked ? 'Confirmar y Reactivar' : (isEdit ? 'Guardar Cambios' : 'Registrar Operación')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FiadoOperacionFormModal;
