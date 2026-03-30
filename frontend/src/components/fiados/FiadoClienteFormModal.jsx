import { useState, useEffect } from 'react';

function FiadoClienteFormModal({ visible, mode, initialData, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nombre: '',
    documento: '',
    telefono: '',
    direccion: '',
    notas: '',
    activo: true
  });

  useEffect(() => {
    if (visible && initialData) {
      setFormData(initialData);
    } else if (visible) {
      setFormData({
        nombre: '',
        documento: '',
        telefono: '',
        direccion: '',
        notas: '',
        activo: true
      });
    }
  }, [visible, initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      alert('El nombre del cliente fiado es obligatorio');
      return;
    }
    // Prevent overriding with hardcoded enterprise since there might be only one in small business, API handles it
    onSave(formData);
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{mode === 'create' ? 'Nuevo Cliente Fiado' : 'Editar Cliente Fiado'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nombre Completo *</label>
              <input 
                type="text" 
                name="nombre" 
                className="form-input" 
                value={formData.nombre} 
                onChange={handleChange}
                placeholder="Ej: Juan Perez"
                required
              />
            </div>
            
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Documento (DNI/RUC)</label>
                <input 
                  type="text" 
                  name="documento" 
                  className="form-input" 
                  value={formData.documento || ''} 
                  onChange={handleChange}
                  placeholder="Identificación"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Teléfono / Celular</label>
                <input 
                  type="text" 
                  name="telefono" 
                  className="form-input" 
                  value={formData.telefono || ''} 
                  onChange={handleChange}
                  placeholder="Teléfono fijo o móvil"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Dirección</label>
              <textarea 
                name="direccion" 
                className="form-input" 
                value={formData.direccion || ''} 
                onChange={handleChange}
                placeholder="Dirección del cliente"
                rows={1}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notas Adicionales</label>
              <textarea 
                name="notas" 
                className="form-input" 
                value={formData.notas || ''} 
                onChange={handleChange}
                rows={2}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  name="activo" 
                  id="clienteFiadoActivo"
                  checked={formData.activo} 
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ userSelect: 'none', color: 'inherit', fontSize: '14px', fontWeight: '500' }}>Cliente Activo</span>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{mode === 'create' ? 'Guardar' : 'Actualizar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FiadoClienteFormModal;
