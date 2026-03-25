import React, { useState, useEffect } from 'react';
import { proveedoresAPI } from '../services/api';

const ProveedorFormModal = ({ visible, mode = 'create', initialData = null, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    tipo_proveedor: 'PERSONA_NATURAL',
    tipo_documento: 'DNI',
    identificador: '',
    contacto: '',
    email: '',
    telefono: '',
    direccion: '',
    categoria: 'MAYORISTA',
    tiene_contrato: false,
    detalles_contrato: '',
    dias_credito: 0,
    limite_credito: 0,
    activo: true,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && initialData) {
        setFormData({
          nombre: initialData.nombre || '',
          tipo_proveedor: initialData.tipo_proveedor || 'PERSONA_NATURAL',
          tipo_documento: initialData.tipo_documento || 'DNI',
          identificador: initialData.identificador || '',
          contacto: initialData.contacto || '',
          email: initialData.email || '',
          telefono: initialData.telefono || '',
          direccion: initialData.direccion || '',
          categoria: initialData.categoria || 'MAYORISTA',
          tiene_contrato: initialData.tiene_contrato || false,
          detalles_contrato: initialData.detalles_contrato || '',
          dias_credito: initialData.dias_credito || 0,
          limite_credito: initialData.limite_credito || 0,
          activo: initialData.activo !== undefined ? initialData.activo : true,
        });
      } else {
        setFormData({
          nombre: '',
          tipo_proveedor: 'PERSONA_NATURAL',
          tipo_documento: 'DNI',
          identificador: '',
          contacto: '',
          email: '',
          telefono: '',
          direccion: '',
          categoria: 'MAYORISTA',
          tiene_contrato: false,
          detalles_contrato: '',
          dias_credito: 0,
          limite_credito: 0,
          activo: true,
        });
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [visible, mode, initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;

    // Lógica dinámica para Tipo de Proveedor y Tipo de Documento
    if (name === 'tipo_proveedor') {
      const nextTipoDoc = newValue === 'EMPRESA' ? 'RUC' : 'DNI';
      setFormData(prev => ({
        ...prev,
        [name]: newValue,
        tipo_documento: nextTipoDoc
      }));
      if (errors.tipo_proveedor) setErrors(prev => ({ ...prev, tipo_proveedor: null }));
      if (errors.tipo_documento) setErrors(prev => ({ ...prev, tipo_documento: null }));
      return;
    }

    // Validación en tiempo real para longitud de documentos
    if (name === 'identificador') {
      const onlyNums = newValue.replace(/\D/g, '');
      const tipo = formData.tipo_documento;
      if (tipo === 'DNI' && onlyNums.length > 8) return;
      if (tipo === 'RUC' && onlyNums.length > 11) return;
      newValue = onlyNums;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.identificador.trim()) newErrors.identificador = 'El documento (RUC/DNI) es obligatorio';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      const submitData = {
        ...formData,
        limite_credito: Number(formData.limite_credito),
        dias_credito: Number(formData.dias_credito)
      };

      let savedProveedor;
      if (mode === 'create') {
        const res = await proveedoresAPI.create(submitData);
        savedProveedor = res.data;
      } else {
        const res = await proveedoresAPI.update(initialData.id, submitData);
        savedProveedor = res.data;
      }

      onSave(savedProveedor);
      onClose();
    } catch (error) {
      console.error('Error saving proveedor:', error);
      if (error.response && error.response.data) {
        const backendErrors = error.response.data;
        if (backendErrors.non_field_errors) {
          setErrors({ general: backendErrors.non_field_errors[0] });
        } else {
          setErrors(backendErrors);
        }
      } else {
        alert('Error al guardar el proveedor');
      }
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '90%' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            {mode === 'create' ? 'Nuevo Proveedor' : 'Editar Proveedor'}
          </h3>
          <button className="modal-close" onClick={onClose} disabled={isSubmitting}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors.general && (
              <div style={{ 
                backgroundColor: '#fff1f0', 
                border: '1px solid #ffa39e', 
                padding: '10px', 
                borderRadius: '4px', 
                marginBottom: '16px',
                color: '#cf1322',
                fontSize: '13px'
              }}>
                {errors.general}
              </div>
            )}
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Tipo de Proveedor *</label>
                <select
                  name="tipo_proveedor"
                  className="form-input"
                  value={formData.tipo_proveedor}
                  onChange={handleChange}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                >
                  {formData.tipo_proveedor === 'EMPRESA' ? (
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

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Nombre / Razón Social *</label>
                <input 
                  type="text" 
                  name="nombre" 
                  className={`form-input${errors.nombre ? ' input-error' : ''}`} 
                  value={formData.nombre} 
                  onChange={handleChange} 
                  onFocus={(e) => e.target.select()}
                  disabled={isSubmitting}
                />
                {errors.nombre && <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.nombre}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Número de Documento *</label>
                <input 
                  type="text" 
                  name="identificador" 
                  className={`form-input${errors.identificador ? ' input-error' : ''}`} 
                  value={formData.identificador} 
                  onChange={handleChange} 
                  onFocus={(e) => e.target.select()}
                  disabled={isSubmitting}
                />
                {errors.identificador && <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.identificador}</div>}
              </div>
            </div>
 bitumen

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Contacto</label>
                <input
                  type="text"
                  name="contacto"
                  className="form-input"
                  value={formData.contacto}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select
                  name="categoria"
                  className="form-input"
                  value={formData.categoria}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="MAYORISTA">Mayorista</option>
                  <option value="MINORISTA">Minorista</option>
                  <option value="PRODUCTOR">Productor/Fabricante</option>
                  <option value="IMPORTADOR">Importador</option>
                  <option value="DISTRIBUIDOR">Distribuidor</option>
                </select>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Dirección</label>
              <textarea
                name="direccion"
                className="form-input"
                value={formData.direccion}
                onChange={handleChange}
                rows={2}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="tiene-contrato-checkbox"
                  name="tiene_contrato"
                  checked={formData.tiene_contrato}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ userSelect: 'none', color: 'inherit', fontSize: '14px', fontWeight: '500' }}>
                  Tiene Contrato
                </span>
              </div>
            </div>

            {formData.tiene_contrato && (
              <div className="form-group">
                <label className="form-label">Detalles del Contrato</label>
                <textarea
                  name="detalles_contrato"
                  className="form-input"
                  value={formData.detalles_contrato}
                  onChange={handleChange}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Días de Crédito</label>
                <input
                  type="number"
                  name="dias_credito"
                  className="form-input"
                  value={formData.dias_credito}
                  onChange={handleChange}
                  onFocus={(e) => e.target.select()}
                  min="0"
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Límite de Crédito (S/.)</label>
                <input
                  type="number"
                  name="limite_credito"
                  className="form-input"
                  value={formData.limite_credito}
                  onChange={handleChange}
                  onFocus={(e) => e.target.select()}
                  min="0"
                  step="0.01"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="activo-proveedor-checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ userSelect: 'none', color: 'inherit', fontSize: '14px', fontWeight: '500' }}>
                  Proveedor Activo
                </span>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : (mode === 'create' ? 'Crear' : 'Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProveedorFormModal;
