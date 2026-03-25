import { useState, useEffect } from 'react';

const ClienteFormModal = ({ visible, mode, initialData, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    tipo_cliente: 'PERSONA_NATURAL',
    tipo_documento: 'DNI',
    numero_documento: '',
    contacto: '',
    email: '',
    telefono: '',
    direccion: '',
    activo: true,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible && initialData) {
      setFormData({
        nombre: initialData.nombre || '',
        tipo_cliente: initialData.tipo_cliente || 'PERSONA_NATURAL',
        tipo_documento: initialData.tipo_documento || 'DNI',
        numero_documento: initialData.numero_documento || '',
        contacto: initialData.contacto || '',
        email: initialData.email || '',
        telefono: initialData.telefono || '',
        direccion: initialData.direccion || '',
        activo: initialData.activo !== undefined ? initialData.activo : true,
      });
    } else if (visible) {
      setFormData({
        nombre: '',
        tipo_cliente: 'PERSONA_NATURAL',
        tipo_documento: 'DNI',
        numero_documento: '',
        contacto: '',
        email: '',
        telefono: '',
        direccion: '',
        activo: true,
      });
    }
    setErrors({});
  }, [visible, initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;

    if (name === 'tipo_cliente') {
      const nextTipoDoc = newValue === 'EMPRESA' ? 'RUC' : 'DNI';
      setFormData(prev => ({
        ...prev,
        [name]: newValue,
        tipo_documento: nextTipoDoc
      }));
      return;
    }

    if (name === 'numero_documento') {
      const onlyNums = newValue.replace(/\D/g, '');
      const tipo = formData.tipo_documento;
      if (tipo === 'DNI' && onlyNums.length > 8) return;
      if (tipo === 'RUC' && onlyNums.length > 11) return;
      newValue = onlyNums;
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.numero_documento.trim()) newErrors.numero_documento = 'El número de documento es obligatorio';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave(formData);
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {mode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input 
                type="text" 
                name="nombre" 
                className={`form-input${errors.nombre ? ' input-error' : ''}`} 
                value={formData.nombre} 
                onChange={handleChange} 
                autoFocus
              />
              {errors.nombre && <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.nombre}</div>}
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Tipo de Cliente *</label>
                <select
                  name="tipo_cliente"
                  className="form-input"
                  value={formData.tipo_cliente}
                  onChange={handleChange}
                >
                  <option value="PERSONA_NATURAL">Persona Natural</option>
                  <option value="EMPRESA">Empresa</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Documento *</label>
                <select
                  name="tipo_documento"
                  className="form-input"
                  value={formData.tipo_documento}
                  onChange={handleChange}
                >
                  {formData.tipo_cliente === 'EMPRESA' ? (
                    <option value="RUC">RUC</option>
                  ) : (
                    <>
                      <option value="DNI">DNI</option>
                      <option value="RUC">RUC</option>
                      <option value="CE">Carnet de Extranjería</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Número de Documento *</label>
              <input 
                type="text" 
                name="numero_documento" 
                className={`form-input${errors.numero_documento ? ' input-error' : ''}`} 
                value={formData.numero_documento} 
                onChange={handleChange} 
              />
              {errors.numero_documento && <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.numero_documento}</div>}
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Contacto</label>
                <input
                  type="text"
                  name="contacto"
                  className="form-input"
                  value={formData.contacto}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input
                  type="text"
                  name="telefono"
                  className="form-input"
                  value={formData.telefono}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Dirección</label>
              <textarea
                name="direccion"
                className="form-input"
                value={formData.direccion}
                onChange={handleChange}
                rows={2}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ userSelect: 'none', color: 'inherit', fontSize: '14px', fontWeight: '500' }}>
                  Cliente Activo
                </span>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === 'create' ? 'Crear' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClienteFormModal;
