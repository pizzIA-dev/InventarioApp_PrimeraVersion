import { useState, useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { serviciosAPI } from '../services/api';

/**
 * Modal rapido para crear un Servicio nuevo desde ComprasServicios.
 * Props:
 *   visible  - boolean
 *   onClose  - () => void
 *   onSave   - (servicio) => void   recibe el servicio creado
 */
export default function ServicioFormModal({ visible, onClose, onSave }) {
  const EMPTY = { nombre: '', precio: '', descripcion: '' };
  const [form, setForm]     = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setForm(EMPTY); setErrors({}); }
  }, [visible]);

  if (!visible) return null;

  const validate = () => {
    const e = {};
    if (!form.nombre.trim())          e.nombre = 'El nombre es obligatorio';
    if (!form.precio || Number(form.precio) <= 0) e.precio = 'Ingresa un precio valido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await serviciosAPI.create({
        nombre:      form.nombre.trim(),
        precio:      Number(form.precio),
        descripcion: form.descripcion.trim() || '',
        activo:      true,
      });
      onSave(res.data);
      onClose();
    } catch (e) {
      const msg = e.response?.data?.nombre?.[0]
               || e.response?.data?.detail
               || 'Error al crear el servicio';
      setErrors({ general: msg });
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Nuevo Servicio</h3>
          <button className="modal-close" onClick={onClose}><CloseOutlined /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors.general && (
              <div style={{ color: 'var(--color-danger)', fontSize: '13px', background: '#fff1f0',
                padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffccc7', marginBottom: '16px' }}>
                {errors.general}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input
                type="text" className={`form-input${errors.nombre ? ' input-error' : ''}`}
                placeholder="Ej: Servicio de Delivery, Mantenimiento..."
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                onFocus={e => e.target.select()}
                autoFocus
              />
              {errors.nombre && <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '4px' }}>{errors.nombre}</div>}
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Precio (S/.) *</label>
                <input
                  type="number" step="0.01" min="0" className={`form-input${errors.precio ? ' input-error' : ''}`}
                  placeholder="0.00"
                  value={form.precio}
                  onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                  onFocus={e => e.target.select()}
                />
                {errors.precio && <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '4px' }}>{errors.precio}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Descripcion <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(opcional)</span></label>
              <textarea
                className="form-input" rows={2} style={{ resize: 'vertical' }}
                placeholder="Descripcion breve del servicio..."
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creando...' : 'Crear Servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}