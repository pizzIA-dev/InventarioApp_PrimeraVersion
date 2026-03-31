import React, { useState, useEffect } from 'react';
import { PlusOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons';
import SearchableSelect from '../SearchableSelect';

const MovimientoFormModal = ({ 
  visible, 
  mode, 
  onClose, 
  onSave, 
  categorias, 
  initialData, 
  activeTab,
  onManageCategories
}) => {
  const [formData, setFormData] = useState({
    categoria: '',
    tipo: activeTab,
    descripcion: '',
    monto: 0,
    metodo_pago: 'EFECTIVO',
    referencia: '',
    fecha: new Date().toISOString().slice(0, 16),
    notas: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        fecha: new Date(initialData.fecha).toISOString().slice(0, 16)
      });
    } else {
      setFormData({
        categoria: '',
        tipo: activeTab,
        descripcion: '',
        monto: 0,
        metodo_pago: 'EFECTIVO',
        referencia: '',
        fecha: new Date().toISOString().slice(0, 16),
        notas: '',
      });
    }
  }, [initialData, activeTab, visible]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!visible) return null;

  const isIngreso = formData.tipo === 'INGRESO';
  const accentColor = isIngreso ? '#52c41a' : '#ff4d4f';
  const bgColor = isIngreso ? '#f6ffed' : '#fff1f0';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header" style={{ borderBottom: `2px solid ${accentColor}` }}>
          <h3 className="modal-title" style={{ color: accentColor }}>
            {mode === 'create' 
              ? (isIngreso ? 'Registrar Nuevo Ingreso' : 'Registrar Nuevo Gasto') 
              : (isIngreso ? 'Editar Ingreso' : 'Editar Gasto')}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ background: bgColor + '44' }}>
            <div className="form-group">
              <label className="form-label">Tipo de Movimiento</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  className={`btn ${isIngreso ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFormData({...formData, tipo: 'INGRESO'})}
                  style={{ flex: 1, backgroundColor: isIngreso ? '#52c41a' : '', borderColor: isIngreso ? '#52c41a' : '' }}
                >
                  INGRESO
                </button>
                <button 
                  type="button" 
                  className={`btn ${!isIngreso ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFormData({...formData, tipo: 'EGRESO'})}
                  style={{ flex: 1, backgroundColor: !isIngreso ? '#ff4d4f' : '', borderColor: !isIngreso ? '#ff4d4f' : '' }}
                >
                  GASTO
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Categoría / Nombre del Movimiento *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <SearchableSelect 
                  options={categorias.filter(c => c.tipo === formData.tipo && c.activo).map(c => ({
                    id: String(c.id),
                    nombre: c.nombre,
                    subtitle: c.descripcion
                  }))}
                  value={String(formData.categoria)}
                  onChange={(val) => setFormData({...formData, categoria: val})}
                  placeholder="Seleccionar categoría..."
                  style={{ flex: 1 }}
                />
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={onManageCategories}
                  title="Gestionar Categorías"
                >
                    <SettingOutlined />
                </button>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Monto (S/.) *</label>
                <input 
                  type="number" 
                  name="monto" 
                  step="0.01" 
                  required 
                  className="form-input" 
                  value={formData.monto} 
                  onChange={handleChange} 
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha y Hora</label>
                <input 
                  type="datetime-local" 
                  name="fecha" 
                  required 
                  className="form-input" 
                  value={formData.fecha} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Método de Pago</label>
                <select name="metodo_pago" className="form-input" value={formData.metodo_pago} onChange={handleChange}>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="YAPE/PLIN">Yape / Plin</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nro Referencia (Opcional)</label>
                <input type="text" name="referencia" className="form-input" value={formData.referencia} onChange={handleChange} placeholder="Ej: Operación 1234" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Descripción Breve</label>
              <input type="text" name="descripcion" className="form-input" value={formData.descripcion} onChange={handleChange} placeholder="Ej: Pago de luz, Venta de chatarra, etc." />
            </div>

            <div className="form-group">
              <label className="form-label">Notas Adicionales</label>
              <textarea name="notas" className="form-input" value={formData.notas} onChange={handleChange} rows={2} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ backgroundColor: accentColor, borderColor: accentColor }}>
              {mode === 'create' ? <PlusOutlined /> : <EditOutlined />}
              {mode === 'create' ? 'Registrar Movimiento' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MovimientoFormModal;
